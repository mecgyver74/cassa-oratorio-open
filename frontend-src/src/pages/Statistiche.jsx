import { useState, useEffect, useCallback } from 'react'
import { useToast } from '../components/Toast'
import ModaleChiusuraCassa from '../components/ModaleChiusuraCassa'
import pb from '../lib/pb'
import { fsConfirm, ripristinaFullscreen } from '../lib/fullscreen'
import * as XLSX from 'xlsx'

const EUR = v => '€ ' + Number(v).toFixed(2).replace('.', ',')
function oggi() { return new Date().toISOString().slice(0, 10) }

export default function Statistiche({ utente }) {
  const toast = useToast()

  // ── Vista: 'corrente' | 'sessione' | 'perdata' ──────────────
  const [vista,    setVista]    = useState('corrente')
  const [sessioni, setSessioni] = useState([])       // archivio sessioni
  const [sessVista, setSessVista] = useState(null)   // sessione selezionata
  const [mostraChi, setMostraChi] = useState(false)  // modale chiusura

  // ── Filtri per-data ──────────────────────────────────────────
  const [dal, setDal] = useState(oggi())
  const [al,  setAl]  = useState(oggi())

  // ── Dati ─────────────────────────────────────────────────────
  const [scontrini, setScontrini] = useState([])
  const [venduto,   setVenduto]   = useState([])
  const [loading,   setLoading]   = useState(false)
  const [eliminando, setEliminando] = useState(false)

  // Carica lista sessioni archiviate
  const caricaSessioni = useCallback(async () => {
    try {
      const s = await pb.collection('sessioni_cassa').getFullList({ sort: '-numero_sessione' })
      setSessioni(s)
    } catch(e) { /* nessuna sessione ancora */ }
  }, [])

  useEffect(() => { caricaSessioni() }, [caricaSessioni])

  // Costruisce il filtro in base alla vista
  const buildFilter = useCallback(() => {
    if (vista === 'corrente')                        return 'sessione=""'
    if (vista === 'sessione' && sessVista)           return `sessione="${sessVista.id}"`
    if (vista === 'perdata')                         return `data_ora>="${dal} 00:00:00" && data_ora<="${al} 23:59:59"`
    return 'sessione=""'
  }, [vista, sessVista, dal, al])

  const buildRigheFilter = useCallback(() => {
    if (vista === 'corrente')                        return 'scontrino.sessione=""'
    if (vista === 'sessione' && sessVista)           return `scontrino.sessione="${sessVista.id}"`
    if (vista === 'perdata')                         return `scontrino.data_ora>="${dal} 00:00:00" && scontrino.data_ora<="${al} 23:59:59"`
    return 'scontrino.sessione=""'
  }, [vista, sessVista, dal, al])

  const carica = useCallback(async () => {
    setLoading(true)
    try {
      const [sc, righe] = await Promise.all([
        pb.collection('scontrini').getFullList({
          filter: buildFilter(), sort: '-data_ora', expand: 'operatore,tavolo'
        }),
        pb.collection('righe_scontrino').getFullList({
          filter: buildRigheFilter(), expand: 'scontrino'
        })
      ])
      setScontrini(sc)
      const mappa = {}
      righe.forEach(r => {
        if (r.expand?.scontrino?.stornato || r.stornata) return
        const k = r.nome_snapshot
        if (!mappa[k]) mappa[k] = { nome: k, qta: 0, tot: 0, omaggi: 0 }
        if (r.omaggio) mappa[k].omaggi += r.quantita
        else { mappa[k].qta += r.quantita; mappa[k].tot += r.totale_riga }
      })
      setVenduto(Object.values(mappa).sort((a, b) => b.tot - a.tot))
    } catch(e) { console.error(e) }
    setLoading(false)
  }, [buildFilter, buildRigheFilter])

  useEffect(() => { carica() }, [carica])

  // ── Calcoli ──────────────────────────────────────────────────
  const validi         = scontrini.filter(s => !s.stornato)
  const incasso        = validi.reduce((s, x) => s + (x.totale_netto || 0), 0)
  const incassoLordo   = validi.reduce((s, x) => s + (x.totale_lordo || 0), 0)
  const scontiTot      = incassoLordo - incasso
  const stornati       = scontrini.filter(s => s.stornato).length
  const incassoContanti = validi.filter(s => s.tipo_pagamento === 'contanti').reduce((s, x) => s + (x.totale_netto || 0), 0)
  const incassoCarta    = validi.filter(s => s.tipo_pagamento === 'carta').reduce((s, x) => s + (x.totale_netto || 0), 0)
  const incassoOmaggio  = validi.filter(s => s.tipo_pagamento === 'omaggio').reduce((s, x) => s + (x.totale_lordo || 0), 0)
  const qtaOmaggi       = venduto.reduce((s, v) => s + (v.omaggi || 0), 0)

  // ── Elimina scontrini (solo per-data o admin) ────────────────
  const eliminaScontriniPeriodo = async (tutto) => {
    const msg = tutto
      ? 'Eliminare TUTTI gli scontrini? Questa operazione è irreversibile!'
      : `Eliminare tutti gli scontrini del periodo selezionato? Operazione irreversibile!`
    if (!fsConfirm(msg)) return
    setEliminando(true)
    try {
      pb.autoCancellation(false)
      const filter = tutto ? '' : buildFilter()
      const lista = await pb.collection('scontrini').getFullList({ filter, fields: 'id' })
      for (const s of lista) {
        const righe = await pb.collection('righe_scontrino').getFullList({ filter: `scontrino="${s.id}"`, fields: 'id' })
        for (const r of righe) await pb.collection('righe_scontrino').delete(r.id)
        await pb.collection('scontrini').delete(s.id)
      }
      pb.autoCancellation(true)
      toast(`Eliminati ${lista.length} scontrini`, 'v')
      carica()
    } catch(e) {
      pb.autoCancellation(true)
      toast('Errore: ' + e.message, 'r')
    }
    setEliminando(false)
  }

  // ── Stampa ───────────────────────────────────────────────────
  const titoloVista = vista === 'corrente' ? 'Sessione corrente'
    : vista === 'sessione' ? (sessVista?.nome || 'Sessione')
    : `${dal} — ${al}`

  const stampa = () => {
    const wasFs = !!document.fullscreenElement
    const html = `<html><head><title>Statistiche ${titoloVista}</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:12px;margin:20px}
        h1{font-size:18px;margin-bottom:4px}h2{font-size:14px;margin:16px 0 6px;border-bottom:1px solid #ccc;padding-bottom:4px}
        .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}
        .card{border:1px solid #ddd;border-radius:6px;padding:10px}
        .card-label{font-size:10px;color:#666;text-transform:uppercase}.card-val{font-size:20px;font-weight:bold}
        .verde{color:#16a34a}table{width:100%;border-collapse:collapse;margin-bottom:16px}
        th{background:#f3f4f6;text-align:left;padding:6px 8px;font-size:11px;border:1px solid #ddd}
        td{padding:6px 8px;border:1px solid #ddd;font-size:11px}@media print{body{margin:0}}
      </style></head><body>
      <h1>Statistiche Cassa Dalila</h1>
      <p>${titoloVista} · Stampato: ${new Date().toLocaleString('it-IT')}</p>
      <div class="summary">
        <div class="card"><div class="card-label">Incasso netto</div><div class="card-val verde">${EUR(incasso)}</div></div>
        <div class="card"><div class="card-label">Scontrini</div><div class="card-val">${validi.length}</div></div>
        <div class="card"><div class="card-label">Media scontrino</div><div class="card-val">${EUR(validi.length ? incasso/validi.length : 0)}</div></div>
        <div class="card"><div class="card-label">Contanti</div><div class="card-val">${EUR(incassoContanti)}</div></div>
        <div class="card"><div class="card-label">Carta</div><div class="card-val">${EUR(incassoCarta)}</div></div>
        <div class="card"><div class="card-label">Sconti totali</div><div class="card-val">${EUR(scontiTot)}</div></div>
      </div>
      <h2>Venduto per prodotto</h2>
      <table><thead><tr><th>Prodotto</th><th>Quantità</th><th>Omaggi</th><th>Totale</th></tr></thead><tbody>
        ${venduto.map(v => `<tr><td>${v.nome}</td><td>${v.qta}</td><td>${v.omaggi||'-'}</td><td><b>${EUR(v.tot)}</b></td></tr>`).join('')}
        <tr style="background:#f9f9f9;font-weight:bold"><td>TOTALE</td><td>${venduto.reduce((s,v)=>s+v.qta,0)}</td><td></td><td>${EUR(incasso)}</td></tr>
      </tbody></table></body></html>`
    const oldFrame = document.getElementById('_print_stats')
    if (oldFrame) oldFrame.remove()
    const iframe = document.createElement('iframe')
    iframe.id = '_print_stats'
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;'
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument || iframe.contentWindow.document
    doc.open(); doc.write(html); doc.close()
    iframe.onload = () => {
      iframe.contentWindow.focus(); iframe.contentWindow.print()
      if (wasFs) ripristinaFullscreen()
      setTimeout(() => iframe.remove(), 5000)
    }
  }

  // ── Export XLSX ───────────────────────────────────────────────
  const exportXLSX = () => {
    const wb = XLSX.utils.book_new()
    const ws1 = XLSX.utils.aoa_to_sheet([
      ['Prodotto','Quantita totale','di cui omaggi','Quantita pagata','Totale EUR'],
      ...venduto.map(v => [v.nome, v.qta+(v.omaggi||0), v.omaggi||0, v.qta, parseFloat(v.tot.toFixed(2))])
    ])
    ws1['!cols'] = [{wch:30},{wch:16},{wch:14},{wch:16},{wch:12}]
    XLSX.utils.book_append_sheet(wb, ws1, 'Venduto')
    const ws2 = XLSX.utils.aoa_to_sheet([
      ['Numero','Data','Lordo EUR','Sconto EUR','Netto EUR','Pagamento','Stornato','Postazione'],
      ...scontrini.map(s => [
        parseInt(s.numero), new Date(s.data_ora).toLocaleString('it-IT'),
        parseFloat((s.totale_lordo||0).toFixed(2)), parseFloat((s.sconto_euro||0).toFixed(2)),
        parseFloat((s.totale_netto||0).toFixed(2)), s.tipo_pagamento,
        s.stornato ? 'SI' : 'NO', s.postazione || ''
      ])
    ])
    ws2['!cols'] = [{wch:8},{wch:18},{wch:10},{wch:10},{wch:10},{wch:10},{wch:8},{wch:12}]
    XLSX.utils.book_append_sheet(wb, ws2, 'Scontrini')
    const ws3 = XLSX.utils.aoa_to_sheet([
      ['Voce','Valore'], ['Vista', titoloVista],
      ['Incasso netto', parseFloat(incasso.toFixed(2))],
      ['Incasso lordo', parseFloat(incassoLordo.toFixed(2))],
      ['Sconti totali', parseFloat(scontiTot.toFixed(2))],
      ['Scontrini', validi.length],
      ['Media scontrino', parseFloat((validi.length ? incasso/validi.length : 0).toFixed(2))],
      ['Contanti', parseFloat(incassoContanti.toFixed(2))],
      ['Carta', parseFloat(incassoCarta.toFixed(2))],
    ])
    ws3['!cols'] = [{wch:20},{wch:20}]
    XLSX.utils.book_append_sheet(wb, ws3, 'Riepilogo')
    const slug = titoloVista.replace(/[^a-z0-9]/gi,'_').toLowerCase()
    XLSX.writeFile(wb, `statistiche_${slug}.xlsx`)
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="page-pad">

      {/* Titolo + azioni */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
        <div className="page-title" style={{ margin:0 }}>Statistiche</div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {utente?.ruolo === 'admin' && vista === 'corrente' && (
            <button onClick={() => setMostraChi(true)} style={{
              padding:'7px 16px', background:'#b45309', color:'#fff', border:'none',
              borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer'
            }}>
              🔒 Chiudi cassa
            </button>
          )}
          <button onClick={stampa} style={{ padding:'7px 14px', background:'#1e293b', color:'#f1f5f9', border:'none', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer' }}>
            Stampa
          </button>
          <button onClick={exportXLSX} style={{ padding:'7px 14px', background:'var(--green)', color:'#fff', border:'none', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer' }}>
            ⬇ Excel
          </button>
        </div>
      </div>

      {/* Tab sessioni */}
      <div style={{ display:'flex', gap:6, overflowX:'auto', marginBottom:14, paddingBottom:2 }}>
        <TabBtn
          label="Sessione corrente"
          active={vista === 'corrente'}
          onClick={() => { setVista('corrente'); setSessVista(null) }}
        />
        <TabBtn
          label="Per data"
          active={vista === 'perdata'}
          onClick={() => { setVista('perdata'); setSessVista(null) }}
        />
        {sessioni.length > 0 && (
          <div style={{ width:1, background:'var(--border)', margin:'0 4px', flexShrink:0 }} />
        )}
        {sessioni.map(s => (
          <TabBtn
            key={s.id}
            label={s.nome || `Sessione #${s.numero_sessione}`}
            sub={s.scontrini_count != null ? `${s.scontrini_count} sc · ${EUR(s.totale_netto)}` : ''}
            active={vista === 'sessione' && sessVista?.id === s.id}
            onClick={() => { setVista('sessione'); setSessVista(s) }}
          />
        ))}
      </div>

      {/* Filtro per data (solo in modo perdata) */}
      {vista === 'perdata' && (
        <div className="filtri-row">
          <label>Dal</label>
          <input type="date" value={dal} onChange={e => setDal(e.target.value)} />
          <label>Al</label>
          <input type="date" value={al}  onChange={e => setAl(e.target.value)} />
          <button className="btn-refresh" onClick={carica}>{loading ? '...' : '↻ Aggiorna'}</button>
        </div>
      )}

      {/* Info sessione archivio */}
      {vista === 'sessione' && sessVista && (
        <div style={{ background:'var(--surf2)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 16px', marginBottom:14, fontSize:13, color:'var(--text2)', display:'flex', gap:24, flexWrap:'wrap' }}>
          <span>📦 <b>{sessVista.nome}</b></span>
          {sessVista.aperta_il && <span>Apertura: {new Date(sessVista.aperta_il).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span>}
          {sessVista.chiusa_il && <span>Chiusura: {new Date(sessVista.chiusa_il).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span>}
          <span>Scontrini #{sessVista.primo_numero}–#{sessVista.ultimo_numero}</span>
        </div>
      )}

      {/* Cards statistiche */}
      <div className="stat-grid">
        <div className="stat-card"><div className="stat-card-label">Incasso netto</div><div className="stat-card-val verde">{EUR(incasso)}</div></div>
        <div className="stat-card"><div className="stat-card-label">Scontrini</div><div className="stat-card-val">{validi.length}</div></div>
        <div className="stat-card"><div className="stat-card-label">Media scontrino</div><div className="stat-card-val">{EUR(validi.length ? incasso/validi.length : 0)}</div></div>
        <div className="stat-card"><div className="stat-card-label">Contanti</div><div className="stat-card-val">{EUR(incassoContanti)}</div></div>
        <div className="stat-card"><div className="stat-card-label">Carta</div><div className="stat-card-val">{EUR(incassoCarta)}</div></div>
        {incassoOmaggio > 0 && <div className="stat-card"><div className="stat-card-label">Omaggi (valore)</div><div className="stat-card-val" style={{color:'var(--green)'}}>{EUR(incassoOmaggio)}</div></div>}
        {qtaOmaggi > 0 && <div className="stat-card"><div className="stat-card-label">Pezzi omaggiati</div><div className="stat-card-val" style={{color:'var(--green)'}}>{qtaOmaggi}</div></div>}
        <div className="stat-card"><div className="stat-card-label">Sconti</div><div className="stat-card-val">{EUR(scontiTot)}</div></div>
        <div className="stat-card"><div className="stat-card-label">↩ Stornati</div><div className="stat-card-val">{stornati}</div></div>
        <div className="stat-card"><div className="stat-card-label">Pezzi venduti</div><div className="stat-card-val">{venduto.reduce((s,v)=>s+v.qta,0)}</div></div>
      </div>

      {/* Venduto per prodotto */}
      <div className="table-box" style={{ marginBottom:16 }}>
        <div className="table-box-head">Venduto per prodotto</div>
        <table>
          <thead><tr><th>Prodotto</th><th>Quantità</th><th>Omaggi</th><th>Totale</th></tr></thead>
          <tbody>
            {venduto.map((v, i) => (
              <tr key={i}>
                <td style={{ fontWeight:600 }}>{v.nome}</td>
                <td>{v.qta}</td>
                <td style={{ color:'var(--green)' }}>{v.omaggi || '—'}</td>
                <td style={{ fontWeight:700, color:'var(--accent2)', fontFamily:'Barlow Condensed', fontSize:15 }}>{EUR(v.tot)}</td>
              </tr>
            ))}
            {venduto.length > 0 && (
              <tr style={{ fontWeight:700, background:'var(--surf2)' }}>
                <td>TOTALE</td><td>{venduto.reduce((s,v)=>s+v.qta,0)}</td><td>{venduto.reduce((s,v)=>s+(v.omaggi||0),0)||'—'}</td>
                <td style={{ color:'var(--green)', fontFamily:'Barlow Condensed', fontSize:15 }}>{EUR(incasso)}</td>
              </tr>
            )}
            {!venduto.length && <tr><td colSpan={4} style={{ color:'var(--text3)', textAlign:'center', padding:20 }}>Nessun dato</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Storico scontrini */}
      <div className="table-box">
        <div className="table-box-head" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>Storico scontrini</span>
          {utente?.ruolo === 'admin' && (
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => eliminaScontriniPeriodo(false)} disabled={eliminando || !scontrini.length}
                style={{ padding:'4px 10px', fontSize:12, background:'#fef2f2', color:'var(--red)', border:'1px solid #fecaca', borderRadius:6, cursor:'pointer', fontWeight:600 }}>
                {eliminando ? '...' : 'Elimina selezione'}
              </button>
              <button onClick={() => eliminaScontriniPeriodo(true)} disabled={eliminando}
                style={{ padding:'4px 10px', fontSize:12, background:'var(--red)', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontWeight:600 }}>
                {eliminando ? '...' : 'Elimina tutto'}
              </button>
            </div>
          )}
        </div>
        <table>
          <thead><tr><th>#</th><th>Data/Ora</th><th>Operatore</th><th>Lordo</th><th>Sconto</th><th>Netto</th><th>Pagamento</th><th>Stato</th></tr></thead>
          <tbody>
            {scontrini.map(s => (
              <tr key={s.id}>
                <td style={{ fontWeight:700, fontFamily:'Barlow Condensed' }}>#{String(s.numero).padStart(4,'0')}</td>
                <td>{new Date(s.data_ora).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</td>
                <td style={{ fontSize:12, color:'var(--text2)' }}>{s.postazione||'—'}</td>
                <td style={{ color:'var(--text2)' }}>{EUR(s.totale_lordo)}</td>
                <td style={{ color:'var(--green)' }}>{(s.sconto_euro>0||s.sconto_perc>0)?(s.sconto_euro>0?'- '+EUR(s.sconto_euro):s.sconto_perc+'%'):'—'}</td>
                <td style={{ fontWeight:700, color:'var(--accent2)', fontFamily:'Barlow Condensed', fontSize:15 }}>{EUR(s.totale_netto)}</td>
                <td style={{ textTransform:'capitalize' }}>{s.tipo_pagamento}</td>
                <td><span className={`badge ${s.stornato?'badge-storno':'badge-ok'}`}>{s.stornato?'Stornato':'OK'}</span></td>
              </tr>
            ))}
            {!scontrini.length && <tr><td colSpan={8} style={{ color:'var(--text3)', textAlign:'center', padding:20 }}>Nessuno scontrino</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modale chiusura */}
      {mostraChi && (
        <ModaleChiusuraCassa
          utente={utente}
          onChiusa={sess => {
            setMostraChi(false)
            caricaSessioni()
            carica()
          }}
          onClose={() => setMostraChi(false)}
        />
      )}
    </div>
  )
}

function TabBtn({ label, sub, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: sub ? '6px 14px' : '7px 14px',
      background: active ? 'var(--accent)' : 'var(--surf2)',
      color: active ? '#fff' : 'var(--text2)',
      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
      whiteSpace: 'nowrap', flexShrink: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
    }}>
      <span>{label}</span>
      {sub && <span style={{ fontSize: 10, opacity: .75, fontWeight: 400 }}>{sub}</span>}
    </button>
  )
}
