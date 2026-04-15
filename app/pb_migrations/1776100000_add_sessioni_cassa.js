/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const rules = { listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "" }

  const utenti = app.findCollectionByNameOrId("utenti")

  // Crea collection sessioni_cassa
  let sessioni = new Collection(Object.assign({
    type: "base", name: "sessioni_cassa",
    fields: [
      { type: "number", name: "numero_sessione" },
      { type: "text",   name: "nome" },
      { type: "date",   name: "aperta_il" },
      { type: "date",   name: "chiusa_il" },
      { type: "relation", name: "chiusa_da", collectionId: utenti.id, maxSelect: 1, cascadeDelete: false },
      { type: "number", name: "scontrini_count" },
      { type: "number", name: "totale_netto" },
      { type: "number", name: "totale_contanti" },
      { type: "number", name: "totale_carta" },
      { type: "number", name: "totale_omaggi" },
      { type: "number", name: "primo_numero" },
      { type: "number", name: "ultimo_numero" },
    ],
  }, rules))
  app.save(sessioni)

  // Aggiungi campo sessione a scontrini
  const scontrini = app.findCollectionByNameOrId("scontrini")
  scontrini.fields.addAt(999, new Field({
    "id":            "rel0sessione1",
    "type":          "relation",
    "name":          "sessione",
    "collectionId":  sessioni.id,
    "cascadeDelete": false,
    "maxSelect":     1,
    "required":      false,
    "presentable":   false,
    "hidden":        false,
    "system":        false
  }))
  return app.save(scontrini)

}, (app) => {
  try {
    const scontrini = app.findCollectionByNameOrId("scontrini")
    scontrini.fields.removeById("rel0sessione1")
    app.save(scontrini)
  } catch(e) {}
  try {
    app.delete(app.findCollectionByNameOrId("sessioni_cassa"))
  } catch(e) {}
})
