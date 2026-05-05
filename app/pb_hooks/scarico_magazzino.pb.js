/// <reference path="../pb_data/types.d.ts" />

/**
 * POST /api/scarico-magazzino
 *
 * Decrementa il magazzino in modo atomico usando una transazione SQLite.
 * Questo previene l'overselling quando due casse vendono lo stesso prodotto
 * in contemporanea (race condition).
 *
 * Body: {
 *   scontrino_id:  string,
 *   numero:        number,
 *   items: [
 *     { prodotto_id: string, magazzino_comune_id: string|null, quantita: number }
 *   ]
 * }
 *
 * Response 200: { ok: true, risultati: [...] }
 * Response 409: { message: "Stock insufficiente per ..." }
 */
routerAdd("POST", "/api/scarico-magazzino", (e) => {
  const body        = e.requestInfo().body
  const items       = body.items || []
  const scontrinoId = body.scontrino_id || ""
  const numero      = body.numero || 0

  if (!Array.isArray(items) || items.length === 0) {
    return e.json(200, { ok: true, risultati: [] })
  }

  const risultati = []
  let erroreStock = null

  try {
    $app.runInTransaction((txApp) => {
      for (const item of items) {
        const qty = parseInt(item.quantita) || 0
        if (qty <= 0) continue

        if (item.magazzino_comune_id) {
          // ── Magazzino condiviso tra più prodotti ──
          const mc = txApp.findRecordById("magazzini_comuni", item.magazzino_comune_id)
          const disponibile = mc.getInt("quantita")

          if (disponibile !== -1) { // -1 = infinito
            if (disponibile < qty) {
              erroreStock = `Stock insufficiente per "${mc.getString("nome")}": disponibili ${disponibile}, richiesti ${qty}`
              throw new Error(erroreStock)
            }
            mc.set("quantita", disponibile - qty)
            txApp.save(mc)
            risultati.push({ id: item.magazzino_comune_id, tipo: "mc", nuova_quantita: disponibile - qty })
          }

          // Movimento
          const colMov = txApp.findCollectionByNameOrId("movimenti_magazzino")
          const mv = new Record(colMov)
          mv.set("magazzino_comune", item.magazzino_comune_id)
          mv.set("tipo", "scarico")
          mv.set("quantita", qty)
          mv.set("note", `Scontrino #${numero}`)
          if (scontrinoId) mv.set("scontrino", scontrinoId)
          txApp.save(mv)

        } else if (item.prodotto_id) {
          // ── Magazzino diretto del prodotto ──
          const prod = txApp.findRecordById("prodotti", item.prodotto_id)
          const disponibile = prod.getInt("quantita")

          if (disponibile !== -1) { // -1 = infinito
            if (disponibile < qty) {
              erroreStock = `Stock insufficiente per "${prod.getString("nome")}": disponibili ${disponibile}, richiesti ${qty}`
              throw new Error(erroreStock)
            }
            prod.set("quantita", disponibile - qty)
            txApp.save(prod)
            risultati.push({ id: item.prodotto_id, tipo: "prodotto", nuova_quantita: disponibile - qty })
          }

          // Movimento
          const colMov = txApp.findCollectionByNameOrId("movimenti_magazzino")
          const mv = new Record(colMov)
          mv.set("prodotto", item.prodotto_id)
          mv.set("tipo", "scarico")
          mv.set("quantita", qty)
          mv.set("note", `Scontrino #${numero}`)
          if (scontrinoId) mv.set("scontrino", scontrinoId)
          txApp.save(mv)
        }
      }
    })
  } catch (err) {
    if (erroreStock) {
      return e.json(409, { ok: false, message: erroreStock })
    }
    return e.json(500, { ok: false, message: err.message || "Errore interno" })
  }

  return e.json(200, { ok: true, risultati })
})
