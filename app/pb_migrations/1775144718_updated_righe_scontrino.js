/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1977039447")

  // update field
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "number2362124776",
    "max": null,
    "min": null,
    "name": "totale_riga",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1977039447")

  // update field
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "number2362124776",
    "max": null,
    "min": null,
    "name": "totale_riga",
    "onlyInt": false,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
})
