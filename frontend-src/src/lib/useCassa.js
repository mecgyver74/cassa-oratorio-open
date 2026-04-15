import { useState, useCallback } from 'react'
import pb from './pb'
import { stampaTutto } from './stampa'

export function useCassa() {
  const [righe, setRighe] = useState([])
  const [scontoPerc, setScontoPerc] = useState(0)
  const [scontoEuro, setScontoEuro] = useState(0)
  const [tavolo, setTavolo] = useState(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const getSub = useCallback(() =>
    righe.filter(r => !r.omaggio).reduce((s, r) => s + r.prezzo_snapshot * r.quantita, 0), [righe])

  const getScontoCalcolato = useCallback(() => {
    const sub = getSub()
    if (scontoEuro > 0) return Math.min(scontoEuro, sub)
    if (scontoPerc > 0) return sub * scontoPerc / 100
    return 0
  }, [getSub, scontoEuro, scontoPerc])

  const getTotale = useCallback(() =>
    Math.max(0, getSub() - getScontoCalcolato()), [getSub, getScontoCalcolato])

  const addProdotto = useCallback((prodotto, onErrore) => {
    setRighe(prev => {
      // Conta TUTTE le righe dello stesso prodotto (pagate + omaggio)
      const qtaCarrello = prev
        .filter(r => r._prodotto_id === prodotto.id)
        .reduce((s, r) => s + r.quantita, 0)
      const scorta = prodotto.quantita

      // Verifica scorta (scorta -1 = infinita)
      if (scorta !== -1 && scorta !== undefined) {
        if (scorta <= 0) {
          onErrore && onErrore(`${prodotto.nome} è esaurito`)
          return prev
        }
        if (qtaCarrello >= scorta) {
          onErrore && onErrore(`${prodotto.nome}: scorta disponibile ${scorta} pz, già nel carrello ${qtaCarrello}`)
          return prev
        }
      }

      // Aggiungi alla riga pagata esistente (non omaggio e senza note/personalizzazioni)
      const idx = prev.findIndex(r => r._prodotto_id === prodotto.id && !r.omaggio && !r.note)
      if (idx >= 0) {
        const n = [...prev]; n[idx] = { ...n[idx], quantita: n[idx].quantita + 1 }; return n
      }
      return [...prev, {
        _key: Date.now() + Math.random(),
        _prodotto_id: prodotto.id,
        _tipo: 'prodotto',
        _famId: prodotto.famiglia,
        _ingredienti: Array.isArray(prodotto.ingredienti) ? prodotto.ingredienti : [],
        prodotto: prodotto.id,
        menu: null,
        nome_snapshot: prodotto.nome,
        prezzo_snapshot: prodotto.prezzo,
        quantita: 1,
        unita: prodotto.unita || 'pz',
        omaggio: false,
        note: '',
      }]
    })
  }, [])

  const addMenu = useCallback((menu) => {
    setRighe(prev => [...prev, {
      _key: Date.now() + Math.random(),
      _tipo: 'menu',
      prodotto: null,
      menu: menu.id,
      nome_snapshot: menu.nome,
      prezzo_snapshot: menu.prezzo,
      quantita: 1,
      unita: 'pz',
      omaggio: false,
      note: '',
    }])
  }, [])

  const setQuantita = useCallback((key, q, prodottoScorta, onErrore) => {
    setRighe(prev => {
      if (q <= 0) return prev.filter(r => r._key !== key)
      if (prodottoScorta !== undefined && prodottoScorta !== -1) {
        // Calcola totale per questo prodotto (tutte le righe tranne quella corrente)
        const rigaCorrente = prev.find(r => r._key === key)
        const altreRighe = prev.filter(r => r._key !== key && r._prodotto_id === rigaCorrente?._prodotto_id)
        const qtaAltre = altreRighe.reduce((s, r) => s + r.quantita, 0)
        if (qtaAltre + q > prodottoScorta) {
          onErrore && onErrore(`Scorta disponibile: ${prodottoScorta} pz (già ${qtaAltre} in altre righe)`)
          return prev
        }
      }
      return prev.map(r => r._key === key ? { ...r, quantita: q } : r)
    })
  }, [])

  const toggleOmaggio = useCallback((key) => {
    setRighe(prev => prev.map(r => r._key === key ? { ...r, omaggio: !r.omaggio } : r))
  }, [])

  const rimuoviRiga = useCallback((key) => {
    setRighe(prev => prev.filter(r => r._key !== key))
  }, [])

  const svuota = useCallback(() => {
    setRighe([]); setScontoPerc(0); setScontoEuro(0); setTavolo(null); setNote('')
  }, [])

  const pagaeSalva = useCallback(async ({ tipoPagamento, pagato, utente, asporto }) => {
    setLoading(true)
    pb.autoCancellation(false)
    try {
      const totale = getTotale()
      const sub = getSub()

      // Prossimo numero scontrino
      const ultimi = await pb.collection('scontrini').getList(1, 1, {
        sort: '-numero', fields: 'numero'
      }).catch(() => ({ items: [] }))
      const nextNum = (ultimi.items[0]?.numero || 0) + 1

      // Crea scontrino
      const sc = await pb.collection('scontrini').create({
        numero: nextNum,
        data_ora: new Date().toISOString(),
        operatore: utente?.id || null,
        postazione: utente?.nome || utente?.postazione || 'Cassa',
        tavolo: tavolo?.id || null,
        note,
        totale_lordo: Math.max(0, sub || 0),
        sconto_perc: scontoPerc || 0,
        sconto_euro: scontoEuro || 0,
        totale_netto: Math.max(0, totale || 0),
        tipo_pagamento: tipoPagamento || 'contanti',
        pagato: Math.max(0, pagato || totale || 0),
        resto: Math.max(0, (pagato || totale || 0) - (totale || 0)),
        stornato: false,
        asporto: asporto || false,
      })

      // Crea righe
      const righeSalvate = await Promise.all(righe.map(r =>
        pb.collection('righe_scontrino').create({
          scontrino: sc.id,
          prodotto: r.prodotto || null,
          menu: r.menu || null,
          nome_snapshot: r.nome_snapshot,
          prezzo_snapshot: r.prezzo_snapshot,
          quantita: r.quantita,
          unita: r.unita,
          totale_riga: r.omaggio ? 0 : r.prezzo_snapshot * r.quantita,
          omaggio: r.omaggio,
          note: r.note,
          stornata: false,
        })
      ))

      // Scala magazzino (sequenziale per evitare race condition su stesso prodotto)
      for (const r of righe.filter(r => r.prodotto)) {
        try {
          const prod = await pb.collection('prodotti').getOne(r.prodotto, { expand: 'magazzino_comune' })
          if (prod.magazzino_comune && prod.expand?.magazzino_comune) {
            const mc = prod.expand.magazzino_comune
            if (mc.quantita >= 0) { // -1 = infinito, non scalare
              const mcFresh = await pb.collection('magazzini_comuni').getOne(mc.id)
              await pb.collection('magazzini_comuni').update(mc.id, { quantita: Math.max(0, mcFresh.quantita - r.quantita) })
              await pb.collection('movimenti_magazzino').create({ magazzino_comune: mc.id, tipo: 'scarico', quantita: r.quantita, note: `Scontrino #${nextNum}`, scontrino: sc.id })
            }
          } else {
            if (prod.quantita >= 0) { // -1 = infinito, non scalare
              const prodFresh = await pb.collection('prodotti').getOne(r.prodotto)
              await pb.collection('prodotti').update(r.prodotto, { quantita: Math.max(0, prodFresh.quantita - r.quantita) })
              await pb.collection('movimenti_magazzino').create({ prodotto: r.prodotto, tipo: 'scarico', quantita: r.quantita, note: `Scontrino #${nextNum}`, scontrino: sc.id })
            }
          }
        } catch(e) { console.warn('Errore scarico:', e) }
      }

      // Stampa unificata: scontrino + tutte le comande in una sola finestra
      try {
        const { getConfig } = await import('./stampa')
        const cfg = getConfig()
        const comande = await pb.collection('comande').getFullList({ filter: 'abilitata=true', sort: 'ordine,nome' })
        const scForPrint = { ...sc, tavolo: tavolo?.numero || null }

        // Costruisci mappa righe per comanda usando le righe del carrello (hanno _famId)
        const righePerComanda = {}
        for (const comanda of comande) {
          let famIds = comanda.famiglie_ids || []
          if (typeof famIds === 'string') { try { famIds = JSON.parse(famIds) } catch { famIds = [] } }
          // Usa righe[] del carrello che hanno _famId, ma con nome_snapshot da righeSalvate
          const righeC = righe
            .filter(r => famIds.includes(r._famId))
            .map(r => ({
              ...r,
              totale_riga: r.omaggio ? 0 : (r.prezzo_snapshot * r.quantita)
            }))
          if (righeC.length > 0) righePerComanda[comanda.id] = righeC
        }

        // Una sola finestra con tutto - solo comande con invia_stampante=true
        const comandeDaStampare = comande.filter(com => com.invia_stampante)
        stampaTutto(scForPrint, righeSalvate, comandeDaStampare, righePerComanda, cfg)
      } catch(e) { console.warn('Errore stampa:', e) }

      svuota()
      return { ok: true, numero: nextNum, id: sc.id, totale }
    } catch(e) {
      console.error('Errore pagamento:', e)
      return { ok: false, error: e.message }
    } finally {
      setLoading(false)
      pb.autoCancellation(true)
    }
  }, [righe, getTotale, getSub, getScontoCalcolato, scontoPerc, scontoEuro, tavolo, note, svuota])

  const stornoScontrino = useCallback(async (scontrinoId, noteStorno = '') => {
    try {
      const sc = await pb.collection('scontrini').getOne(scontrinoId)
      if (sc.stornato) throw new Error('Già stornato')
      await pb.collection('scontrini').update(scontrinoId, {
        stornato: true, data_storno: new Date().toISOString(), note_storno: noteStorno,
      })
      // Ricarica magazzino
      const righeSc = await pb.collection('righe_scontrino').getFullList({
        filter: `scontrino="${scontrinoId}"`, expand: 'prodotto.magazzino_comune'
      })
      await Promise.all(righeSc.filter(r => r.prodotto && !r.stornata).map(async r => {
        try {
          const prod = r.expand?.prodotto
          if (prod?.magazzino_comune && prod.expand?.magazzino_comune) {
            const mc = prod.expand.magazzino_comune
            await pb.collection('magazzini_comuni').update(mc.id, { quantita: mc.quantita + r.quantita })
          } else if (prod) {
            await pb.collection('prodotti').update(prod.id, { quantita: prod.quantita + r.quantita })
          }
        } catch(e) { console.warn(e) }
      }))
      return { ok: true }
    } catch(e) { return { ok: false, error: e.message } }
  }, [])

  const setNoteRiga = useCallback((key, nota) => {
    setRighe(prev => prev.map(r => r._key === key ? { ...r, note: nota } : r))
  }, [])

  // Splitta una riga con qta > 1 in due righe: una con qta 1 e una col resto
  const splitRiga = useCallback((key) => {
    setRighe(prev => {
      const riga = prev.find(r => r._key === key)
      if (!riga || riga.quantita <= 1) return prev
      const nuovaRiga = { ...riga, _key: Date.now() + Math.random(), quantita: 1, note: '' }
      return prev.map(r => r._key === key ? { ...r, quantita: r.quantita - 1 } : r).concat(nuovaRiga)
    })
    // Ritorna la key della nuova riga splittata (per aprire il dropdown su di essa)
    return Date.now()
  }, [])

  return {
    righe, setRighe,
    scontoPerc, setScontoPerc,
    scontoEuro, setScontoEuro,
    tavolo, setTavolo,
    note, setNote,
    loading,
    getSub, getScontoCalcolato, getTotale,
    addProdotto, addMenu,
    setQuantita, toggleOmaggio, rimuoviRiga, setNoteRiga, splitRiga,
    svuota, pagaeSalva, stornoScontrino,
  }
}