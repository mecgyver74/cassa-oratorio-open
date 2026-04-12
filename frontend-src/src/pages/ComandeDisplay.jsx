import { useState, useEffect, useCallback } from 'react'
import pb from '../lib/pb'
import { getConf, setConf } from '../lib/config'

// ── QR Modal ─────────────────────────────────────────────────
function QrModal({ onClose }) {
  const url = `http://${window.location.hostname}:8090`
  const isLocalhost = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', display:'flex',
      alignItems:'center', justifyContent:'center', zIndex:1000 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'#1e293b', borderRadius:16, padding:28, textAlign:'center',
        border:'1px solid #334155', maxWidth:300 }}>
        <div style={{ fontFamily:'Barlow Condensed', fontWeight:900, fontSize:18, color:'#f59e0b', marginBottom:8 }}>
          Accesso da telefono
        </div>
        {isLocalhost && (
          <div style={{ background:'#450a0a', border:'1px solid #dc2626', borderRadius:6,
            padding:'6px 10px', marginBottom:10, fontSize:11, color:'#f87171' }}>
            Apri la cassa usando l'IP di rete (es. http://192.168.x.x:8090) per un QR funzionante.
          </div>
        )}
        <div style={{ fontSize:12, color:'#64748b', marginBottom:14, lineHeight:1.5 }}>
          Inquadra con la fotocamera.<br/>Stessa rete WiFi del PC.
        </div>
        <img src={qrSrc} alt="QR" style={{ width:220, height:220, borderRadius:8,
          border:'3px solid #334155', display:'block', margin:'0 auto' }} />
        <div style={{ marginTop:12, background:'#0f172a', borderRadius:8, padding:'6px 10px',
          fontSize:12, fontFamily:'monospace', color:'#94a3b8', wordBreak:'break-all' }}>{url}</div>
        <button onClick={onClose} style={{ marginTop:14, padding:'7px 24px', background:'#334155',
          border:'none', borderRadius:8, color:'#94a3b8', cursor:'pointer', fontWeight:600 }}>
          Chiudi
        </button>
      </div>
    </div>
  )
}

// ── Componente principale ─────────────────────────────────────
export default function ComandeDisplay() {
  const [comande, setComande]     = useState([])
  const [scontrini, setScontrini] = useState([])
  const [evaseDb, setEvaseDb]     = useState({})
  const [pronte, setPronte]       = useState({}) // { "rigaId_comandaId": record }
  const [loading, setLoading]     = useState(true)
  const [ultimoAggiorn, setUltimoAggiorn] = useState(null)
  const [qrOpen, setQrOpen]       = useState(false)
  const [dbPronteOk, setDbPronteOk] = useState(true)

  // Preferenze persistenti nel database
  const [filtroComande, setFiltroComande] = useState(new Set())
  const [ordineInvertito, setOrdineInvertito] = useState(false)
  const [vista, setVista] = useState('comande')
  const [prefLoaded, setPrefLoaded] = useState(false)

  // Carica preferenze dal DB all'avvio
  useEffect(() => {
    Promise.all([
      getConf('comande_filtro', []),
      getConf('comande_ordine', false),
      getConf('comande_vista', 'comande'),
    ]).then(([filtro, ordine, v]) => {
      if (Array.isArray(filtro) && filtro.length > 0) setFiltroComande(new Set(filtro))
      setOrdineInvertito(!!ordine)
      setVista(v || 'comande')
      setPrefLoaded(true)
    })
  }, [])

  // Salva preferenze quando cambiano (solo dopo il caricamento iniziale)
  useEffect(() => {
    if (!prefLoaded) return
    setConf('comande_filtro', [...filtroComande])
  }, [filtroComande, prefLoaded])
  useEffect(() => {
    if (!prefLoaded) return
    setConf('comande_ordine', ordineInvertito)
  }, [ordineInvertito, prefLoaded])
  useEffect(() => {
    if (!prefLoaded) return
    setConf('comande_vista', vista)
  }, [vista, prefLoaded])

  // ── Caricamento ──────────────────────────────────────────────
  const carica = useCallback(async () => {
    try {
      pb.autoCancellation(false)

      const [sc, com, evaseList, pronteList] = await Promise.all([
        pb.collection('scontrini').getFullList({ filter: `stornato=false`, sort: '-data_ora' }),
        pb.collection('comande').getFullList({ sort: 'ordine,nome', filter: 'abilitata=true' }),
        pb.collection('comande_evase').getFullList().catch(() => []),
        pb.collection('righe_pronte').getFullList().catch(() => null),
      ])

      if (pronteList === null) setDbPronteOk(false)
      else setDbPronteOk(true)

      let tutteLeRighe = []
      if (sc.length > 0) {
        const scIds = sc.map(s => `scontrino="${s.id}"`).join(' || ')
        tutteLeRighe = await pb.collection('righe_scontrino').getFullList({
          filter: `(${scIds}) && stornata=false`, expand: 'prodotto'
        })
      }

      pb.autoCancellation(true)

      const scConRighe = sc.map(s => ({
        ...s, righe: tutteLeRighe.filter(r => r.scontrino === s.id)
      }))

      const evMap = {}
      evaseList.forEach(e => { evMap[`${e.scontrino_id}_${e.comanda_id}`] = e })

      const prMap = {}
      if (pronteList) pronteList.forEach(p => { prMap[`${p.riga_id}_${p.comanda_id}`] = p })

      setComande(com)
      setScontrini(scConRighe)
      setEvaseDb(evMap)
      setPronte(prMap)
      setUltimoAggiorn(new Date())
      setLoading(false)
    } catch(e) {
      console.error(e)
      pb.autoCancellation(true)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carica()
    const interval = setInterval(carica, 8000)
    let subs = []
    pb.collection('scontrini').subscribe('*', () => carica()).then(u => subs.push(u)).catch(() => {})
    pb.collection('comande_evase').subscribe('*', () => carica()).then(u => subs.push(u)).catch(() => {})
    if (dbPronteOk) {
      pb.collection('righe_pronte').subscribe('*', () => carica()).then(u => subs.push(u)).catch(() => {})
    }
    return () => {
      clearInterval(interval)
      subs.forEach(u => u && u())
      pb.collection('scontrini').unsubscribe('*').catch(() => {})
      pb.collection('comande_evase').unsubscribe('*').catch(() => {})
      pb.collection('righe_pronte').unsubscribe('*').catch(() => {})
    }
  }, [carica, dbPronteOk])

  // ── Toggle evasa ─────────────────────────────────────────────
  const toggleEvasa = async (scontrinoId, comandaId) => {
    const key = `${scontrinoId}_${comandaId}`
    const existing = evaseDb[key]
    try {
      pb.autoCancellation(false)
      if (existing) {
        await pb.collection('comande_evase').delete(existing.id)
        setEvaseDb(prev => { const n={...prev}; delete n[key]; return n })
      } else {
        const rec = await pb.collection('comande_evase').create({
          scontrino_id: scontrinoId, comanda_id: comandaId,
          evasa_at: new Date().toISOString()
        })
        setEvaseDb(prev => ({ ...prev, [key]: rec }))
      }
      pb.autoCancellation(true)
    } catch(e) {
      pb.autoCancellation(true)
      console.error('Errore toggle evasa:', e)
    }
  }

  // ── Toggle riga pronta ────────────────────────────────────────
  const togglePronta = async (rigaId, comandaId) => {
    if (!dbPronteOk) return
    const key = `${rigaId}_${comandaId}`
    const existing = pronte[key]
    try {
      pb.autoCancellation(false)
      if (existing) {
        await pb.collection('righe_pronte').delete(existing.id)
        setPronte(prev => { const n={...prev}; delete n[key]; return n })
      } else {
        const rec = await pb.collection('righe_pronte').create({
          riga_id: rigaId, comanda_id: comandaId,
          pronta_at: new Date().toISOString()
        })
        setPronte(prev => ({ ...prev, [key]: rec }))
      }
      pb.autoCancellation(true)
    } catch(e) {
      pb.autoCancellation(true)
      console.error('Errore toggle pronta:', e)
    }
  }

  const isEvasa = (scId, comId) => !!evaseDb[`${scId}_${comId}`]
  const isPronta = (rigaId, comId) => !!pronte[`${rigaId}_${comId}`]

  // ── Filtri ───────────────────────────────────────────────────
  const getRighePerComanda = (scontrino, comanda) => {
    let famIds = comanda.famiglie_ids || []
    if (typeof famIds === 'string') { try { famIds = JSON.parse(famIds) } catch { famIds = [] } }
    if (!Array.isArray(famIds) || famIds.length === 0) return []
    return scontrino.righe.filter(r => {
      const prod = r.expand?.prodotto
      return prod && famIds.includes(prod.famiglia)
    })
  }

  const tuttoSelezionato = filtroComande.size === 0
  const comandeDaMostrare = tuttoSelezionato ? comande : comande.filter(c => filtroComande.has(c.id))

  const toggleFiltro = (id) => setFiltroComande(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  const items = []
  for (const sc of scontrini) {
    for (const com of comandeDaMostrare) {
      const righe = getRighePerComanda(sc, com)
      if (!righe.length) continue
      items.push({ scontrino: sc, comanda: com, righe, evasa: isEvasa(sc.id, com.id) })
    }
  }

  let pendenti   = items.filter(i => !i.evasa)
  let completate = items.filter(i => i.evasa)
  if (ordineInvertito) { pendenti = [...pendenti].reverse(); completate = [...completate].reverse() }

  // Riepilogo prodotti pendenti
  const riepilogo = {}
  pendenti.forEach(({ righe }) => {
    righe.forEach(r => {
      const k = r.nome_snapshot
      if (!riepilogo[k]) riepilogo[k] = { nome: k, qta: 0, note: [] }
      riepilogo[k].qta += r.quantita
      if (r.note) riepilogo[k].note.push(r.note)
    })
  })
  const riepilogoList = Object.values(riepilogo).sort((a,b) => b.qta - a.qta)

  return (
    <div style={{ background:'#1a1a2e', height:'100%', display:'flex', flexDirection:'column',
      fontFamily:'Barlow, sans-serif', color:'#e2e8f0', overflow:'hidden' }}>
      {qrOpen && <QrModal onClose={() => setQrOpen(false)} />}

      {/* Header */}
      <div style={{ background:'#16213e', padding:'8px 12px', display:'flex', alignItems:'center',
        gap:8, flexWrap:'wrap', boxShadow:'0 2px 8px rgba(0,0,0,.3)', flexShrink:0 }}>
        <div style={{ fontFamily:'Barlow Condensed', fontWeight:900, fontSize:18, color:'#f59e0b' }}>
          COMANDE LIVE
        </div>
        <div style={{ background:'#dc2626', borderRadius:6, padding:'2px 10px',
          fontFamily:'Barlow Condensed', fontWeight:800, fontSize:14 }}>
          {pendenti.length} in attesa
        </div>
        <div style={{ background:'#16a34a', borderRadius:6, padding:'2px 10px',
          fontFamily:'Barlow Condensed', fontWeight:800, fontSize:14 }}>
          {completate.length} evase
        </div>
        <div style={{ flex:1 }} />

        {/* Filtro comande */}
        <div style={{ display:'flex', gap:4, flexWrap:'wrap', alignItems:'center' }}>
          <button onClick={() => setFiltroComande(new Set())}
            style={{ padding:'3px 10px', borderRadius:16, border:'none', cursor:'pointer',
              background: tuttoSelezionato ? '#f59e0b' : '#334155',
              color: tuttoSelezionato ? '#000' : '#94a3b8',
              fontFamily:'Barlow Condensed', fontWeight:700, fontSize:12 }}>
            Tutte
          </button>
          {comande.map(c => {
            const on = filtroComande.has(c.id)
            return (
              <button key={c.id} onClick={() => toggleFiltro(c.id)}
                style={{ padding:'3px 10px', borderRadius:16, cursor:'pointer',
                  border:`2px solid ${on ? (c.colore||'#f59e0b') : 'transparent'}`,
                  background: on ? (c.colore||'#f59e0b') : '#334155',
                  color: on ? '#fff' : '#94a3b8',
                  fontFamily:'Barlow Condensed', fontWeight:700, fontSize:12 }}>
                {on ? '✓ ' : ''}{c.nome}
              </button>
            )
          })}
        </div>

        {/* Controlli */}
        <div style={{ display:'flex', gap:4 }}>
          <button onClick={() => setVista(v => v==='comande' ? 'riepilogo' : 'comande')}
            style={{ padding:'4px 10px', background: vista==='riepilogo' ? '#f59e0b' : '#334155',
              border:'none', borderRadius:6, color: vista==='riepilogo' ? '#000' : '#94a3b8',
              cursor:'pointer', fontFamily:'Barlow Condensed', fontWeight:700, fontSize:12 }}>
            {vista==='comande' ? '≡ Riepilogo' : '◧ Comande'}
          </button>
          <button onClick={() => setOrdineInvertito(o => !o)}
            style={{ padding:'4px 10px', background: ordineInvertito ? '#475569' : '#334155',
              border:'none', borderRadius:6, color:'#94a3b8', cursor:'pointer', fontSize:13 }}
            title={ordineInvertito ? 'Dal piu recente' : 'Dal piu vecchio'}>
            {ordineInvertito ? '↑' : '↓'}
          </button>
          <button onClick={carica}
            style={{ padding:'4px 10px', background:'#334155', border:'none',
              borderRadius:6, color:'#94a3b8', cursor:'pointer', fontSize:14 }}>↻</button>
          <button onClick={() => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {})
            else document.exitFullscreen().catch(() => {})
          }} style={{ padding:'4px 10px', background:'#334155', border:'none',
            borderRadius:6, color:'#94a3b8', cursor:'pointer', fontSize:14 }}
            title="Schermo intero">⛶</button>
          <button onClick={() => setQrOpen(true)}
            style={{ padding:'4px 10px', background:'#334155', border:'none',
              borderRadius:6, color:'#94a3b8', cursor:'pointer', fontSize:14 }}
            title="QR Code">📱</button>
        </div>
        {ultimoAggiorn && (
          <span style={{ fontSize:10, color:'#475569' }}>
            {ultimoAggiorn.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
          </span>
        )}
      </div>

      {/* ── Vista Riepilogo ───────────────────────────────── */}
      {vista === 'riepilogo' && (
        <div style={{ flex:1, overflowY:'auto', padding:'10px 12px' }}>
          <div style={{ marginBottom:10, fontSize:12, color:'#64748b' }}>
            Prodotti da preparare (comande non evase)
          </div>
          {riepilogoList.length === 0 && (
            <div style={{ textAlign:'center', padding:40, color:'#475569', fontSize:16 }}>
              Nessun prodotto in attesa
            </div>
          )}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
            {riepilogoList.map(p => (
              <div key={p.nome} style={{ background:'#1e293b', borderRadius:10,
                padding:'12px 16px', border:'1px solid #334155' }}>
                <div style={{ fontFamily:'Barlow Condensed', fontWeight:700, fontSize:16,
                  color:'#e2e8f0', marginBottom:6 }}>{p.nome}</div>
                <div style={{ fontFamily:'Barlow Condensed', fontWeight:900,
                  fontSize:36, color:'#f59e0b', lineHeight:1 }}>{p.qta}×</div>
                {p.note.length > 0 && (
                  <div style={{ marginTop:6, fontSize:11, color:'#64748b', fontStyle:'italic' }}>
                    {[...new Set(p.note)].join(' · ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Vista Comande ─────────────────────────────────── */}
      {vista === 'comande' && (
        <div style={{ flex:1, overflowY:'auto', padding:'10px 12px' }}>
          {loading && <div style={{ textAlign:'center', padding:40, color:'#64748b' }}>Caricamento...</div>}
          {pendenti.length === 0 && !loading && (
            <div style={{ textAlign:'center', padding:40, color:'#475569', fontSize:16 }}>
              Nessuna comanda in attesa
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',
            gap:10, marginBottom: completate.length ? 16 : 0 }}>
            {pendenti.map(({ scontrino:sc, comanda:com, righe }) => {
              const tuttePronte = righe.every(r => isPronta(r.id, com.id))
              return (
                <div key={`${sc.id}_${com.id}`}
                  style={{ background:'#1e293b', borderRadius:10, overflow:'hidden',
                    border: `2px solid ${tuttePronte ? '#16a34a' : '#dc2626'}`,
                    boxShadow: tuttePronte
                      ? '0 3px 12px rgba(22,163,74,.3)'
                      : '0 3px 12px rgba(220,38,38,.2)' }}>
                  <div style={{ background:com.colore||'#dc2626', padding:'6px 12px',
                    display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ fontFamily:'Barlow Condensed', fontWeight:900,
                      fontSize:16, color:'#fff', flex:1 }}>{com.nome.toUpperCase()}</div>
                    <div style={{ fontFamily:'Barlow Condensed', fontWeight:800,
                      fontSize:20, color:'#fff' }}>#{String(sc.numero).padStart(4,'0')}</div>
                  </div>
                  <div style={{ padding:'4px 12px', background: sc.asporto ? '#78350f' : '#0f172a',
                    display:'flex', justifyContent:'space-between', fontSize:11, color:'#64748b',
                    alignItems:'center', gap:6 }}>
                    <span>{new Date(sc.data_ora).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}</span>
                    {sc.asporto && (
                      <span style={{ color:'#f59e0b', fontWeight:900, fontSize:13,
                        background:'#92400e', padding:'1px 8px', borderRadius:4 }}>
                        🥡 ASPORTO
                      </span>
                    )}
                    {sc.tavolo && !sc.asporto && (
                      <span style={{ color:'#f59e0b', fontWeight:700 }}>🪑 T.{sc.tavolo}</span>
                    )}
                    {sc.note && <span style={{ fontStyle:'italic', color:'#94a3b8' }}>{sc.note}</span>}
                  </div>

                  {/* Righe con spunte */}
                  <div style={{ padding:'6px 12px' }}>
                    {righe.map((r, i) => {
                      const pronta = isPronta(r.id, com.id)
                      return (
                        <div key={i}
                          onClick={() => togglePronta(r.id, com.id)}
                          style={{ padding:'5px 0',
                            borderBottom: i < righe.length-1 ? '1px solid #334155' : 'none',
                            display:'flex', gap:10, alignItems:'baseline',
                            cursor:'pointer', opacity: pronta ? 0.5 : 1,
                            textDecoration: pronta ? 'line-through' : 'none',
                            transition:'opacity .2s' }}>
                          <span style={{ fontFamily:'Barlow Condensed', fontWeight:900,
                            fontSize:22, color: pronta ? '#16a34a' : '#f59e0b',
                            minWidth:30, textAlign:'right', flexShrink:0 }}>
                            {pronta ? '✓' : `${r.quantita}×`}
                          </span>
                          <div>
                            <div style={{ fontFamily:'Barlow Condensed', fontWeight:700,
                              fontSize:16, color: pronta ? '#64748b' : '#e2e8f0' }}>
                              {r.nome_snapshot}
                            </div>
                            {r.note && <div style={{ fontSize:11, color:'#94a3b8', fontStyle:'italic' }}>{r.note}</div>}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Footer */}
                  {tuttePronte && (
                    <div style={{ padding:'4px 12px', background:'#052e16',
                      fontSize:12, color:'#4ade80', textAlign:'center', fontWeight:700 }}>
                      Tutti pronti — segna come evasa
                    </div>
                  )}
                  <div style={{ padding:'6px 12px 12px' }}>
                    <button onClick={() => toggleEvasa(sc.id, com.id)}
                      style={{ width:'100%', padding:10,
                        background: tuttePronte ? '#16a34a' : '#1e3a5f',
                        color:'#fff', border:'none', borderRadius:8,
                        fontFamily:'Barlow Condensed', fontWeight:800, fontSize:16,
                        cursor:'pointer', transition:'background .2s' }}>
                      {tuttePronte ? '✓ EVASA' : 'Segna come evasa'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Evase */}
          {completate.length > 0 && (
            <>
              <div style={{ fontSize:11, color:'#334155', fontWeight:700,
                textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>
                — Evase ({completate.length}) —
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:6 }}>
                {completate.map(({ scontrino:sc, comanda:com, righe }) => (
                  <div key={`${sc.id}_${com.id}_done`}
                    style={{ background:'#0f172a', borderRadius:8, overflow:'hidden',
                      border:'1px solid #1e293b', opacity:0.55 }}>
                    <div style={{ background:'#1e293b', padding:'5px 12px',
                      display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ color:'#16a34a', fontSize:13 }}>✓</span>
                      <div style={{ fontFamily:'Barlow Condensed', fontWeight:700,
                        fontSize:14, color:'#64748b', flex:1 }}>
                        {com.nome} · #{String(sc.numero).padStart(4,'0')}
                      </div>
                      <button onClick={() => toggleEvasa(sc.id, com.id)}
                        style={{ background:'none', border:'1px solid #334155',
                          borderRadius:5, color:'#475569', padding:'2px 7px',
                          cursor:'pointer', fontSize:11 }}>riapri</button>
                    </div>
                    <div style={{ padding:'3px 12px 6px', fontSize:12, color:'#475569' }}>
                      {righe.map((r,i) => <span key={i}>{i>0?', ':''}{r.quantita}× {r.nome_snapshot}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
