/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("utenti")

  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "select1310703715",
    "maxSelect": 0,
    "name": "ruolo",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "admin",
      "cassiere",
      "barista",
      "cuoco",
      "cameriere"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("utenti")

  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "select1310703715",
    "maxSelect": 0,
    "name": "ruolo",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "admin",
      "cassiere",
      "Barista",
      "Cuoco",
      "Cameriere"
    ]
  }))

  return app.save(collection)
})
