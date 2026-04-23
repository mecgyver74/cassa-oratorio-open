/// <reference path="../pb_data/types.d.ts" />

/**
 * Alla chiusura cassa (creazione sessioni_cassa):
 * - Genera CSV e HTML con la giacenza aggiornata
 * - Salva i file in <radice_progetto>/chiusure/
 * - Invia email agli indirizzi configurati in Setup → Notifiche
 *
 * IMPORTANTE: tutto è in try/catch globale — errori nel hook non
 * devono mai propagarsi alla richiesta del client.
 */
onRecordAfterCreateSuccess((e) => {
    try {
        eseguiGiacenza(e.record)
    } catch (err) {
        console.error("[giacenza_chiusura] Errore non gestito:", err)
    }
}, "sessioni_cassa")

function eseguiGiacenza(sess) {
    const nome    = sess.getString("nome") || ("Sessione_" + sess.getInt("numero_sessione"))
    const numSess = sess.getInt("numero_sessione")

    const now     = new Date()
    const pad     = n => String(n).padStart(2, "0")
    const dataStr = now.getFullYear() + "-" + pad(now.getMonth()+1) + "-" + pad(now.getDate()) +
                    " " + pad(now.getHours()) + ":" + pad(now.getMinutes())

    // ── 1. Magazzini comuni ────────────────────────────────────
    let magComuni = []
    try {
        magComuni = $app.findRecordsByFilter("magazzini_comuni", "1=1", "nome", 0, 0)
    } catch(err) { console.error("[giacenza] magazzini_comuni:", err) }

    // ── 2. Prodotti senza magazzino comune ─────────────────────
    // Il campo magazzino_comune è una relazione: per filtrare i vuoti
    // leggiamo tutti i prodotti attivi e filtriamo in JS.
    let prodotti = []
    try {
        const tutti = $app.findRecordsByFilter(
            "prodotti", "attivo=true", "ordine,nome", 0, 0
        )
        $app.expandRecords(tutti, ["famiglia"], null)
        // Escludi quelli che hanno magazzino_comune valorizzato
        prodotti = tutti.filter(p => !p.getString("magazzino_comune"))
    } catch(err) { console.error("[giacenza] prodotti:", err) }

    // Raggruppa per famiglia rispettando l'ordine
    const gruppi = {}
    const ordineFamiglie = []
    for (const p of prodotti) {
        let famRec = null
        try { famRec = p.expandedOne("famiglia") } catch(_) {}
        const famNome = famRec ? famRec.getString("nome") : "— Senza famiglia"
        if (!gruppi[famNome]) { gruppi[famNome] = []; ordineFamiglie.push(famNome) }
        gruppi[famNome].push(p)
    }

    const qtyLabel = q => (q === -1 || q < 0) ? "∞" : String(q)

    // ── 3. CSV (BOM per Excel) ─────────────────────────────────
    const csvRighe = ["\uFEFFSezione,Articolo,Giacenza"]
    for (const m of magComuni) {
        csvRighe.push(`"Magazzino comune","${csvEsc(m.getString("nome"))}","${qtyLabel(m.getInt("quantita"))}"`)
    }
    for (const fam of ordineFamiglie) {
        for (const p of gruppi[fam]) {
            csvRighe.push(`"${csvEsc(fam)}","${csvEsc(p.getString("nome"))}","${qtyLabel(p.getInt("quantita"))}"`)
        }
    }
    const csvContent = csvRighe.join("\r\n")

    // ── 4. HTML ────────────────────────────────────────────────
    let righeHtml = ""
    if (magComuni.length > 0) {
        righeHtml += `<tr class="sh"><td colspan="2">Magazzini comuni</td></tr>`
        for (const m of magComuni) {
            const qty = m.getInt("quantita")
            const cls = qty === 0 ? ' class="zero"' : (qty > 0 && qty <= 3) ? ' class="low"' : ''
            righeHtml += `<tr${cls}><td class="nome">${esc(m.getString("nome"))}</td><td class="qty">${qtyLabel(qty)}</td></tr>`
        }
    }
    for (const fam of ordineFamiglie) {
        righeHtml += `<tr class="sh"><td colspan="2">${esc(fam)}</td></tr>`
        for (const p of gruppi[fam]) {
            const qty = p.getInt("quantita")
            const cls = qty === 0 ? ' class="zero"' : (qty > 0 && qty <= 3) ? ' class="low"' : ''
            righeHtml += `<tr${cls}><td class="nome">${esc(p.getString("nome"))}</td><td class="qty">${qtyLabel(qty)}</td></tr>`
        }
    }

    const totale = [
        ...magComuni.filter(m => m.getInt("quantita") >= 0),
        ...prodotti.filter(p => p.getInt("quantita") >= 0),
    ].reduce((s, r) => s + r.getInt("quantita"), 0)

    const html = `<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8">
<title>Giacenza — ${esc(nome)}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:13px;color:#1e293b;max-width:680px;margin:30px auto;padding:0 20px}
  h1{font-size:20px;margin:0 0 4px}
  .sub{color:#64748b;font-size:12px;margin-bottom:24px}
  table{width:100%;border-collapse:collapse}
  td,th{padding:7px 10px;border-bottom:1px solid #e2e8f0}
  th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;border-bottom:2px solid #e2e8f0}
  tr.sh td{background:#f1f5f9;font-weight:700;font-size:12px;color:#475569;text-transform:uppercase;letter-spacing:.5px;padding:5px 10px;border-top:8px solid #fff}
  .nome{width:75%}.qty{width:25%;text-align:right;font-weight:700;font-variant-numeric:tabular-nums}
  tr.zero .qty{color:#dc2626}tr.low .qty{color:#d97706}
  .tot{margin-top:20px;text-align:right;font-size:14px;font-weight:700;color:#0f172a}
  @media print{body{margin:0}}
</style></head><body>
<h1>Giacenza Magazzino</h1>
<div class="sub">Sessione #${numSess}: ${esc(nome)} — ${dataStr}</div>
<table>
  <tr><th class="nome">Articolo</th><th class="qty">Giacenza</th></tr>
  ${righeHtml}
</table>
<div class="tot">Totale pezzi (escluso ∞): ${totale}</div>
</body></html>`

    // ── 5. Salva su disco ──────────────────────────────────────
    // __hooks = .../app/pb_hooks → ../../chiusure = radice progetto/chiusure
    const cartella = __hooks + "/../../chiusure"
    const nomeFile = nome.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_")
    try { $os.mkdirAll(cartella, 0o755) } catch(err) { console.error("[giacenza] mkdir:", err) }
    try { $os.writeFile(cartella + "/giacenza_" + nomeFile + ".csv",  csvContent) } catch(err) { console.error("[giacenza] writeCSV:", err) }
    try { $os.writeFile(cartella + "/giacenza_" + nomeFile + ".html", html) }       catch(err) { console.error("[giacenza] writeHTML:", err) }

    // ── 6. Email ──────────────────────────────────────────────
    let destinatari = []
    try {
        const conf = $app.findFirstRecordByFilter("configurazione", `chiave='chiusura_email_destinatari'`)
        const val  = conf.get("valore")
        const raw  = typeof val === "string" ? val : (Array.isArray(val) ? val.join(", ") : "")
        destinatari = raw.split(",").map(s => s.trim()).filter(s => s.includes("@"))
    } catch(_) { /* nessun destinatario configurato */ }

    if (destinatari.length === 0) return

    const senderAddr = $app.settings().meta.senderAddress
    if (!senderAddr) { console.warn("[giacenza] SMTP non configurato"); return }

    try {
        const msg = new MailerMessage({
            from:    { address: senderAddr, name: $app.settings().meta.senderName || "Cassa Dalila" },
            to:      destinatari.map(a => ({ address: a })),
            subject: `Giacenza magazzino — ${nome}`,
            html:    html,
            text:    csvContent,
        })
        $app.newMailClient().send(msg)
    } catch(err) {
        console.error("[giacenza] Email:", err)
    }
}

function esc(s)    { return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;") }
function csvEsc(s) { return String(s||"").replace(/"/g,'""') }
