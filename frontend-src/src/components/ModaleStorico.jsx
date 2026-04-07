import { useState, useEffect } from 'react'
import pb from '../lib/pb'
import { stampaScontrino } from '../lib/stampa'

const EUR = v => '€ ' + Number(v).toFixed(2).replace('.', ',')

export default function ModaleStorico({ onClose, onRicarica, stornoScontrino, toast }) {
  const [scontrini, setScontrini] = useState([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState(null)
  const [righe, setRighe] = useState([])
  const [cerca, setCerca] = useState('')
  const [scontoVal, setScontoVal] = useState('')
  const [scontoTipo, setScontoTipo] = useState('euro')
  const [loadingRighe, setLoadingRighe] = useState(false)

  useEffect(() => { caricaScontrini() }, [])

  const caricaScontrini = async () => {
    setLoading(true)
    try {
      const r = await pb.collection('scontrini').getList(1, 100, {
        sort: '-numero', expand: 'operatore,tavolo'
      })
      setScontrini(r.items)
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const selScontrino = async sc => {
    setSel(sc)
    setRighe([])
    setLoadingRighe(true)
    try {
      pb.autoCancellation(false)
      // Costruisci URL manualmente con filtro correttamente encodato
      // Usa fetch senza parametri e filtra lato client
      // PocketBase dà 400 con qualsiasi parametro su questa collection
      const headers = {}
      if (pb.authStore.token) headers['Authorization'] = `Bearer ${pb.authStore.token}`
      const righeUrl = `${pb.baseUrl}/api/collections/righe_scontrino/records`
      const totRes = await fetch(righeUrl, { headers })
      const totData = await totRes.json()
      const total = totData.totalItems || 0
      const perPage = totData.perPage || 30
      const pages = Math.ceil(total / perPage)
      let tutteRighe = [...(totData.items || [])]
      // Carica le pagine successive se necessario
      for (let p = 2; p <= pages; p++) {
        const pr = await fetch(`${righeUrl}?page=${p}`, { headers })
        const pd = await pr.json()
        tutteRighe = tutteRighe.concat(pd.items || [])
      }
      pb.autoCancellation(true)
      setRighe(tutteRighe.filter(r => r.scontrino === sc.id))
    } catch(e) {
      pb.autoCancellation(true)
      console.error('Errore righe:', e)
    }
    setLoadingRighe(false)
  }

  const handleStorno = async () => {
    if (!sel) return
    if (!confirm(`Stornare lo scontrino #${String(sel.numero).padStart(4,'0')}?`)) return
    const note = prompt('Note storno (facoltativo):') ?? ''
    const res = await stornoScontrino(sel.id, note)
    if (res.ok) {
      toast('Scontrino stornato', 'r')
      caricaScontrini()
      const updated = await pb.collection('scontrini').getOne(sel.id).catch(() => null)
      if (updated) setSel(updated)
      onRicarica()
    } else toast('Errore: ' + res.error, 'r')
  }

  const handleStornaRiga = async riga => {
    if (!confirm(`Rimuovere "${riga.nome_snapshot}" dallo scontrino?`)) return
    try {
      await pb.collection('righe_scontrino').update(riga.id, { stornata: true })
      // Ricalcola totale
      const nuoveRighe = righe.map(r => r.id === riga.id ? { ...r, stornata: true } : r)
      const nuovoLordo = nuoveRighe.filter(r => !r.stornata && !r.omaggio).reduce((s,r) => s + r.totale_riga, 0)
      const nuovoNetto = Math.max(0, nuovoLordo - (sel.sconto_euro || 0) - nuovoLordo * (sel.sconto_perc || 0) / 100)
      await pb.collection('scontrini').update(sel.id, { totale_lordo: nuovoLordo, totale_netto: nuovoNetto })
      toast('Riga rimossa', 'r')
      setRighe(nuoveRighe)
      const updated = await pb.collection('scontrini').getOne(sel.id)
      setSel(updated)
      caricaScontrini()
      onRicarica()
    } catch(e) { toast('Errore: ' + e.message, 'r') }
  }

  const handleCambiaQta = async (riga, delta) => {
    const nuovaQta = riga.quantita + delta
    if (nuovaQta <= 0) { handleStornaRiga(riga); return }
    try {
      const nuovoTot = riga.prezzo_snapshot * nuovaQta
      await pb.collection('righe_scontrino').update(riga.id, { quantita: nuovaQta, totale_riga: nuovoTot })
      const nuoveRighe = righe.map(r => r.id === riga.id ? { ...r, quantita: nuovaQta, totale_riga: nuovoTot } : r)
      setRighe(nuoveRighe)
      const nuovoLordo = nuoveRighe.filter(r => !r.stornata && !r.omaggio).reduce((s,r) => s + r.totale_riga, 0)
      const nuovoNetto = Math.max(0, nuovoLordo - (sel.sconto_euro || 0) - nuovoLordo * (sel.sconto_perc || 0) / 100)
      await pb.collection('scontrini').update(sel.id, { totale_lordo: nuovoLordo, totale_netto: nuovoNetto })
      const updated = await pb.collection('scontrini').getOne(sel.id)
      setSel(updated)
      caricaScontrini()
      onRicarica()
    } catch(e) { toast('Errore: ' + e.message, 'r') }
  }

  const handleToggleOmaggio = async riga => {
    try {
      const nuovoOmaggio = !riga.omaggio
      const nuovoTot = nuovoOmaggio ? 0 : riga.prezzo_snapshot * riga.quantita
      await pb.collection('righe_scontrino').update(riga.id, { omaggio: nuovoOmaggio, totale_riga: nuovoTot })
      const nuoveRighe = righe.map(r => r.id === riga.id ? { ...r, omaggio: nuovoOmaggio, totale_riga: nuovoTot } : r)
      setRighe(nuoveRighe)
      const nuovoLordo = nuoveRighe.filter(r => !r.stornata && !r.omaggio).reduce((s,r) => s + r.totale_riga, 0)
      const nuovoNetto = Math.max(0, nuovoLordo - (sel.sconto_euro || 0) - nuovoLordo * (sel.sconto_perc || 0) / 100)
      await pb.collection('scontrini').update(sel.id, { totale_lordo: nuovoLordo, totale_netto: nuovoNetto })
      const updated = await pb.collection('scontrini').getOne(sel.id)
      setSel(updated)
      caricaScontrini()
      toast(nuovoOmaggio ? 'Riga impostata come omaggio' : 'Omaggio rimosso', 'b')
    } catch(e) { toast('Errore: ' + e.message, 'r') }
  }

  const handleApplicaSconto = async () => {
    if (!sel || sel.stornato) return
    const v = parseFloat(scontoVal) || 0
    if (v <= 0) { toast('Inserisci uno sconto valido', 'r'); return }
    try {
      const lordo = sel.totale_lordo
      const sEuro = scontoTipo === 'euro' ? v : 0
      const sPerc = scontoTipo === 'perc' ? v : 0
      const netto = Math.max(0, lordo - sEuro - lordo * sPerc / 100)
      await pb.collection('scontrini').update(sel.id, { sconto_euro: sEuro, sconto_perc: sPerc, totale_netto: netto })
      toast('Sconto applicato', 'b')
      setScontoVal('')
      const updated = await pb.collection('scontrini').getOne(sel.id)
      setSel(updated)
      caricaScontrini()
    } catch(e) { toast('Errore: ' + e.message, 'r') }
  }

  const filtrati = scontrini.filter(s =>
    cerca === '' || String(s.numero).includes(cerca) ||
    (s.note || '').toLowerCase().includes(cerca.toLowerCase())
  )

  const S = { // stili inline per rapidità
    head: { padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: '#1e293b', borderRadius: '16px 16px 0 0' },
    list: { width: 260, borderRight: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0 },
    detail: { flex: 1, overflowY: 'auto', padding: 16 },
    rigaItem: (stornata, omaggio) => ({
      display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px',
      borderBottom: '1px solid var(--border)',
      opacity: stornata ? .4 : 1,
      background: omaggio ? '#f0fdf4' : stornata ? '#fef2f2' : 'transparent',
      textDecoration: stornata ? 'line-through' : 'none'
    })
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 16, width: '94vw', maxWidth: 960, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
        {/* Header */}
        <div style={S.head}>
          <span style={{ fontFamily: 'Barlow Condensed', fontWeight: 800, fontSize: 18, color: 'var(--text)', flex: 1 }}>Storico Scontrini</span>
          <input value={cerca} onChange={e => setCerca(e.target.value)} placeholder="Cerca per numero..."
            style={{ background: '#334155', border: '1px solid #475569', borderRadius: 6, padding: '5px 10px', color: 'var(--text)', fontSize: 13, width: 160 }} />
          <button onClick={onClose} style={{ background: '#334155', border: 'none', color: '#94a3b8', borderRadius: 8, padding: '5px 14px', cursor: 'pointer', fontSize: 14 }}>✕ Chiudi</button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Lista scontrini */}
          <div style={S.list}>
            {loading && <div style={{ padding: 20, color: 'var(--text3)', fontSize: 13 }}>Caricamento...</div>}
            {filtrati.map(s => (
              <div key={s.id} onClick={() => selScontrino(s)} style={{
                padding: '10px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                background: sel?.id === s.id ? '#fff7ed' : 'transparent',
                borderLeft: sel?.id === s.id ? '3px solid var(--accent)' : '3px solid transparent',
                opacity: s.stornato ? .5 : 1
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ fontFamily: 'Barlow Condensed', fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>
                    #{String(s.numero).padStart(4,'0')}
                  </span>
                  {s.stornato && <span style={{ fontSize: 10, background: '#fee2e2', color: '#dc2626', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>STORNATO</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                  {new Date(s.data_ora).toLocaleString('it-IT', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                </div>
                <div style={{ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: 15, color: 'var(--accent2)', marginTop: 2 }}>
                  {EUR(s.totale_netto)} <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 400 }}>{s.tipo_pagamento}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Dettaglio */}
          <div style={S.detail}>
            {!sel ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text3)', fontSize: 14 }}>
                ← Seleziona uno scontrino
              </div>
            ) : (
              <>
                {/* Info scontrino */}
                <div style={{ background: 'var(--surf2)', borderRadius: 10, padding: 14, marginBottom: 14, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontFamily: 'Barlow Condensed', fontWeight: 900, fontSize: 22, color: 'var(--text)' }}>
                      Scontrino #{String(sel.numero).padStart(4,'0')}
                      {sel.stornato && <span style={{ marginLeft: 10, fontSize: 13, color: 'var(--red)', fontWeight: 700 }}>— STORNATO</span>}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>
                      {new Date(sel.data_ora).toLocaleString('it-IT')} · {sel.postazione}
                    </div>
                    {sel.note && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>Note: {sel.note}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Barlow Condensed', fontSize: 28, fontWeight: 900, color: 'var(--text)' }}>{EUR(sel.totale_netto)}</div>
                    {(sel.sconto_euro > 0 || sel.sconto_perc > 0) && (
                      <div style={{ fontSize: 12, color: 'var(--green)' }}>
                        Sconto: {sel.sconto_euro > 0 ? '- ' + EUR(sel.sconto_euro) : sel.sconto_perc + '%'}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: 'var(--text2)', textTransform: 'capitalize' }}>{sel.tipo_pagamento}</div>
                  </div>
                </div>

                {/* Righe scontrino */}
                <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '8px 14px', background: 'var(--surf2)', borderBottom: '1px solid var(--border)', fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                    Righe scontrino {loadingRighe && '(caricamento...)'}
                  </div>
                  {righe.length === 0 && !loadingRighe && (
                    <div style={{ padding: '14px', color: 'var(--text3)', fontSize: 13, textAlign: 'center' }}>Nessuna riga trovata</div>
                  )}
                  {righe.map(r => (
                    <div key={r.id} style={S.rigaItem(r.stornata, r.omaggio)}>
                      {/* Quantità modificabile */}
                      {!sel.stornato && !r.stornata && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                          <button onClick={() => handleCambiaQta(r, -1)}
                            style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surf2)', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                          <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{r.quantita}</span>
                          <button onClick={() => handleCambiaQta(r, +1)}
                            style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surf2)', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                        </div>
                      )}
                      {(sel.stornato || r.stornata) && (
                        <span style={{ minWidth: 50, textAlign: 'center', fontSize: 14, color: 'var(--text2)' }}>×{r.quantita}</span>
                      )}

                      {/* Nome prodotto */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {r.nome_snapshot}
                        </div>
                        {r.omaggio && <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700 }}>OMAGGIO</span>}
                        {r.stornata && <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700 }}>RIMOSSA</span>}
                        {r.note && <div style={{ fontSize: 11, color: 'var(--text2)' }}>{r.note}</div>}
                      </div>

                      {/* Prezzo */}
                      <span style={{ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: 15, color: r.omaggio ? 'var(--green)' : 'var(--accent2)', minWidth: 60, textAlign: 'right' }}>
                        {r.omaggio ? 'omaggio' : EUR(r.totale_riga)}
                      </span>

                      {/* Azioni riga */}
                      {!sel.stornato && !r.stornata && (
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button onClick={() => handleToggleOmaggio(r)}
                            title={r.omaggio ? 'Rimuovi omaggio' : 'Imposta omaggio'}
                            style={{ padding: '3px 7px', background: r.omaggio ? '#dcfce7' : '#f0fdf4', border: `1px solid ${r.omaggio ? '#86efac' : '#bbf7d0'}`, borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>
                            ??
                          </button>
                          <button onClick={() => handleStornaRiga(r)}
                            title="Rimuovi questa riga"
                            style={{ padding: '3px 7px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: 'var(--red)', fontWeight: 700 }}>
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Azioni scontrino */}
                {!sel.stornato && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                      <div style={{ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: 14, marginBottom: 10, color: 'var(--text)' }}>Applica sconto</div>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                        <input type="number" min="0" value={scontoVal} onChange={e => setScontoVal(e.target.value)}
                          placeholder="Valore" style={{ flex: 1, background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', fontSize: 15, color: 'var(--text)', minWidth: 0 }} />
                        <select value={scontoTipo} onChange={e => setScontoTipo(e.target.value)}
                          style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', fontSize: 13, color: 'var(--text)' }}>
                          <option value="euro">€</option>
                          <option value="perc">%</option>
                        </select>
                      </div>
                      <button onClick={handleApplicaSconto}
                        style={{ width: '100%', padding: 9, background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                        Applica sconto
                      </button>
                    </div>
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: 14, marginBottom: 10, color: 'var(--blue)' }}>Ristampa</div>
                      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10, lineHeight: 1.5, flex: 1 }}>
                        Ristampa lo scontrino con i dati attuali.
                      </div>
                      <button onClick={() => { if (righe.length === 0) { toast('Nessuna riga caricata', 'r'); return } stampaScontrino(sel, righe); toast('Ristampa avviata', 'b') }}
                        style={{ width: '100%', padding: 9, background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                        🖨 Ristampa
                      </button>
                    </div>
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: 14, marginBottom: 10, color: 'var(--red)' }}>Storno totale</div>
                      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10, lineHeight: 1.5, flex: 1 }}>
                        Annulla l'intero scontrino e ricarica il magazzino.
                      </div>
                      <button onClick={handleStorno}
                        style={{ width: '100%', padding: 9, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                        ↩ Storna scontrino
                      </button>
                    </div>
                  </div>
                )}
                {sel.stornato && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 14, textAlign: 'center', color: 'var(--red)', fontWeight: 600 }}>
                    Scontrino già stornato
                    {sel.data_storno && <div style={{ fontSize: 12, fontWeight: 400, marginTop: 4 }}>il {new Date(sel.data_storno).toLocaleString('it-IT')}</div>}
                    {sel.note_storno && <div style={{ fontSize: 12, fontWeight: 400 }}>Note: {sel.note_storno}</div>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}