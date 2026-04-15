import pb from './pb'

// Cache in memoria per evitare chiamate ripetute nella stessa sessione
const cache = {}

// Carica un valore dalla collection configurazione
export async function getConf(chiave, fallback = {}) {
  // Prima controlla cache in memoria
  if (cache[chiave] !== undefined) return cache[chiave]
  
  // Poi prova dal DB
  try {
    pb.autoCancellation(false)
    const res = await pb.collection('configurazione').getFirstListItem(`chiave='${chiave}'`)
    pb.autoCancellation(true)
    const val = res.valore ?? fallback
    cache[chiave] = val
    return val
  } catch (e) {
    pb.autoCancellation(true)
    // Se non trovato, restituisci fallback
    cache[chiave] = fallback
    return fallback
  }
}

// Salva un valore nella collection configurazione (upsert)
export async function setConf(chiave, valore) {
  cache[chiave] = valore
  try {
    pb.autoCancellation(false)
    // Cerca se esiste già
    const existing = await pb.collection('configurazione').getFirstListItem(`chiave='${chiave}'`).catch(() => null)
    if (existing) {
      await pb.collection('configurazione').update(existing.id, { valore })
    } else {
      await pb.collection('configurazione').create({ chiave, valore })
    }
    pb.autoCancellation(true)
  } catch (e) {
    pb.autoCancellation(true)
    console.error('Errore salvataggio config:', e)
  }
}

// Elimina una chiave dalla collection configurazione
export async function delConf(chiave) {
  delete cache[chiave]
  try {
    pb.autoCancellation(false)
    const existing = await pb.collection('configurazione').getFirstListItem(`chiave='${chiave}'`).catch(() => null)
    if (existing) {
      await pb.collection('configurazione').delete(existing.id)
    }
    pb.autoCancellation(true)
  } catch (e) {
    pb.autoCancellation(true)
    console.error('Errore eliminazione config:', e)
  }
}

// Migra dal localStorage al DB (da chiamare una volta per trasferire le impostazioni esistenti)
export async function migraLocalStorage() {
  const keys = [
    'cassa_stampa_config',
    'cassa_display',
    'cassa_scont_width',
    'comande_filtro',
    'comande_ordine',
    'comande_vista',
  ]
  let migrati = 0
  for (const k of keys) {
    const raw = localStorage.getItem(k)
    if (raw === null) continue
    // Controlla se esiste già nel DB
    const existing = await getConf(k, null)
    if (existing !== null) continue // già migrato
    
    let val
    try { val = JSON.parse(raw) } catch { val = raw }
    await setConf(k, val)
    migrati++
  }
  if (migrati > 0) {
    console.log(`Migrazione config: ${migrati} chiavi trasferite da localStorage a DB`)
    // Non rimuoviamo localStorage per sicurezza, ma il DB ha priorità
  }
}
