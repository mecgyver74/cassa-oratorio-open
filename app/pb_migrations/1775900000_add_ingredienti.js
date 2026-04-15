/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const prodotti = app.findCollectionByNameOrId("prodotti")
  prodotti.fields.add(new Field({ type: "json", name: "ingredienti" }))
  app.save(prodotti)
}, (app) => {
  const prodotti = app.findCollectionByNameOrId("prodotti")
  prodotti.fields.removeByName("ingredienti")
  app.save(prodotti)
})
