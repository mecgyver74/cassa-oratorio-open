import { useState, useEffect, useCallback, useRef } from 'react'
import pb from '../lib/pb'
import { useToast } from '../components/Toast'

export default function Magazzino() {
  const toast = useToast()
  const [magComuni, setMagComuni] = useState([])
  const [prodotti, setProdotti] = useState([])
  const [movimenti, setMovimenti] = useState([])
  const [tab, setTab] = useState('comuni')
  const [errore, setErrore] = useState(null)
  const [famiglie, setFamiglie] = useState([])
  const [filtroFamMag, setFiltroFamMag] = useState('')
  // Usiamo ref per gli input così non perdono il focus al re-render
  const inputRefs = useRef({})

  const carica = useCallback(async () => {
    setErrore(null)
    pb.autoCancellation(false)
    try {
      const mc = await pb.collection('magazzini_comuni').getFullList({ sort: 'nome' })
      setMagComuni(mc)
    } catch(e) { setErrore('Errore magazzini comuni: ' + e.message) }
    try {
      const pr = await pb.collection('prodotti').getFullList({ sort: 'nome', filter: 'attivo=true', expand: 'magazzino_comune,famiglia' })
      const fam = await pb.collection('famiglie').getFullList({ sort: 'ordine,nome', filter: 'attivo=true' })
      setFamiglie(fam)
      setProdotti(pr.filter(p => !p.magazzino_comune))
    } catch(e) { console.error('prodotti:', e) }
    try {
      const mv = await pb.collection('movimenti_magazzino').getFullList({ sort: '-created', expand: 'prodotto,magazzino_comune' })
      setMovimenti(mv)
    } catch(e) { console.error('movimenti:', e) }
    pb.autoCancellation(true)
  }, [])

  useEffect(() => { carica() }, [carica])

  const getInputVal = (id) => inputRefs.current[id]?.value || ''

  const caricaMag = async (id, tipo, quantitaAttuale) => {
    const v = parseFloat(getInputVal(id)) || 0
    if (v <= 0) { toast('Inserisci una quantità valida', 'r'); return }
    try {
      if (tipo === 'comune') {
        await pb.collection('magazzini_comuni').update(id, { quantita: quantitaAttuale + v })
        await pb.collection('movimenti_magazzino').create({ magazzino_comune: id, tipo: 'carico', quantita: v, note: 'Carico manuale' })
      } else {
        await pb.collection('prodotti').update(id, { quantita: quantitaAttuale + v })
        await pb.collection('movimenti_magazzino').create({ prodotto: id, tipo: 'carico', quantita: v, note: 'Carico manuale' })
      }
      if (inputRefs.current[id]) inputRefs.current[id].value = ''
      toast(`+${v} unità caricate`, 'v')
      carica()
    } catch(e) { toast('Errore: ' + e.message, 'r') }
  }

  const rettifica = async (id, tipo) => {
    const v = parseFloat(getInputVal(id))
    if (isNaN(v)) { toast('Inserisci una quantità', 'r'); return }
    try {
      if (tipo === 'comune') {
        await pb.collection('magazzini_comuni').update(id, { quantita: v })
      } else {
        await pb.collection('prodotti').update(id, { quantita: v })
      }
    } catch(e) { toast('Errore: ' + e.message, 'r'); return }
    // Il movimento è opzionale: PocketBase rifiuta quantita=0 su campo required
    try {
      if (tipo === 'comune') {
        await pb.collection('movimenti_magazzino').create({ magazzino_comune: id, tipo: 'rettifica', quantita: v, note: 'Rettifica manuale' })
      } else {
        await pb.collection('movimenti_magazzino').create({ prodotto: id, tipo: 'rettifica', quantita: v, note: 'Rettifica manuale' })
      }
    } catch(_) { /* ignora: quantita=0 fallisce validazione PocketBase ma la rettifica è avvenuta */ }
    if (inputRefs.current[id]) inputRefs.current[id].value = ''
    toast('Rettifica applicata', 'b')
    carica()
  }

  const MagCard = ({ id, nome, quantita, soglia, tipo }) => {
    const low = quantita >= 0 && quantita <= (soglia || 0)
    const inf = quantita < 0
    return (
      <div className="mag-card">
        <div className="mag-card-nome">{nome}</div>
        <div className="mag-qty">
          <span className={'mag-qty-val ' + (inf ? '' : low ? 'low' : 'ok')}>
            {inf ? '∞' : quantita}
          </span>
          <span className="mag-qty-unit">pz</span>
          {low && !inf && (
            <span style={{ fontSize: 11, background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>SCORTA BASSA</span>
          )}
        </div>
        {!inf && <div className="mag-soglia">Soglia allarme: {soglia || 0}</div>}
        <div style={{ marginTop: 10 }}>
          {/* Input NON controllato — usa ref per evitare perdita focus */}
          <input
            type="number"
            min="0"
            step="1"
            placeholder="Inserisci quantità"
            ref={el => { if (el) inputRefs.current[id] = el }}
            className="mag-input-qty"
            style={{ width: '100%', marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="mag-btn-c" style={{ flex: 1 }} onClick={() => caricaMag(id, tipo, quantita)}>
              + Carico
            </button>
            <button className="mag-btn-r" style={{ flex: 1 }} onClick={() => rettifica(id, tipo)}>
              = Rettifica
            </button>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, lineHeight: 1.4 }}>
          <b>Carico</b>: aggiunge · <b>Rettifica</b>: imposta esatto
        </div>
      </div>
    )
  }

  return (
    <div className="page-pad">
      <div className="page-title">Magazzino</div>
      {errore && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#dc2626' }}>
          {errore}
        </div>
      )}
      <div style={{ marginBottom: 16, display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        {[['comuni','Magazzini comuni'], ['prodotti','Prodotti singoli'], ['movimenti','Movimenti']].map(([k,l]) => (
          <button key={k} className={'prodotti-tab ' + (tab===k?'active':'')} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'comuni' && (
        <>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
            Magazzini condivisi tra più prodotti.
          </div>
          {magComuni.length === 0
            ? <div style={{ color: 'var(--text3)', fontSize: 13, padding: 20, background: 'var(--surf)', borderRadius: 10, border: '1px solid var(--border)' }}>
                Nessun magazzino comune configurato.
              </div>
            : <div className="mag-grid">
                {magComuni.map(mc => <MagCard key={mc.id} id={mc.id} nome={mc.nome} quantita={mc.quantita} soglia={mc.soglia_allarme} tipo="comune" />)}
              </div>
          }
        </>
      )}

      {tab === 'prodotti' && (
        <>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
            Prodotti con scorta propria (non collegati a un magazzino comune).
          </div>
          <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:12 }}>
            <button onClick={() => setFiltroFamMag('')}
              style={{ padding:'3px 8px', borderRadius:12, fontSize:11, fontWeight:700, cursor:'pointer', border:'none',
                background: filtroFamMag==='' ? 'var(--accent)' : 'var(--surf2)', color: filtroFamMag==='' ? '#fff' : 'var(--text2)' }}>
              Tutti
            </button>
            {famiglie.map(f => (
              <button key={f.id} onClick={() => setFiltroFamMag(f.id)}
                style={{ padding:'3px 8px', borderRadius:12, fontSize:11, fontWeight:700, cursor:'pointer', border:'none',
                  background: filtroFamMag===f.id ? (f.colore||'var(--accent)') : 'var(--surf2)',
                  color: filtroFamMag===f.id ? '#fff' : 'var(--text2)' }}>
                {f.nome}
              </button>
            ))}
          </div>
          {prodotti.length === 0
            ? <div style={{ color: 'var(--text3)', fontSize: 13, padding: 20, background: 'var(--surf)', borderRadius: 10, border: '1px solid var(--border)' }}>
                Tutti i prodotti usano magazzini comuni.
              </div>
            : <div className="mag-grid">
                {prodotti
                  .filter(p => !filtroFamMag || p.famiglia === filtroFamMag)
                  .map(p => <MagCard key={p.id} id={p.id} nome={p.nome} quantita={p.quantita} soglia={p.soglia_allarme} tipo="prodotto" />)}
              </div>
          }
        </>
      )}

      {tab === 'movimenti' && (
        <>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
            <b>Registro variazioni magazzino.</b> Ogni vendita genera uno scarico automatico; i carichi manuali appaiono qui.
          </div>
          <div className="table-box">
            <div className="table-box-head">Ultimi 100 movimenti</div>
            <table>
              <thead><tr><th>Data</th><th>Articolo</th><th>Tipo</th><th>Quantità</th><th>Note</th></tr></thead>
              <tbody>
                {movimenti.map(m => (
                  <tr key={m.id}>
                    <td>{new Date(m.created).toLocaleString('it-IT', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</td>
                    <td style={{ fontWeight: 600 }}>{m.expand?.prodotto?.nome || m.expand?.magazzino_comune?.nome || '—'}</td>
                    <td>
                      <span className={'badge ' + (m.tipo==='carico'?'badge-ok':m.tipo==='rettifica'?'':'badge-storno')}
                        style={m.tipo==='rettifica' ? { background:'#eff6ff', color:'#2563eb' } : {}}>
                        {m.tipo}
                      </span>
                    </td>
                    <td style={{ fontFamily:'Barlow Condensed', fontWeight:700, fontSize:15, color: m.tipo==='scarico'?'var(--red)':'var(--green)' }}>
                      {m.tipo==='scarico'?'-':'+'}{m.quantita}
                    </td>
                    <td style={{ color:'var(--text2)' }}>{m.note||'—'}</td>
                  </tr>
                ))}
                {movimenti.length===0 && <tr><td colSpan={5} style={{ color:'var(--text3)', textAlign:'center', padding:20 }}>Nessun movimento</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}