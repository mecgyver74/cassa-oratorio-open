/// <reference path="../pb_data/types.d.ts" />

/**
 * Alla chiusura cassa (creazione sessioni_cassa):
 * - Genera CSV e HTML con la giacenza aggiornata
 * - Salva i file in <radice>/chiusure/
 * - Invia email agli indirizzi configurati in Setup → Notifiche
 *
 * Ordine report:
 *   1. Magazzini comuni (prima, per tutti i prodotti che vi attingono)
 *   2. Prodotti senza magazzino comune, raggruppati per famiglia (ordine cassa)
 *   Inclusi tutti i prodotti attivi, anche quelli con quantità infinita (-1).
 */
onRecordAfterCreateSuccess((e) => {
    const sess    = e.record
    const nome    = sess.getString("nome") || ("Sessione_" + sess.getInt("numero_sessione"))
    const numSess = sess.getInt("numero_sessione")

    const now     = new Date()
    const pad     = n => String(n).padStart(2, "0")
    const dataStr = now.getFullYear() + "-" + pad(now.getMonth()+1) + "-" + pad(now.getDate()) +
                    " " + pad(now.getHours()) + ":" + pad(now.getMinutes())
    const dataFile= now.getFullYear() + pad(now.getMonth()+1) + pad(now.getDate()) + "_" +
                    pad(now.getHours()) + pad(now.getMinutes())

    // ── 1. Dati magazzini comuni ───────────────────────────────
    const magComuni = $app.findRecordsByFilter(
        "magazzini_comuni", "1=1", "nome", 0, 0
    )

    // ── 2. Prodotti senza magazzino comune, con famiglia ───────
    // Escludiamo chi ha magazzino_comune valorizzato (gestito dalla pool comune)
    const prodotti = $app.findRecordsByFilter(
        "prodotti",
        "attivo=true && magazzino_comune=''",
        "famiglia.ordine,famiglia.nome,ordine,nome",
        0, 0
    )
    $app.expandRecords(prodotti, ["famiglia"], null)

    // Raggruppa per famiglia
    const gruppi = {}
    const ordineFamiglie = []
    for (const p of prodotti) {
        const famRec = p.expandedOne("famiglia")
        const famNome = famRec ? famRec.getString("nome") : "— Senza famiglia"
        if (!gruppi[famNome]) { gruppi[famNome] = []; ordineFamiglie.push(famNome) }
        gruppi[famNome].push(p)
    }

    const qtyLabel = q => q === -1 ? "∞" : String(q)

    // ── 3. Genera CSV (BOM per Excel) ─────────────────────────
    const csvRighe = ["\uFEFFSezione,Articolo,Giacenza"]

    for (const m of magComuni) {
        csvRighe.push(`"Magazzino comune","${m.getString("nome").replace(/"/g,'""')}","${qtyLabel(m.getInt("quantita"))}"`)
    }
    for (const fam of ordineFamiglie) {
        for (const p of gruppi[fam]) {
            csvRighe.push(`"${fam.replace(/"/g,'""')}","${p.getString("nome").replace(/"/g,'""')}","${qtyLabel(p.getInt("quantita"))}"`)
        }
    }
    const csvContent = csvRighe.join("\r\n")

    // ── 4. Salva file su disco ─────────────────────────────────
    const cartella = __hooks + "/../../chiusure"
    try { $os.mkdirAll(cartella, 0o755) } catch(_) {}
    const nomeFile = nome.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_")
    const pathCsv  = cartella + "/giacenza_" + nomeFile + ".csv"
    const pathHtml = cartella + "/giacenza_" + nomeFile + ".html"

    // ── 5. Genera HTML ────────────────────────────────────────
    let righeHtml = ""

    // Sezione magazzini comuni
    if (magComuni.length > 0) {
        righeHtml += `<tr class="section-header"><td colspan="2">Magazzini comuni</td></tr>`
        for (const m of magComuni) {
            const qty = m.getInt("quantita")
            const cls = qty === 0 ? ' class="zero"' : qty > 0 && qty <= 3 ? ' class="low"' : ''
            righeHtml += `<tr${cls}><td class="nome">${esc(m.getString("nome"))}</td><td class="qty">${qtyLabel(qty)}</td></tr>`
        }
    }

    // Sezione prodotti per famiglia
    for (const fam of ordineFamiglie) {
        righeHtml += `<tr class="section-header"><td colspan="2">${esc(fam)}</td></tr>`
        for (const p of gruppi[fam]) {
            const qty = p.getInt("quantita")
            const cls = qty === 0 ? ' class="zero"' : qty > 0 && qty <= 3 ? ' class="low"' : ''
            righeHtml += `<tr${cls}><td class="nome">${esc(p.getString("nome"))}</td><td class="qty">${qtyLabel(qty)}</td></tr>`
        }
    }

    const totMC   = magComuni.filter(m => m.getInt("quantita") !== -1).reduce((s,m) => s + m.getInt("quantita"), 0)
    const totProd = prodotti.filter(p => p.getInt("quantita") !== -1).reduce((s,p) => s + p.getInt("quantita"), 0)
    const totale  = totMC + totProd

    const html = `<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8">
<title>Giacenza — ${esc(nome)}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 13px; color: #1e293b; max-width: 680px; margin: 30px auto; padding: 0 20px; }
  h1   { font-size: 20px; margin: 0 0 4px; }
  .sub { color: #64748b; font-size: 12px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; }
  td, th { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: #94a3b8; border-bottom: 2px solid #e2e8f0; }
  .section-header td { background: #f1f5f9; font-weight: 700; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: .5px; padding: 5px 10px; border-top: 8px solid #fff; }
  .nome { width: 75%; }
  .qty  { width: 25%; text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }
  tr.zero .qty { color: #dc2626; }
  tr.low  .qty { color: #d97706; }
  .totale { margin-top: 20px; text-align: right; font-size: 14px; font-weight: 700; color: #0f172a; }
  @media print { body { margin: 0; } }
</style></head><body>
<h1>Giacenza Magazzino</h1>
<div class="sub">Sessione #${numSess}: ${esc(nome)} — ${dataStr}</div>
<table>
  <tr><th class="nome">Articolo</th><th class="qty">Giacenza</th></tr>
  ${righeHtml}
</table>
<div class="totale">Totale pezzi (escluso ∞): ${totale}</div>
</body></html>`

    try { $os.writeFile(pathCsv,  csvContent) } catch(err) { console.error("[giacenza] CSV:", err) }
    try { $os.writeFile(pathHtml, html) }       catch(err) { console.error("[giacenza] HTML:", err) }

    // ── 6. Email ──────────────────────────────────────────────
    let destinatari = []
    try {
        const conf = $app.findFirstRecordByFilter(
            "configurazione", `chiave='chiusura_email_destinatari'`
        )
        const val = conf.get("valore")
        if (typeof val === "string" && val.trim()) {
            destinatari = val.split(",").map(s => s.trim()).filter(s => s.includes("@"))
        } else if (Array.isArray(val)) {
            destinatari = val.filter(s => typeof s === "string" && s.includes("@"))
        }
    } catch(_) { /* nessun destinatario configurato */ }

    if (destinatari.length === 0) return

    const senderAddr = $app.settings().meta.senderAddress
    const senderName = $app.settings().meta.senderName || "Cassa Dalila"
    if (!senderAddr) { console.warn("[giacenza] SMTP non configurato"); return }

    try {
        const msg = new MailerMessage({
            from:    { address: senderAddr, name: senderName },
            to:      destinatari.map(a => ({ address: a })),
            subject: `Giacenza magazzino — ${nome}`,
            html:    html,
            text:    csvContent,
        })
        $app.newMailClient().send(msg)
    } catch(err) {
        console.error("[giacenza] Errore invio email:", err)
    }

}, "sessioni_cassa")

function esc(s) {
    return String(s || "")
        .replace(/&/g,"&amp;").replace(/</g,"&lt;")
        .replace(/>/g,"&gt;").replace(/"/g,"&quot;")
}
