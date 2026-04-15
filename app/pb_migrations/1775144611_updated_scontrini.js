/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_521845050")

  // update field
  collection.fields.addAt(10, new Field({
    "hidden": false,
    "id": "number1732316193",
    "max": null,
    "min": null,
    "name": "totale_netto",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_521845050")

  // update field
  collection.fields.addAt(10, new Field({
    "hidden": false,
    "id": "number1732316193",
    "max": null,
    "min": null,
    "name": "totale_netto",
    "onlyInt": false,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
})
