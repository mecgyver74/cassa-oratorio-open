/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("scontrini")
  const field = collection.fields.getByName("tipo_pagamento")
  field.values = ["contanti", "carta", "omaggio", "satispay", "buono"]
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("scontrini")
  const field = collection.fields.getByName("tipo_pagamento")
  field.values = ["contanti", "carta", "omaggio", "satispay"]
  return app.save(collection)
})
