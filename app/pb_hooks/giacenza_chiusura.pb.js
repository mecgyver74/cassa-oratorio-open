/// <reference path="../pb_data/types.d.ts" />

/**
 * Alla chiusura cassa (creazione sessioni_cassa) genera un file di testo
 * con la giacenza aggiornata di tutti i prodotti e magazzini comuni.
 * Il file viene salvato in: <radice_progetto>/chiusure/giacenza_<nome_sessione>.txt
 */
onRecordAfterCreateSuccess((e) => {
    const sess    = e.record
    const nome    = sess.getString("nome") || ("sessione_" + sess.getString("numero_sessione"))
    const numSess = sess.getInt("numero_sessione")

    // Timestamp
    const now = new Date()
    const dataPad = (n) => String(n).padStart(2, "0")
    const dataStr = now.getFullYear() + "-" +
        dataPad(now.getMonth() + 1) + "-" +
        dataPad(now.getDate()) + " " +
        dataPad(now.getHours()) + ":" +
        dataPad(now.getMinutes())

    // Cartella di destinazione: da pb_hooks (app/pb_hooks) saliamo a <radice>/chiusure
    const cartella = __hooks + "/../../chiusure"
    try { $os.mkdirAll(cartella, 0o755) } catch (_) {}

    // Nome file: solo caratteri sicuri
    const nomeFile = nome.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_")
    const percorso = cartella + "/giacenza_" + nomeFile + ".txt"

    // ── Leggi prodotti con magazzino diretto ──────────────────
    let righe = []

    const sep  = "─".repeat(52)
    const sep2 = "═".repeat(52)

    righe.push(sep2)
    righe.push("  GIACENZA MAGAZZINO — CHIUSURA CASSA")
    righe.push("  Sessione #" + numSess + ": " + nome)
    righe.push("  Generata il: " + dataStr)
    righe.push(sep2)
    righe.push("")

    // ── Prodotti ──────────────────────────────────────────────
    const prodotti = $app.findRecordsByFilter(
        "prodotti", "quantita >= 0", "nome", 0, 0
    )

    // Espandi famiglia per raggruppare
    $app.expandRecords(prodotti, ["famiglia"], null)

    // Raggruppa per famiglia
    const gruppi = {}
    for (const p of prodotti) {
        const famRec = p.expandedOne("famiglia")
        const fam    = famRec ? famRec.getString("nome") : "— Senza famiglia"
        if (!gruppi[fam]) gruppi[fam] = []
        gruppi[fam].push(p)
    }

    if (Object.keys(gruppi).length > 0) {
        righe.push("PRODOTTI")
        righe.push(sep)

        const famiglie = Object.keys(gruppi).sort()
        for (const fam of famiglie) {
            righe.push("")
            righe.push("  [" + fam + "]")
            for (const p of gruppi[fam]) {
                const nome_p = p.getString("nome")
                const qty    = p.getInt("quantita")
                const riga   = "    " + nome_p.padEnd(30, ".") + " " + String(qty).padStart(6)
                righe.push(riga)
            }
        }
        righe.push("")
    } else {
        righe.push("  (nessun prodotto con magazzino diretto)")
        righe.push("")
    }

    // ── Magazzini comuni ─────────────────────────────────────
    const magComuni = $app.findRecordsByFilter(
        "magazzini_comuni", "quantita >= 0", "nome", 0, 0
    )

    if (magComuni.length > 0) {
        righe.push(sep)
        righe.push("MAGAZZINI CONDIVISI")
        righe.push(sep)
        righe.push("")
        for (const m of magComuni) {
            const nome_m = m.getString("nome")
            const qty    = m.getInt("quantita")
            const riga   = "  " + nome_m.padEnd(32, ".") + " " + String(qty).padStart(6)
            righe.push(riga)
        }
        righe.push("")
    }

    // ── Totali ────────────────────────────────────────────────
    const totProd  = prodotti.reduce((s, p) => s + p.getInt("quantita"), 0)
    const totMC    = magComuni.reduce((s, m) => s + m.getInt("quantita"), 0)

    righe.push(sep2)
    righe.push("  Totale pezzi prodotti:   " + String(totProd).padStart(8))
    if (magComuni.length > 0)
        righe.push("  Totale magazzini comuni: " + String(totMC).padStart(8))
    righe.push(sep2)
    righe.push("")

    // ── Scrivi file ───────────────────────────────────────────
    try {
        $os.writeFile(percorso, righe.join("\n"))
    } catch (err) {
        console.error("[giacenza_chiusura] Errore scrittura file:", err)
    }

}, "sessioni_cassa")
