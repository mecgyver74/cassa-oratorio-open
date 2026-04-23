/// <reference path="../pb_data/types.d.ts" />

onRecordAfterUpdateSuccess(function(e) {
    try {
        var sess    = e.record
        // Scatta solo quando chiusa_il viene valorizzata (non su altre modifiche)
        if (!sess.getString("chiusa_il")) return
        var nome    = sess.getString("nome") || ("Sessione_" + sess.getInt("numero_sessione"))
        var numSess = sess.getInt("numero_sessione")

        var now  = new Date()
        var pad  = function(n) { return String(n).padStart(2,"0") }
        var data = now.getFullYear() + "-" + pad(now.getMonth()+1) + "-" + pad(now.getDate()) +
                   " " + pad(now.getHours()) + ":" + pad(now.getMinutes())

        var esc = function(s) {
            return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")
        }
        var csvE = function(s) { return String(s||"").replace(/"/g,'""') }
        var qty  = function(q) { return q < 0 ? "\u221E" : String(q) }

        // Magazzini comuni
        var mc = []
        try { mc = $app.findRecordsByFilter("magazzini_comuni","1=1","nome",0,0) } catch(_) {}

        // Prodotti senza magazzino comune
        var prod = []
        try {
            var tutti = $app.findRecordsByFilter("prodotti","attivo=true","ordine,nome",0,0)
            $app.expandRecords(tutti, ["famiglia"], null)
            for (var i=0; i<tutti.length; i++) {
                if (!tutti[i].getString("magazzino_comune")) prod.push(tutti[i])
            }
        } catch(_) {}

        // Raggruppa per famiglia (escludi famiglie inattive)
        var gruppi = {}, famOrder = []
        for (var i=0; i<prod.length; i++) {
            var fr = null; try { fr = prod[i].expandedOne("famiglia") } catch(_) {}
            if (fr && !fr.getBool("attivo")) continue
            var fn = fr ? fr.getString("nome") : "— Senza famiglia"
            if (!gruppi[fn]) { gruppi[fn]=[]; famOrder.push(fn) }
            gruppi[fn].push(prod[i])
        }

        // Dati riepilogo sessione
        var scCount   = sess.getInt("scontrini_count")
        var totNetto  = sess.getFloat("totale_netto")
        var totCont   = sess.getFloat("totale_contanti")
        var totCarta  = sess.getFloat("totale_carta")
        var totOmaggi = sess.getFloat("totale_omaggi")
        var primoN    = sess.getInt("primo_numero")
        var ultimoN   = sess.getInt("ultimo_numero")
        var apertaIl  = sess.getString("aperta_il")
        var chiusaIl  = sess.getString("chiusa_il")
        var fmtData   = function(iso) {
            if (!iso) return ""
            try { var d=new Date(iso); return pad(d.getDate())+"/"+pad(d.getMonth()+1)+"/"+d.getFullYear()+" "+pad(d.getHours())+":"+pad(d.getMinutes()) } catch(_) { return iso }
        }
        var eur = function(v) { return "\u20AC "+v.toFixed(2).replace(".",",") }

        // Venduto per prodotto (righe_scontrino della sessione, esclusi stornati)
        var vendutoMap = {}, vendutoOrder = []
        try {
            var righe = $app.findRecordsByFilter("righe_scontrino",
                "scontrino.sessione='"+sess.id+"' && scontrino.stornato=false && stornata=false",
                "nome_snapshot", 0, 0)
            for (var i=0; i<righe.length; i++) {
                var r = righe[i]
                var k = r.getString("nome_snapshot")
                if (!vendutoMap[k]) { vendutoMap[k] = {nome:k, qta:0, omaggi:0, tot:0}; vendutoOrder.push(k) }
                if (r.getBool("omaggio")) vendutoMap[k].omaggi += r.getInt("quantita")
                else { vendutoMap[k].qta += r.getInt("quantita"); vendutoMap[k].tot += r.getFloat("totale_riga") }
            }
            vendutoOrder.sort(function(a,b){ return vendutoMap[b].tot - vendutoMap[a].tot })
        } catch(_) {}

        // CSV
        var csv = ["\uFEFFRiepilogo Cassa"]
        csv.push('"Sessione #'+numSess+'","'+csvE(nome)+'"')
        csv.push('"Aperta il","'+fmtData(apertaIl)+'"')
        csv.push('"Chiusa il","'+fmtData(chiusaIl)+'"')
        csv.push('"Scontrini emessi","'+scCount+'"')
        csv.push('"Dal numero","'+primoN+'"')
        csv.push('"Al numero","'+ultimoN+'"')
        csv.push('"Totale netto","'+eur(totNetto)+'"')
        csv.push('"Contanti","'+eur(totCont)+'"')
        csv.push('"Carta","'+eur(totCarta)+'"')
        csv.push('"Omaggi","'+eur(totOmaggi)+'"')
        csv.push("")
        csv.push("Venduto per prodotto")
        csv.push("Prodotto,Qta totale,di cui omaggi,Qta pagata,Totale")
        var totVqta=0, totVomaggi=0, totVpagata=0
        for (var i=0; i<vendutoOrder.length; i++) {
            var v = vendutoMap[vendutoOrder[i]]
            totVqta += v.qta+v.omaggi; totVomaggi += v.omaggi; totVpagata += v.qta
            csv.push('"'+csvE(v.nome)+'",'+(v.qta+v.omaggi)+','+v.omaggi+','+v.qta+',"'+eur(v.tot)+'"')
        }
        csv.push('"TOTALE",'+totVqta+','+totVomaggi+','+totVpagata+',"'+eur(totNetto)+'"')
        csv.push("")
        csv.push("Sezione,Articolo,Giacenza")
        for (var i=0; i<mc.length; i++)
            csv.push('"Magazzino comune","'+csvE(mc[i].getString("nome"))+'","'+qty(mc[i].getInt("quantita"))+'"')
        for (var f=0; f<famOrder.length; f++) {
            var g = gruppi[famOrder[f]]
            for (var j=0; j<g.length; j++)
                csv.push('"'+csvE(famOrder[f])+'","'+csvE(g[j].getString("nome"))+'","'+qty(g[j].getInt("quantita"))+'"')
        }
        var csvContent = csv.join("\r\n")

        // HTML righe
        var rows = ""
        if (mc.length > 0) {
            rows += '<tr class="sh"><td colspan="2">Magazzini comuni</td></tr>'
            for (var i=0; i<mc.length; i++) {
                var q=mc[i].getInt("quantita"), cl=q===0?' class="zero"':(q>0&&q<=3?' class="low"':'')
                rows += '<tr'+cl+'><td class="n">'+esc(mc[i].getString("nome"))+'</td><td class="q">'+qty(q)+'</td></tr>'
            }
        }
        for (var f=0; f<famOrder.length; f++) {
            rows += '<tr class="sh"><td colspan="2">'+esc(famOrder[f])+'</td></tr>'
            var g = gruppi[famOrder[f]]
            for (var j=0; j<g.length; j++) {
                var q=g[j].getInt("quantita"), cl=q===0?' class="zero"':(q>0&&q<=3?' class="low"':'')
                rows += '<tr'+cl+'><td class="n">'+esc(g[j].getString("nome"))+'</td><td class="q">'+qty(q)+'</td></tr>'
            }
        }

        var tot=0
        for (var i=0; i<mc.length; i++)   { var q=mc[i].getInt("quantita");   if(q>=0) tot+=q }
        for (var i=0; i<prod.length; i++)  { var q=prod[i].getInt("quantita"); if(q>=0) tot+=q }

        var vendutoRows = ""
        for (var i=0; i<vendutoOrder.length; i++) {
            var v = vendutoMap[vendutoOrder[i]]
            vendutoRows += '<tr><td>'+esc(v.nome)+'</td><td style="text-align:right">'+(v.qta+v.omaggi)+'</td><td style="text-align:right">'+(v.omaggi||'—')+'</td><td style="text-align:right">'+v.qta+'</td><td style="text-align:right;font-weight:700">'+eur(v.tot)+'</td></tr>'
        }
        vendutoRows += '<tr style="background:#f1f5f9;font-weight:700"><td>TOTALE</td><td style="text-align:right">'+totVqta+'</td><td style="text-align:right">'+totVomaggi+'</td><td style="text-align:right">'+totVpagata+'</td><td style="text-align:right;color:#16a34a">'+eur(totNetto)+'</td></tr>'

        var riepilogoHtml =
            '<h2 style="font-size:16px;margin:0 0 12px;color:#1e293b">Riepilogo chiusura cassa</h2>' +
            '<table style="width:100%;border-collapse:collapse;margin-bottom:32px">' +
            '<tr><td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;color:#475569">Aperta il</td><td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;font-weight:700">'+fmtData(apertaIl)+'</td></tr>' +
            '<tr><td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;color:#475569">Chiusa il</td><td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;font-weight:700">'+fmtData(chiusaIl)+'</td></tr>' +
            '<tr><td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;color:#475569">Scontrini emessi</td><td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;font-weight:700">'+scCount+' (dal n.'+primoN+' al n.'+ultimoN+')</td></tr>' +
            '<tr><td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;color:#475569">Totale netto</td><td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#16a34a">'+eur(totNetto)+'</td></tr>' +
            '<tr><td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;color:#475569">di cui contanti</td><td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;font-weight:700">'+eur(totCont)+'</td></tr>' +
            '<tr><td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;color:#475569">di cui carta</td><td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;font-weight:700">'+eur(totCarta)+'</td></tr>' +
            '<tr><td style="padding:5px 10px;color:#475569">di cui omaggi</td><td style="padding:5px 10px;font-weight:700">'+eur(totOmaggi)+'</td></tr>' +
            '</table>'

        var html = '<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>Chiusura Cassa</title><style>' +
            'body{font-family:Arial,sans-serif;font-size:13px;color:#1e293b;max-width:680px;margin:30px auto;padding:0 20px}' +
            'h1{font-size:20px;margin:0 0 4px}.sub{color:#64748b;font-size:12px;margin-bottom:24px}' +
            'table{width:100%;border-collapse:collapse}td,th{padding:7px 10px;border-bottom:1px solid #e2e8f0}' +
            'th{text-align:left;font-size:11px;text-transform:uppercase;color:#94a3b8;border-bottom:2px solid #e2e8f0}' +
            'tr.sh td{background:#f1f5f9;font-weight:700;font-size:12px;color:#475569;text-transform:uppercase;padding:5px 10px;border-top:8px solid #fff}' +
            '.n{width:75%}.q{width:25%;text-align:right;font-weight:700}' +
            'tr.zero .q{color:#dc2626}tr.low .q{color:#d97706}' +
            '.tot{margin-top:20px;text-align:right;font-size:14px;font-weight:700}' +
            '@media print{body{margin:0}}' +
            '</style></head><body>' +
            '<h1>Chiusura Cassa \u2014 Sessione #'+numSess+'</h1>' +
            '<div class="sub">'+esc(nome)+' \u2014 '+data+'</div>' +
            riepilogoHtml +
            '<h2 style="font-size:16px;margin:0 0 12px;color:#1e293b">Venduto per prodotto</h2>' +
            '<table style="margin-bottom:32px"><tr><th>Prodotto</th><th style="text-align:right">Qtà tot.</th><th style="text-align:right">Omaggi</th><th style="text-align:right">Qtà pag.</th><th style="text-align:right">Totale</th></tr>' +
            vendutoRows + '</table>' +
            '<h2 style="font-size:16px;margin:0 0 12px;color:#1e293b">Giacenza magazzino</h2>' +
            '<table><tr><th class="n">Articolo</th><th class="q">Giacenza</th></tr>' +
            rows + '</table>' +
            '<div class="tot">Totale pezzi (escluso \u221E): '+tot+'</div>' +
            '</body></html>'

        // Salva file
        var dir      = $app.dataDir() + "/../../chiusure"
        var nomeFile = nome.replace(/[\\/:*?"<>|]/g,"_").replace(/\s+/g,"_")
        try { $os.mkdirAll(dir, 0o755) } catch(_) {}
        try { $os.writeFile(dir+"/giacenza_"+nomeFile+".csv",  csvContent, 0o644) } catch(_) {}
        try { $os.writeFile(dir+"/giacenza_"+nomeFile+".html", html,       0o644) } catch(_) {}

        // Email
        var emailLog = ""
        var dest = []
        try {
            var conf = $app.findFirstRecordByFilter("configurazione","chiave='chiusura_email_destinatari'")
            var raw  = conf.get("valore")
            emailLog += "valore raw: " + JSON.stringify(raw) + "\n"
            // PocketBase restituisce i campi JSON come array di byte: convertiamo
            if (Array.isArray(raw)) {
                try { raw = JSON.parse(String.fromCharCode.apply(null, raw)) } catch(_) { raw = "" }
            }
            raw = typeof raw==="string" ? raw : (Array.isArray(raw) ? raw.join(",") : "")
            var parts = raw.split(",")
            for (var i=0; i<parts.length; i++) {
                var a = parts[i].trim()
                if (a.indexOf("@")>=0) dest.push(a)
            }
            emailLog += "destinatari: " + dest.join(", ") + "\n"
        } catch(err) { emailLog += "errore config: " + String(err) + "\n" }

        var sender = $app.settings().meta.senderAddress
        emailLog += "senderAddress: " + sender + "\n"

        if (dest.length > 0 && sender) {
            try {
                var to = []
                for (var i=0; i<dest.length; i++) to.push({ address: dest[i] })
                var msg = new MailerMessage({
                    from:    { address: sender, name: $app.settings().meta.senderName || "Cassa Dalila" },
                    to:      to,
                    subject: "Chiusura cassa \u2014 Sessione #" + numSess + ": " + nome,
                    html:    html,
                    text:    csvContent,
                })
                $app.newMailClient().send(msg)
                emailLog += "email inviata OK\n"
            } catch(err) { emailLog += "errore invio: " + String(err) + "\n" }
        } else {
            emailLog += "skip: dest=" + dest.length + " sender=" + (sender?"ok":"vuoto") + "\n"
        }
        try { $os.writeFile(dir+"/email_log.txt", emailLog, 0o644) } catch(_) {}

    } catch(_) {}

}, "sessioni_cassa")
