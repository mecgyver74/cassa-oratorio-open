/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const c = new Collection({
    name: "righe_pronte",
    type: "base",
    fields: [
      { name: "riga_id",     type: "text", required: true },
      { name: "comanda_id",  type: "text", required: true },
      { name: "pronta_at",   type: "date" },
    ],
  })
  app.save(c)
  const col = app.findCollectionByNameOrId("righe_pronte")
  col.listRule   = ""
  col.viewRule   = ""
  col.createRule = ""
  col.updateRule = ""
  col.deleteRule = ""
  app.save(col)
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId("righe_pronte")) } catch(_) {}
})
