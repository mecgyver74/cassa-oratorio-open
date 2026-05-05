/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("sessioni_cassa")
  collection.fields.addAt(999, new Field({
    "id": "num0satispay1", "type": "number", "name": "totale_satispay",
    "required": false, "presentable": false, "hidden": false, "system": false
  }))
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("sessioni_cassa")
  collection.fields.removeById("num0satispay1")
  return app.save(collection)
})
