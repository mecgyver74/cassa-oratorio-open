import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import pb from '../lib/pb'
import { useCassa } from '../lib/useCassa'
import ModalePagamento from '../components/ModalePagamento'
import ModaleStorico from '../components/ModaleStorico'
import { useToast } from '../components/Toast'
import { getConf, setConf } from '../lib/config'
import { fsPrompt } from '../lib/fullscreen'

const EUR = v => '€ ' + Number(v).toFixed(2).replace('.', ',')

export default function Cassa({ utente }) {
  const toast = useToast()
  const cassa = useCassa()

  const [famiglie, setFamiglie] = useState([])
  const [prodotti, setProdotti] = useState([])
  const [menu, setMenu] = useState([])
  const famSelKey = `cassa_fam_sel_${utente?.id}`
  const [famSel, setFamSel] = useState(() => {
    try { return JSON.parse(localStorage.getItem(famSelKey)) || [] } catch { return [] }
  })
  const [tabSel, setTabSel] = useState('prodotti')
  const [pagOpen, setPagOpen] = useState(false)
  const [storicoOpen, setStoricoOpen] = useState(false)
  const [nextNum, setNextNum] = useState('—')
  const [asporto, setAsporto] = useState(false)
  const [scontoV, setScontoV] = useState('')
  const [scontoT, setScontoT] = useState('€')
  const [ingDropKey, setIngDropKey] = useState(null) // key della riga con dropdown ingredienti aperto
  const [pendingSplitProd, setPendingSplitProd] = useState(null) // prodotto_id appena splittato

  // Dopo uno split, apri il dropdown sulla nuova riga creata
  useEffect(() => {
    if (!pendingSplitProd) return
    const nuova = cassa.righe.find(x => x._prodotto_id === pendingSplitProd && x.quantita === 1 && !x.note)
    if (nuova) {
      setIngDropKey(nuova._key)
      setPendingSplitProd(null)
    }
  }, [cassa.righe, pendingSplitProd])

  useEffect(() => { localStorage.setItem(famSelKey, JSON.stringify(famSel)) }, [famSel, famSelKey])

  // Impostazioni aspetto pulsanti (da Setup → Aspetto) — caricati dal DB
  const [dispCfg, setDispCfg] = useState({})
  useEffect(() => { getConf('cassa_display', {}).then(setDispCfg) }, [])
  const nomeFontSize      = dispCfg.nomeFontSize   ?? 14
  const prezzoFontSize    = dispCfg.prezzoFontSize ?? 12
  const btnHeight         = dispCfg.btnHeight      ?? 90
  const btnWidth          = dispCfg.btnWidth       ?? 130
  const colNome           = dispCfg.colNome        ?? '#ffffff'
  const gapX              = dispCfg.gapX           ?? 6
  const gapY              = dispCfg.gapY           ?? 6
  const colPrezzo         = dispCfg.colPrezzo        ?? '#ffffff'
  const colGiacenza       = dispCfg.colGiacenza      ?? '#ffffffaa'
  const giacenzaFontSize  = dispCfg.giacenzaFontSize ?? 10
  const lineGap           = dispCfg.lineGap          ?? 4
  const refreshIntervalSec = dispCfg.refreshInterval ?? 30

  // Divisore trascinabile
  const [scontrWidth, setScontrWidth] = useState(340)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startW = useRef(0)

  // Carica larghezza scontrino dal DB
  useEffect(() => { getConf('cassa_scont_width', 340).then(v => { if (v >= 280) setScontrWidth(v) }) }, [])

  const startDrag = useCallback(e => {
    dragging.current = true
    startX.current = e.clientX
    startW.current = scontrWidth
  }, [scontrWidth])

  useEffect(() => {
    const onMove = e => {
      if (!dragging.current) return
      const delta = startX.current - e.clientX
      const newW = Math.max(260, Math.min(600, startW.current + delta))
      setScontrWidth(newW)
    }
    const onUp = () => {
      if (dragging.current) {
        dragging.current = false
        localStorage.setItem('cassa_scont_width', String(scontrWidth))
        setConf('cassa_scont_width', scontrWidth)
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [scontrWidth])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [fam, prod, mn, ultSc] = await Promise.all([
          pb.collection('famiglie').getFullList({ sort: 'ordine,nome', filter: 'attivo=true' }),
          pb.collection('prodotti').getFullList({ sort: 'ordine,nome', filter: 'attivo=true', expand: 'magazzino_comune,famiglia' }),
          pb.collection('menu').getFullList({ sort: 'ordine,nome', filter: 'attivo=true' }),
          pb.collection('scontrini').getList(1, 1, { sort: '-numero', fields: 'numero' }).catch(() => ({ items: [] })),
        ])
        if (cancelled) return
        setFamiglie(fam)
        setProdotti(prod)
        setMenu(mn)
        setNextNum((ultSc.items[0]?.numero || 0) + 1)
      } catch(e) {
        if (e?.isAbort || e?.message?.includes('autocancelled')) return
        console.error('Caricamento cassa:', e)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Ref sempre aggiornato alle righe correnti — usato dentro ricaricaProdotti senza dipendenze
  const righeRef = useRef(cassa.righe)
  useEffect(() => { righeRef.current = cassa.righe }, [cassa.righe])

  const [giacenzaWarning, setGiacenzaWarning] = useState([])

  const ricaricaProdotti = useCallback(async () => {
    try {
      const prod = await pb.collection('prodotti').getFullList({ sort: 'ordine,nome', filter: 'attivo=true', expand: 'magazzino_comune,famiglia' })
      setProdotti(prod)

      // Controlla se qualche prodotto nel carrello ha ora giacenza insufficiente
      const righe = righeRef.current
      if (righe.length === 0) return
      const problemi = []
      const visti = new Set()
      for (const riga of righe) {
        if (!riga._prodotto_id || visti.has(riga._prodotto_id)) continue
        visti.add(riga._prodotto_id)
        const p = prod.find(x => x.id === riga._prodotto_id)
        if (!p) continue
        const qtaDisp = p.expand?.magazzino_comune
          ? p.expand.magazzino_comune.quantita
          : p.quantita
        if (qtaDisp < 0) continue // scorta infinita
        const qtaCarrello = righe
          .filter(r => r._prodotto_id === riga._prodotto_id)
          .reduce((s, r) => s + r.quantita, 0)
        if (qtaCarrello > qtaDisp) {
          problemi.push({ nome: riga.nome_snapshot, qtaCarrello, qtaDisp })
        }
      }
      if (problemi.length > 0) setGiacenzaWarning(problemi)
    } catch(e) {
      if (e?.isAbort || e?.message?.includes('autocancelled')) return
    }
  }, [])

  // Ref per tenere traccia dell'ultimo refresh manuale ed evitare doppi aggiornamenti ravvicinati
  const lastManualRefreshRef = useRef(0)

  useEffect(() => {
    if (refreshIntervalSec <= 0) return
    const ms = refreshIntervalSec * 1000
    const id = setInterval(() => {
      if (Date.now() - lastManualRefreshRef.current < ms / 2) return
      ricaricaProdotti()
    }, ms)
    return () => clearInterval(id)
  }, [refreshIntervalSec, ricaricaProdotti])

  const getScortaDisplay = (p) => {
    if (p.expand?.magazzino_comune) {
      const mc = p.expand.magazzino_comune
      return { qty: mc.quantita, low: mc.quantita <= mc.soglia_allarme, label: mc.nome, inf: false }
    }
    const inf = p.quantita < 0
    return { qty: p.quantita, low: !inf && p.quantita <= p.soglia_allarme, label: null, inf }
  }

  const applicaSconto = () => {
    const v = parseFloat(scontoV) || 0
    if (scontoT === '%') { cassa.setScontoPerc(v); cassa.setScontoEuro(0) }
    else { cassa.setScontoEuro(v); cassa.setScontoPerc(0) }
    if (v > 0) toast('Sconto applicato', 'b')
  }

  const svuotaCompleto = useCallback(() => {
    cassa.svuota()
    setScontoV('')
    setScontoT('€')
  }, [cassa])

  const handlePaga = async (params) => {
    const res = await cassa.pagaeSalva({ ...params, utente, asporto })
    if (res.ok) {
      toast(`Scontrino #${res.numero} pagato`, 'v')
      setNextNum(res.numero + 1)
      setPagOpen(false)
      setAsporto(false)
      setScontoV('')
      setScontoT('€')
      lastManualRefreshRef.current = Date.now()
      ricaricaProdotti()
    } else {
      toast('Errore: ' + res.error, 'r')
    }
  }

  const handleStorno = async () => {
    const note = fsPrompt('Note storno (opzionale):') ?? ''
    const ultimi = await pb.collection('scontrini').getList(1, 1, { sort: '-numero', filter: 'stornato=false && sessione=""' }).catch(() => ({ items: [] }))
    if (!ultimi.items.length) { toast('Nessuno scontrino da stornare', 'r'); return }
    const res = await cassa.stornoScontrino(ultimi.items[0].id, note)
    if (res.ok) { toast('Scontrino stornato', 'r'); lastManualRefreshRef.current = Date.now(); ricaricaProdotti() }
    else toast('Errore: ' + res.error, 'r')
  }

  const sub = cassa.getSub()
  const sconto = cassa.getScontoCalcolato()
  const totale = cassa.getTotale()

  // Righe scontrino ordinate per famiglia (stesso ordine della cassa)
  const righeOrdinate = useMemo(() => {
    if (cassa.righe.length === 0 || famiglie.length === 0) return cassa.righe
    const famOrdine = {}
    famiglie.forEach((f, i) => { famOrdine[f.id] = i })
    return [...cassa.righe].sort((a, b) => {
      const oa = famOrdine[a._famId] ?? 999
      const ob = famOrdine[b._famId] ?? 999
      if (oa !== ob) return oa - ob
      // Stessa famiglia: ordine nome prodotto
      return (a.nome_snapshot || '').localeCompare(b.nome_snapshot || '')
    })
  }, [cassa.righe, famiglie])

  // Prodotti raggruppati per famiglia
  const renderProdotti = () => {
    // Calcola l'elenco famiglie da mostrare
    const famDaMostrare = famSel.length > 0
      ? famiglie.filter(f => famSel.includes(f.id))
      : famiglie

    const famConProdotti = famDaMostrare.map(f => ({
      fam: f,
      prods: prodotti.filter(p => p.famiglia === f.id && !p.solo_menu)
    })).filter(g => g.prods.length > 0)

    const senzaFam = famSel.length === 0
      ? prodotti.filter(p => !p.famiglia && !p.solo_menu)
      : []

    // Con una sola famiglia selezionata non mostrare l'header di gruppo
    const mostraHeader = famSel.length !== 1

    return (
      <>
        {famConProdotti.map(({ fam, prods }) => (
          <div key={fam.id}>
            {mostraHeader && (
              <div style={{
                padding: '4px 8px', fontSize: 11, fontWeight: 800,
                color: colNome, background: fam.colore || 'var(--text3)',
                borderRadius: 4, margin: '6px 0 4px',
                display: 'inline-block', letterSpacing: '.5px', textTransform: 'uppercase'
              }}>{fam.nome}</div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: gapX, rowGap: gapY, alignContent: 'start' }}>
              {renderBotoni(prods)}
            </div>
          </div>
        ))}
        {senzaFam.length > 0 && (
          <div className="prodotti-grid" style={{ padding: 0 }}>
            {renderBotoni(senzaFam)}
          </div>
        )}
      </>
    )
  }

  const renderGriglia = (lista) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: gapX, rowGap: gapY, alignContent: 'start' }}>
      {renderBotoni(lista)}
    </div>
  )

  const renderBotoni = (lista) => lista.map(p => {
    const sc = getScortaDisplay(p)
    const esaurito = !sc.inf && sc.qty <= 0
    const fam = famiglie.find(f => f.id === p.famiglia)
    const bgColor = p.colore || fam?.colore || '#6b7280'
    return (
      <button key={p.id} className={`prod-btn ${esaurito ? 'esaurito' : ''}`}
        style={{ background: bgColor, boxShadow: `0 3px 10px ${bgColor}44`,
          height: btnHeight, minHeight: btnHeight,
          width: btnWidth, minWidth: btnWidth,
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: lineGap }}
        onClick={() => { if (!esaurito) { cassa.addProdotto(p, msg => toast(msg, 'r')) } }}>
        <div className="pn" style={{ fontSize: nomeFontSize, color: colNome }}>{p.nome}</div>
        <div className="pp" style={{ fontSize: prezzoFontSize, color: colPrezzo }}>{EUR(p.prezzo)}</div>
        <div className={`ps ${sc.low ? 'low' : ''}`} style={{ color: colGiacenza, fontSize: giacenzaFontSize }}>
          {sc.inf ? '∞' : esaurito ? 'ESAURITO' : `Scorta: ${sc.qty}${sc.label ? ' ('+sc.label+')' : ''}`}
        </div>
      </button>
    )
  })

  return (
    <div style={{ display:'flex', flexDirection: window.innerWidth < 700 ? 'column' : 'row', height:'calc(100vh - 50px)', overflow:'hidden' }}>

      {/* POPUP GIACENZA INSUFFICIENTE */}
      {giacenzaWarning.length > 0 && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,.55)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--surf)', borderRadius: 16, padding: '28px 32px',
            maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,.4)',
            border: '2px solid var(--red)',
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--red)', marginBottom: 8 }}>
              ⚠️ Scorta insufficiente
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
              Un'altra cassa ha venduto dei prodotti presenti in questo scontrino:
            </div>
            {giacenzaWarning.map((w, i) => (
              <div key={i} style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 8, padding: '10px 14px', marginBottom: 8,
                fontSize: 14,
              }}>
                <strong>{w.nome}</strong>
                <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 2 }}>
                  Nel carrello: {w.qtaCarrello} pz — Disponibili ora: {w.qtaDisp} pz
                </div>
              </div>
            ))}
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>
              Riduci la quantità prima di procedere al pagamento.
            </div>
            <button
              onClick={() => setGiacenzaWarning([])}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
                background: 'var(--red)', color: '#fff', fontWeight: 700,
                fontSize: 15, cursor: 'pointer',
              }}>
              Capito
            </button>
          </div>
        </div>
      )}

      {/* SINISTRA - Prodotti */}
      <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Famiglie */}
        <div className="famiglie-bar">
          <button className={`fam-btn ${famSel.length === 0 ? 'active' : ''}`}
            onClick={() => setFamSel([])}>Tutti</button>
          {famiglie.map(f => {
            const attiva = famSel.includes(f.id)
            return (
              <button key={f.id} className={`fam-btn ${attiva ? 'active' : ''}`}
                style={attiva
                  ? { background: f.colore || 'var(--accent)', borderColor: f.colore || 'var(--accent)', color: colNome }
                  : { borderColor: f.colore || 'var(--accent)', color: colNome }}
                onClick={() => setFamSel(prev =>
                  prev.includes(f.id) ? prev.filter(x => x !== f.id) : [...prev, f.id]
                )}>{f.nome}</button>
            )
          })}
        </div>

        {/* Tab prodotti/menu */}
        <div className="prodotti-tabs">
          <button className={`prodotti-tab ${tabSel === 'prodotti' ? 'active' : ''}`} onClick={() => setTabSel('prodotti')}>Prodotti</button>
          <button className={`prodotti-tab ${tabSel === 'menu' ? 'active' : ''}`} onClick={() => setTabSel('menu')}>Menu</button>
        </div>

        {/* Griglia */}
        <div style={{ flex:1, overflowY:'auto', padding:'8px 8px 0' }}>
          {tabSel === 'prodotti' && renderProdotti()}
          {tabSel === 'menu' && (
            <div className="prodotti-grid" style={{ padding: 0 }}>
              {menu.map(m => (
                <button key={m.id} className="prod-btn"
                  style={{ background: m.colore || '#1d4ed8', boxShadow: `0 3px 10px ${m.colore||'#1d4ed8'}44`, color:'#fff' }}
                  onClick={() => { cassa.addMenu(m); toast('+' + m.nome, 'v') }}>
                  <div className="pn">{m.nome}</div>
                  <div className="pp">{EUR(m.prezzo)}</div>
                  <div className="ps">Menu</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DIVISORE TRASCINABILE */}
      <div
        style={{ width:5, flexShrink:0, background:'var(--border)', cursor:'col-resize',
          display:'flex', alignItems:'center', justifyContent:'center', transition:'background .15s' }}
        onMouseDown={startDrag}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--accent)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--border)'}
        title="Trascina per ridimensionare"
      />

      {/* DESTRA - Scontrino */}
      <div className="panel-scontrino" style={{ width: window.innerWidth < 700 ? "100%" : scontrWidth }}>
        <div className="scont-head">
          <h2>Scontrino</h2>
          <span className="scont-num">#{String(nextNum).padStart(4,'0')}</span>
          <button className="scont-tavolo-btn" onClick={() => {
            const t = fsPrompt('Tavolo o nome cliente:'); if (t) cassa.setTavolo({ id: null, numero: t })
          }}>
            {cassa.tavolo ? `T.${cassa.tavolo.numero}` : '+ Tavolo/Nome'}
          </button>
          <button className="scont-tavolo-btn" onClick={() => setAsporto(a => !a)}
            style={{ background: asporto ? '#f59e0b' : '', color: asporto ? '#000' : '',
              fontWeight: asporto ? 800 : 400 }}>
            {asporto ? '🥡 Asporto' : '🥡'}
          </button>
        </div>

        <div className="righe-scont">
          {righeOrdinate.length === 0
            ? <div className="riga-vuota">Seleziona prodotti →</div>
            : righeOrdinate.map(r => (
              <div key={r._key} className={`riga ${r.omaggio ? 'omaggio' : ''}`}>
                <div className="riga-info" style={{ position: 'relative' }}>
                  <div className="riga-nome"
                    onDoubleClick={() => {
                      const n = fsPrompt('Nota per questa riga:', r.note || '')
                      if (n !== null) cassa.setNoteRiga(r._key, n)
                    }}
                    title="Doppio click per aggiungere nota"
                  >
                    {r.nome_snapshot}
                    {r.note && <span style={{ fontSize:10, color:'var(--accent)', marginLeft:4 }}>📝</span>}
                    {r._ingredienti && r._ingredienti.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (r.quantita > 1) {
                            cassa.splitRiga(r._key)
                            setPendingSplitProd(r._prodotto_id)
                          } else {
                            setIngDropKey(ingDropKey === r._key ? null : r._key)
                          }
                        }}
                        style={{ marginLeft: 4, padding: '0 4px', fontSize: 11, background: r.note && r.note.includes('no ') ? '#fef3c7' : 'var(--surf2)',
                          border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text2)', verticalAlign: 'middle' }}
                        title={r.quantita > 1 ? "Separa 1 unità per personalizzare" : "Personalizza ingredienti"}
                      >🔧</button>
                    )}
                  </div>
                  {/* Dropdown ingredienti */}
                  {ingDropKey === r._key && r._ingredienti && r._ingredienti.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, zIndex: 50,
                      background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8,
                      boxShadow: '0 8px 24px rgba(0,0,0,.15)', padding: '6px 0', minWidth: 180,
                    }}>
                      <div style={{ padding: '4px 12px', fontSize: 11, color: 'var(--text3)', fontWeight: 700, borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                        Escludi ingredienti:
                      </div>
                      {r._ingredienti.map(ing => {
                        const noteAttuali = r.note || ''
                        const escluso = noteAttuali.toLowerCase().includes('no ' + ing.toLowerCase())
                        return (
                          <div key={ing}
                            onClick={() => {
                              let note = noteAttuali
                              if (escluso) {
                                // Rimuovi "no ingrediente" dalla nota
                                note = note.replace(new RegExp(',?\\s*no ' + ing.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').replace(/^,\s*/, '').trim()
                              } else {
                                // Aggiungi "no ingrediente"
                                note = note ? note + ', no ' + ing : 'no ' + ing
                              }
                              cassa.setNoteRiga(r._key, note)
                            }}
                            style={{
                              padding: '5px 12px', cursor: 'pointer', fontSize: 13,
                              display: 'flex', alignItems: 'center', gap: 8,
                              background: escluso ? '#fef2f2' : 'transparent',
                            }}
                          >
                            <span style={{ width: 16, height: 16, borderRadius: 3, border: '1.5px solid var(--border)',
                              background: escluso ? 'var(--red)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                              {escluso ? '✕' : ''}
                            </span>
                            <span style={{ textDecoration: escluso ? 'line-through' : 'none', color: escluso ? 'var(--red)' : 'var(--text)' }}>
                              {ing}
                            </span>
                          </div>
                        )
                      })}
                      <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, padding: '4px 12px' }}>
                        <button onClick={() => setIngDropKey(null)}
                          style={{ width: '100%', padding: '4px 0', background: 'var(--surf2)', border: '1px solid var(--border)',
                            borderRadius: 4, cursor: 'pointer', fontSize: 12, color: 'var(--text2)' }}>
                          Chiudi
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="riga-sub">{EUR(r.prezzo_snapshot)} / {r.unita}
                    {r.note && <span style={{ display:'block', fontSize:10, color:'var(--text2)', fontStyle:'italic' }}>{r.note}</span>}
                  </div>
                </div>
                <div className="riga-qta">
                  <button className="qta-btn" onClick={() => cassa.setQuantita(r._key, r.quantita - 1)}>−</button>
                  <span className="qta-val">{r.quantita}</span>
                  <button className="qta-btn" onClick={() => { const p = prodotti.find(x => x.id === r._prodotto_id); cassa.setQuantita(r._key, r.quantita + 1, p?.quantita, msg => toast(msg, 'r')) }}>+</button>
                </div>
                <div className={`riga-tot ${r.omaggio ? 'omaggio-tot' : ''}`}>
                  {r.omaggio ? 'omaggio' : EUR(r.prezzo_snapshot * r.quantita)}
                </div>
                <button className="riga-om-btn" title="Toggle omaggio" onClick={() => cassa.toggleOmaggio(r._key)}>🎁</button>
                <button className="riga-del" onClick={() => cassa.rimuoviRiga(r._key)}>✕</button>
              </div>
            ))
          }
        </div>

        <div className="scont-footer">
          <div className="tot-row"><span>Subtotale</span><span>{EUR(sub)}</span></div>

          <div className="sconto-row">
            <input className="inp-small" style={{ width:70 }} type="number" min="0" placeholder="Sconto"
              value={scontoV} onChange={e => setScontoV(e.target.value)} />
            <select className="inp-small" value={scontoT} onChange={e => setScontoT(e.target.value)}>
              <option value="%">%</option>
              <option value="€">€</option>
            </select>
            <button className="btn-apply" onClick={applicaSconto}>Applica</button>
          </div>

          {sconto > 0 && (
            <div className="tot-row" style={{ color:'var(--green2)' }}>
              <span>Sconto</span><span>- {EUR(sconto)}</span>
            </div>
          )}

          <div className="tot-main">
            <span className="tot-main-label">TOTALE</span>
            <span className="tot-main-val">{EUR(totale)}</span>
          </div>

          <div className="azioni-grid">
            <button className="btn-az btn-svuota" onClick={svuotaCompleto}>🗑 Svuota</button>
            <button className="btn-az btn-storno" onClick={() => setStoricoOpen(true)}>📋 Storico</button>
            <button className="btn-az btn-paga"
              disabled={cassa.righe.length === 0 || cassa.loading}
              onClick={() => setPagOpen(true)}>
              {cassa.loading ? '...' : '💳 PAGA'}
            </button>
          </div>
        </div>
      </div>

      {pagOpen && (
        <ModalePagamento
          totale={totale}
          onConferma={handlePaga}
          onAnnulla={() => setPagOpen(false)}
        />
      )}

      {storicoOpen && (
        <ModaleStorico
          onClose={() => setStoricoOpen(false)}
          onRicarica={ricaricaProdotti}
          stornoScontrino={cassa.stornoScontrino}
          toast={toast}
        />
      )}
    </div>
  )
}
