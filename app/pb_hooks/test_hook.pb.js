/// <reference path="../pb_data/types.d.ts" />

// Test 1: onServe → scrive file all'avvio di PocketBase
onServe((e) => {
    try {
        $os.writeFile($app.dataDir() + "/test_onServe.txt", "onServe ok: " + new Date().toISOString(), 0o644)
    } catch(_) {}
    e.next()
})

// Test 2: hook su QUALSIASI collection (nessun filtro) → scrive file a ogni create
onRecordAfterCreateSuccess((e) => {
    try {
        $os.writeFile($app.dataDir() + "/test_anyCreate.txt", "collection: " + e.record.collection().name + " - " + new Date().toISOString(), 0o644)
    } catch(_) {}
})
