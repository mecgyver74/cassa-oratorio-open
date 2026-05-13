/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const rules = { listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "" }

  // 1. Crea collection volontari
  const volontari = new Collection(Object.assign({
    type: "base", name: "volontari",
    fields: [
      { type: "text",   name: "nome",         required: true },
      { type: "number", name: "valore_buono"  },
      { type: "text",   name: "note"          },
    ],
  }, rules))
  app.save(volontari)

  // 2. Aggiungi buono_volontario e importo_buono a scontrini
  const scontrini = app.findCollectionByNameOrId("scontrini")

  scontrini.fields.addAt(999, new Field({
    id:            "relbv000001",
    type:          "relation",
    name:          "buono_volontario",
    collectionId:  volontari.id,
    cascadeDelete: false,
    maxSelect:     1,
    required:      false,
    presentable:   false,
    hidden:        false,
    system:        false,
  }))

  scontrini.fields.addAt(999, new Field({
    id:       "numib000001",
    type:     "number",
    name:     "importo_buono",
    required: false,
    hidden:   false,
    system:   false,
  }))

  // 3. Aggiungi "buono" ai valori ammessi per tipo_pagamento
  const tipoPag = scontrini.fields.getByName("tipo_pagamento")
  if (tipoPag && Array.isArray(tipoPag.values)) {
    tipoPag.values = [...tipoPag.values, "buono"]
  }

  return app.save(scontrini)

}, (app) => {
  // Rollback
  try {
    const scontrini = app.findCollectionByNameOrId("scontrini")
    scontrini.fields.removeById("numib000001")
    scontrini.fields.removeById("relbv000001")
    const tipoPag = scontrini.fields.getByName("tipo_pagamento")
    if (tipoPag && Array.isArray(tipoPag.values)) {
      tipoPag.values = tipoPag.values.filter(v => v !== "buono")
    }
    app.save(scontrini)
  } catch(e) {}
  try {
    app.delete(app.findCollectionByNameOrId("volontari"))
  } catch(e) {}
})
