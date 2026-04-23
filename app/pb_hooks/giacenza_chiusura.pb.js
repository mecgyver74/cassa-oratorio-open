/// <reference path="../pb_data/types.d.ts" />

var esc = function(s) {
    return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")
}

var csvEsc = function(s) {
    return String(s||"").replace(/"/g,'""')
}

var eseguiGiacenza = function(sess) {
    var nome    = sess.getString("nome") || ("Sessione_" + sess.getInt("numero_sessione"))
    var numSess = sess.getInt("numero_sessione")

    var now     = new Date()
    var pad     = function(n) { return String(n).padStart(2, "0") }
    var dataStr = now.getFullYear() + "-" + pad(now.getMonth()+1) + "-" + pad(now.getDate()) +
                  " " + pad(now.getHours()) + ":" + pad(now.getMinutes())

    // ── 1. Magazzini comuni ────────────────────────────────────
    var magComuni = []
    try {
        magComuni = $app.findRecordsByFilter("magazzini_comuni", "1=1", "nome", 0, 0)
    } catch(err) {}

    // ── 2. Prodotti senza magazzino comune, filtrati in JS ─────
    var prodotti = []
    try {
        var tutti = $app.findRecordsByFilter("prodotti", "attivo=true", "ordine,nome", 0, 0)
        $app.expandRecords(tutti, ["famiglia"], null)
        prodotti = tutti.filter(function(p) { return !p.getString("magazzino_comune") })
    } catch(err) {}

    // Raggruppa per famiglia
    var gruppi = {}
    var ordineFamiglie = []
    for (var i = 0; i < prodotti.length; i++) {
        var p = prodotti[i]
        var famRec = null
        try { famRec = p.expandedOne("famiglia") } catch(_) {}
        var famNome = famRec ? famRec.getString("nome") : "— Senza famiglia"
        if (!gruppi[famNome]) { gruppi[famNome] = []; ordineFamiglie.push(famNome) }
        gruppi[famNome].push(p)
    }

    var qtyLabel = function(q) { return (q < 0) ? "\u221E" : String(q) }

    // ── 3. CSV con BOM per Excel ───────────────────────────────
    var csvRighe = ["\uFEFFSezione,Articolo,Giacenza"]
    for (var i = 0; i < magComuni.length; i++) {
        var m = magComuni[i]
        csvRighe.push('"Magazzino comune","' + csvEsc(m.getString("nome")) + '","' + qtyLabel(m.getInt("quantita")) + '"')
    }
    for (var f = 0; f < ordineFamiglie.length; f++) {
        var fam = ordineFamiglie[f]
        var lista = gruppi[fam]
        for (var j = 0; j < lista.length; j++) {
            var p2 = lista[j]
            csvRighe.push('"' + csvEsc(fam) + '","' + csvEsc(p2.getString("nome")) + '","' + qtyLabel(p2.getInt("quantita")) + '"')
        }
    }
    var csvContent = csvRighe.join("\r\n")

    // ── 4. HTML ────────────────────────────────────────────────
    var righeHtml = ""
    if (magComuni.length > 0) {
        righeHtml += '<tr class="sh"><td colspan="2">Magazzini comuni</td></tr>'
        for (var i = 0; i < magComuni.length; i++) {
            var m = magComuni[i]
            var qty = m.getInt("quantita")
            var cls = qty === 0 ? ' class="zero"' : (qty > 0 && qty <= 3) ? ' class="low"' : ''
            righeHtml += '<tr' + cls + '><td class="nome">' + esc(m.getString("nome")) + '</td><td class="qty">' + qtyLabel(qty) + '</td></tr>'
        }
    }
    for (var f = 0; f < ordineFamiglie.length; f++) {
        var fam = ordineFamiglie[f]
        righeHtml += '<tr class="sh"><td colspan="2">' + esc(fam) + '</td></tr>'
        var lista = gruppi[fam]
        for (var j = 0; j < lista.length; j++) {
            var p2 = lista[j]
            var qty = p2.getInt("quantita")
            var cls = qty === 0 ? ' class="zero"' : (qty > 0 && qty <= 3) ? ' class="low"' : ''
            righeHtml += '<tr' + cls + '><td class="nome">' + esc(p2.getString("nome")) + '</td><td class="qty">' + qtyLabel(qty) + '</td></tr>'
        }
    }

    var totale = 0
    for (var i = 0; i < magComuni.length; i++) { var q = magComuni[i].getInt("quantita"); if (q >= 0) totale += q }
    for (var i = 0; i < prodotti.length; i++)  { var q = prodotti[i].getInt("quantita");  if (q >= 0) totale += q }

    var html = '<!DOCTYPE html>\n<html lang="it"><head><meta charset="UTF-8">\n' +
        '<title>Giacenza \u2014 ' + esc(nome) + '</title>\n' +
        '<style>\n' +
        '  body{font-family:Arial,sans-serif;font-size:13px;color:#1e293b;max-width:680px;margin:30px auto;padding:0 20px}\n' +
        '  h1{font-size:20px;margin:0 0 4px}.sub{color:#64748b;font-size:12px;margin-bottom:24px}\n' +
        '  table{width:100%;border-collapse:collapse}\n' +
        '  td,th{padding:7px 10px;border-bottom:1px solid #e2e8f0}\n' +
        '  th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;border-bottom:2px solid #e2e8f0}\n' +
        '  tr.sh td{background:#f1f5f9;font-weight:700;font-size:12px;color:#475569;text-transform:uppercase;letter-spacing:.5px;padding:5px 10px;border-top:8px solid #fff}\n' +
        '  .nome{width:75%}.qty{width:25%;text-align:right;font-weight:700}\n' +
        '  tr.zero .qty{color:#dc2626}tr.low .qty{color:#d97706}\n' +
        '  .tot{margin-top:20px;text-align:right;font-size:14px;font-weight:700;color:#0f172a}\n' +
        '  @media print{body{margin:0}}\n' +
        '</style></head><body>\n' +
        '<h1>Giacenza Magazzino</h1>\n' +
        '<div class="sub">Sessione #' + numSess + ': ' + esc(nome) + ' \u2014 ' + dataStr + '</div>\n' +
        '<table>\n  <tr><th class="nome">Articolo</th><th class="qty">Giacenza</th></tr>\n' +
        righeHtml + '\n</table>\n' +
        '<div class="tot">Totale pezzi (escluso \u221E): ' + totale + '</div>\n' +
        '</body></html>'

    // ── 5. Salva su disco ──────────────────────────────────────
    var cartella = $app.dataDir() + "/../../chiusure"
    var nomeFile = nome.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_")
    try { $os.mkdirAll(cartella, 0o755) } catch(err) {}
    try { $os.writeFile(cartella + "/giacenza_" + nomeFile + ".csv",  csvContent, 0o644) } catch(err) {}
    try { $os.writeFile(cartella + "/giacenza_" + nomeFile + ".html", html,       0o644) } catch(err) {}

    // ── 6. Email ──────────────────────────────────────────────
    var destinatari = []
    try {
        var conf = $app.findFirstRecordByFilter("configurazione", "chiave='chiusura_email_destinatari'")
        var val  = conf.get("valore")
        var raw  = typeof val === "string" ? val : (Array.isArray(val) ? val.join(", ") : "")
        destinatari = raw.split(",").map(function(s) { return s.trim() }).filter(function(s) { return s.indexOf("@") >= 0 })
    } catch(_) {}

    if (destinatari.length === 0) return

    var senderAddr = $app.settings().meta.senderAddress
    if (!senderAddr) return

    try {
        var msg = new MailerMessage({
            from:    { address: senderAddr, name: $app.settings().meta.senderName || "Cassa Dalila" },
            to:      destinatari.map(function(a) { return { address: a } }),
            subject: "Giacenza magazzino \u2014 " + nome,
            html:    html,
            text:    csvContent,
        })
        $app.newMailClient().send(msg)
    } catch(err) {}
}

onRecordAfterCreateSuccess(function(e) {
    try {
        eseguiGiacenza(e.record)
    } catch(err) {}
}, "sessioni_cassa")
