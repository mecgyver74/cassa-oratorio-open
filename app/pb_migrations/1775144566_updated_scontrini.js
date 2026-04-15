/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_521845050")

  // update field
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "number1014223302",
    "max": null,
    "min": null,
    "name": "totale_lordo",
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
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "number1014223302",
    "max": null,
    "min": null,
    "name": "totale_lordo",
    "onlyInt": false,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
})
