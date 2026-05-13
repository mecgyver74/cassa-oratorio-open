/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const sessioni = app.findCollectionByNameOrId("sessioni_cassa")
  sessioni.fields.addAt(999, new Field({
    id:       "numbu000001",
    type:     "number",
    name:     "totale_buoni",
    required: false,
    hidden:   false,
    system:   false,
  }))
  return app.save(sessioni)
}, (app) => {
  try {
    const sessioni = app.findCollectionByNameOrId("sessioni_cassa")
    sessioni.fields.removeById("numbu000001")
    app.save(sessioni)
  } catch(e) {}
})
