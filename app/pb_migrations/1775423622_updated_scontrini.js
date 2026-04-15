/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_521845050")

  // add field
  collection.fields.addAt(17, new Field({
    "hidden": false,
    "id": "bool1722260703",
    "name": "asporto",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_521845050")

  // remove field
  collection.fields.removeById("bool1722260703")

  return app.save(collection)
})
