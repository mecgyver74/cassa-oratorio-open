/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {

  // Regole di accesso pubblico per tutte le collection
  const rules = {
    listRule:   "",
    viewRule:   "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
  }

  let utenti = new Collection(Object.assign({
    type: "base", name: "utenti",
    fields: [
      { type: "text",   name: "nome",       required: true },
      { type: "text",   name: "postazione" },
      { type: "select", name: "ruolo",      required: true, values: ["admin","cassiere"] },
      { type: "text",   name: "pin" },
      { type: "bool",   name: "attivo" },
    ],
  }, rules))
  app.save(utenti)

  let famiglie = new Collection(Object.assign({
    type: "base", name: "famiglie",
    fields: [
      { type: "text",   name: "nome",   required: true },
      { type: "number", name: "codice" },
      { type: "text",   name: "colore" },
      { type: "bool",   name: "attivo" },
      { type: "number", name: "ordine" },
    ],
  }, rules))
  app.save(famiglie)

  let magazziniComuni = new Collection(Object.assign({
    type: "base", name: "magazzini_comuni",
    fields: [
      { type: "text",   name: "nome",           required: true },
      { type: "number", name: "quantita" },
      { type: "number", name: "soglia_allarme" },
    ],
  }, rules))
  app.save(magazziniComuni)

  let comande = new Collection(Object.assign({
    type: "base", name: "comande",
    fields: [
      { type: "text",   name: "nome",            required: true },
      { type: "bool",   name: "abilitata" },
      { type: "text",   name: "stampante" },
      { type: "number", name: "copie" },
      { type: "bool",   name: "salva_su_db" },
      { type: "bool",   name: "invia_stampante" },
      { type: "json",   name: "famiglie_ids" },
      { type: "number", name: "ordine" },
    ],
  }, rules))
  app.save(comande)

  let tavoli = new Collection(Object.assign({
    type: "base", name: "tavoli",
    fields: [
      { type: "text", name: "numero", required: true },
      { type: "text", name: "nome" },
      { type: "bool", name: "attivo" },
    ],
  }, rules))
  app.save(tavoli)

  let prodotti = new Collection(Object.assign({
    type: "base", name: "prodotti",
    fields: [
      { type: "text",     name: "nome",           required: true },
      { type: "text",     name: "codice_pers" },
      { type: "relation", name: "famiglia",
        collectionId: famiglie.id, maxSelect: 1, cascadeDelete: false },
      { type: "relation", name: "magazzino_comune",
        collectionId: magazziniComuni.id, maxSelect: 1, cascadeDelete: false },
      { type: "number",   name: "prezzo",         required: true },
      { type: "number",   name: "quantita" },
      { type: "text",     name: "unita" },
      { type: "number",   name: "soglia_allarme" },
      { type: "bool",     name: "attivo" },
      { type: "bool",     name: "solo_menu" },
      { type: "text",     name: "colore" },
      { type: "number",   name: "ordine" },
      { type: "bool",     name: "stampa" },
      { type: "relation", name: "comanda",
        collectionId: comande.id, maxSelect: 1, cascadeDelete: false },
    ],
  }, rules))
  app.save(prodotti)

  let menu = new Collection(Object.assign({
    type: "base", name: "menu",
    fields: [
      { type: "text",   name: "nome",   required: true },
      { type: "number", name: "prezzo", required: true },
      { type: "text",   name: "colore" },
      { type: "bool",   name: "attivo" },
      { type: "number", name: "ordine" },
    ],
  }, rules))
  app.save(menu)

  let menuComponenti = new Collection(Object.assign({
    type: "base", name: "menu_componenti",
    fields: [
      { type: "relation", name: "menu", required: true,
        collectionId: menu.id, maxSelect: 1, cascadeDelete: true },
      { type: "text",   name: "nome",   required: true },
      { type: "text",   name: "colore" },
      { type: "number", name: "ordine" },
    ],
  }, rules))
  app.save(menuComponenti)

  let menuProdotti = new Collection(Object.assign({
    type: "base", name: "menu_prodotti",
    fields: [
      { type: "relation", name: "componente", required: true,
        collectionId: menuComponenti.id, maxSelect: 1, cascadeDelete: true },
      { type: "relation", name: "prodotto",   required: true,
        collectionId: prodotti.id,       maxSelect: 1, cascadeDelete: false },
    ],
  }, rules))
  app.save(menuProdotti)

  let scontrini = new Collection(Object.assign({
    type: "base", name: "scontrini",
    fields: [
      { type: "number",   name: "numero",         required: true },
      { type: "date",     name: "data_ora",        required: true },
      { type: "relation", name: "operatore",
        collectionId: utenti.id,  maxSelect: 1, cascadeDelete: false },
      { type: "text",     name: "postazione" },
      { type: "relation", name: "tavolo",
        collectionId: tavoli.id,  maxSelect: 1, cascadeDelete: false },
      { type: "text",     name: "note" },
      { type: "number",   name: "totale_lordo",   required: true },
      { type: "number",   name: "sconto_perc" },
      { type: "number",   name: "sconto_euro" },
      { type: "number",   name: "totale_netto",   required: true },
      { type: "select",   name: "tipo_pagamento",
        values: ["contanti","carta","omaggio"] },
      { type: "number",   name: "pagato" },
      { type: "number",   name: "resto" },
      { type: "bool",     name: "stornato" },
      { type: "date",     name: "data_storno" },
      { type: "text",     name: "note_storno" },
    ],
  }, rules))
  app.save(scontrini)

  let righeScontrino = new Collection(Object.assign({
    type: "base", name: "righe_scontrino",
    fields: [
      { type: "relation", name: "scontrino",     required: true,
        collectionId: scontrini.id, maxSelect: 1, cascadeDelete: true },
      { type: "relation", name: "prodotto",
        collectionId: prodotti.id, maxSelect: 1, cascadeDelete: false },
      { type: "relation", name: "menu",
        collectionId: menu.id,     maxSelect: 1, cascadeDelete: false },
      { type: "text",   name: "nome_snapshot",   required: true },
      { type: "number", name: "prezzo_snapshot", required: true },
      { type: "number", name: "quantita",        required: true },
      { type: "text",   name: "unita" },
      { type: "number", name: "totale_riga",     required: true },
      { type: "bool",   name: "omaggio" },
      { type: "text",   name: "note" },
      { type: "bool",   name: "stornata" },
    ],
  }, rules))
  app.save(righeScontrino)

  let movimentiMagazzino = new Collection(Object.assign({
    type: "base", name: "movimenti_magazzino",
    fields: [
      { type: "relation", name: "prodotto",
        collectionId: prodotti.id,         maxSelect: 1, cascadeDelete: false },
      { type: "relation", name: "magazzino_comune",
        collectionId: magazziniComuni.id,  maxSelect: 1, cascadeDelete: false },
      { type: "select",   name: "tipo",   required: true,
        values: ["carico","scarico","rettifica"] },
      { type: "number",   name: "quantita", required: true },
      { type: "text",     name: "note" },
      { type: "relation", name: "scontrino",
        collectionId: scontrini.id,        maxSelect: 1, cascadeDelete: false },
    ],
  }, rules))
  app.save(movimentiMagazzino)

  // Utente admin di default
  let adminRecord = new Record(utenti)
  adminRecord.set("nome", "Admin")
  adminRecord.set("postazione", "Cassa 1")
  adminRecord.set("ruolo", "admin")
  adminRecord.set("attivo", true)
  app.save(adminRecord)


  // ── comande_evase ──────────────────────────────────────────────────
  const comandeEvase = new Collection({
    name: "comande_evase",
    type: "base",
    fields: [
      { name: "scontrino_id", type: "text", required: true },
      { name: "comanda_id",   type: "text", required: true },
      { name: "evasa_at",     type: "date" },
    ],
  })
  app.save(comandeEvase)

}, (app) => {
  for (let name of [
    "movimenti_magazzino","righe_scontrino","scontrini",
    "menu_prodotti","menu_componenti","menu",
    "prodotti","tavoli","comande",
    "magazzini_comuni","famiglie","utenti"
  ]) {
    try { app.delete(app.findCollectionByNameOrId(name)) } catch(_) {}
  }
})
