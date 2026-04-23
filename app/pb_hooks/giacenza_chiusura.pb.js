/// <reference path="../pb_data/types.d.ts" />

onRecordAfterCreateSuccess(function(e) {
    try {
        var sess    = e.record
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

        // Raggruppa per famiglia
        var gruppi = {}, famOrder = []
        for (var i=0; i<prod.length; i++) {
            var fr = null; try { fr = prod[i].expandedOne("famiglia") } catch(_) {}
            var fn = fr ? fr.getString("nome") : "— Senza famiglia"
            if (!gruppi[fn]) { gruppi[fn]=[]; famOrder.push(fn) }
            gruppi[fn].push(prod[i])
        }

        // CSV
        var csv = ["\uFEFFSezione,Articolo,Giacenza"]
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

        var html = '<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>Giacenza</title><style>' +
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
            '<h1>Giacenza Magazzino</h1>' +
            '<div class="sub">Sessione #'+numSess+': '+esc(nome)+' \u2014 '+data+'</div>' +
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
        var dest = []
        try {
            var conf = $app.findFirstRecordByFilter("configurazione","chiave='chiusura_email_destinatari'")
            var raw  = conf.get("valore")
            raw = typeof raw==="string" ? raw : (Array.isArray(raw) ? raw.join(",") : "")
            var parts = raw.split(",")
            for (var i=0; i<parts.length; i++) {
                var a = parts[i].trim()
                if (a.indexOf("@")>=0) dest.push(a)
            }
        } catch(_) {}

        if (dest.length > 0) {
            var sender = $app.settings().meta.senderAddress
            if (sender) {
                try {
                    var to = []
                    for (var i=0; i<dest.length; i++) to.push({ address: dest[i] })
                    var msg = new MailerMessage({
                        from:    { address: sender, name: $app.settings().meta.senderName || "Cassa Dalila" },
                        to:      to,
                        subject: "Giacenza magazzino \u2014 " + nome,
                        html:    html,
                        text:    csvContent,
                    })
                    $app.newMailClient().send(msg)
                } catch(_) {}
            }
        }

    } catch(_) {}

}, "sessioni_cassa")
