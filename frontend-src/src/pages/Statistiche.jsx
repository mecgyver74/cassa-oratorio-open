import { useState, useEffect, useCallback, useMemo } from 'react'
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
  const [righeRaw,  setRigheRaw]  = useState([])
  const [filtroPagamento, setFiltroPagamento] = useState('tutti')
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
  // Nota: per "sessione corrente" usiamo (sessione="" || sessione=null) per compatibilità
  // con scontrini creati prima che il campo sessione fosse esplicito
  const buildFilter = useCallback(() => {
    if (vista === 'corrente')        return '(sessione="" || sessione=null)'
    if (vista === 'sessione' && sessVista) return `sessione="${sessVista.id}"`
    if (vista === 'perdata')         return `data_ora>="${dal} 00:00:00" && data_ora<="${al} 23:59:59"`
    return '(sessione="" || sessione=null)'
  }, [vista, sessVista, dal, al])

  const buildRigheFilter = useCallback(() => {
    if (vista === 'corrente')        return '(scontrino.sessione="" || scontrino.sessione=null)'
    if (vista === 'sessione' && sessVista) return `scontrino.sessione="${sessVista.id}"`
    if (vista === 'perdata')         return `scontrino.data_ora>="${dal} 00:00:00" && scontrino.data_ora<="${al} 23:59:59"`
    return '(scontrino.sessione="" || scontrino.sessione=null)'
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
      setRigheRaw(righe)
    } catch(e) { console.error(e) }
    setLoading(false)
  }, [buildFilter, buildRigheFilter])

  useEffect(() => { carica() }, [carica])

  // ── Filtro pagamento — deriva sottoinsieme di scontrini ──────
  const scontriniVista = useMemo(() =>
    filtroPagamento === 'tutti' ? scontrini : scontrini.filter(s => s.tipo_pagamento === filtroPagamento),
    [scontrini, filtroPagamento]
  )

  const venduto = useMemo(() => {
    const scIds = filtroPagamento !== 'tutti' ? new Set(scontriniVista.map(s => s.id)) : null
    const mappa = {}
    righeRaw.forEach(r => {
      if (r.expand?.scontrino?.stornato || r.stornata) return
      if (scIds !== null && !scIds.has(r.scontrino)) return
      const k = r.nome_snapshot
      if (!mappa[k]) mappa[k] = { nome: k, qta: 0, tot: 0, omaggi: 0 }
      if (r.omaggio || r.expand?.scontrino?.tipo_pagamento === 'omaggio') mappa[k].omaggi += r.quantita
      else { mappa[k].qta += r.quantita; mappa[k].tot += r.totale_riga }
    })
    return Object.values(mappa).sort((a, b) => b.tot - a.tot)
  }, [righeRaw, filtroPagamento, scontriniVista])

  // ── Calcoli ──────────────────────────────────────────────────
  const validi           = scontriniVista.filter(s => !s.stornato)
  const valoreVenduto    = validi.reduce((s, x) => s + (x.totale_netto || 0), 0)
  const stornati         = scontriniVista.filter(s => s.stornato).length
  const incassoContanti  = validi.filter(s => s.tipo_pagamento === 'contanti').reduce((s, x) => s + (x.pagato || 0), 0)
  const incassoCarta     = validi.filter(s => s.tipo_pagamento === 'carta').reduce((s, x) => s + (x.pagato || 0), 0)
  const incassoSatispay  = validi.filter(s => s.tipo_pagamento === 'satispay').reduce((s, x) => s + (x.pagato || 0), 0)
  const incassoOmaggio   = validi.filter(s => s.tipo_pagamento === 'omaggio').reduce((s, x) => s + (x.totale_lordo || 0), 0)
  const incassoBuoni     = validi.reduce((s, x) => s + (x.importo_buono || 0), 0)
  const incasso          = incassoContanti + incassoCarta + incassoSatispay
  const qtaOmaggi        = venduto.reduce((s, v) => s + (v.omaggi || 0), 0)

  // ── Elimina scontrini + sessioni collegate ───────────────────
  const eliminaScontriniPeriodo = async (tutto) => {
    // Messaggio di conferma contestuale
    let msg1, msg2 = null
    if (tutto) {
      msg1 = `⚠ ATTENZIONE\n\nStai per eliminare TUTTI gli scontrini e TUTTE le ${sessioni.length} sessioni archiviate.\n\nVerranno cancellati permanentemente tutti i dati storici della cassa.`
      msg2 = `Conferma finale: sei sicuro di voler cancellare l'intera cronologia? L'operazione è IRREVERSIBILE.`
    } else if (vista === 'sessione' && sessVista) {
      msg1 = `Eliminare la sessione "${sessVista.nome}"?\n\nVerranno cancellati ${scontrini.length} scontrini e il record sessione. Operazione irreversibile.`
    } else if (vista === 'perdata') {
      msg1 = `Eliminare i ${scontrini.length} scontrini del periodo ${dal} — ${al}?\n\nSe una sessione archiviata resta senza scontrini verrà eliminata anch'essa. Operazione irreversibile.`
    } else {
      msg1 = `Eliminare i ${scontrini.length} scontrini della sessione corrente? Operazione irreversibile.`
    }

    if (!fsConfirm(msg1)) return
    if (msg2 && !fsConfirm(msg2)) return

    setEliminando(true)
    try {
      pb.autoCancellation(false)
      const filter = tutto ? '' : buildFilter()
      const lista = await pb.collection('scontrini').getFullList({ filter, fields: 'id,sessione' })

      // Raccogli gli ID delle sessioni coinvolte (per verificare dopo se sono vuote)
      const sessioniCoinvolte = new Set(lista.map(s => s.sessione).filter(Boolean))

      for (const s of lista) {
        const righe = await pb.collection('righe_scontrino').getFullList({ filter: `scontrino="${s.id}"`, fields: 'id' })
        for (const r of righe) await pb.collection('righe_scontrino').delete(r.id)
        // Pulisci anche i movimenti magazzino collegati
        try {
          const movs = await pb.collection('movimenti_magazzino').getFullList({ filter: `scontrino="${s.id}"`, fields: 'id' })
          for (const m of movs) await pb.collection('movimenti_magazzino').delete(m.id)
        } catch(_) {}
        await pb.collection('scontrini').delete(s.id)
      }

      // Elimina le sessioni_cassa associate
      if (tutto) {
        // Cancella tutte le sessioni
        const tutteSess = await pb.collection('sessioni_cassa').getFullList({ fields: 'id' })
        for (const s of tutteSess) await pb.collection('sessioni_cassa').delete(s.id)
      } else if (vista === 'sessione' && sessVista) {
        // Cancella il record della sessione specifica
        await pb.collection('sessioni_cassa').delete(sessVista.id).catch(() => {})
        setSessVista(null)
        setVista('corrente')
      } else if (sessioniCoinvolte.size > 0) {
        // Per-data o corrente: cancella le sessioni che ora non hanno più scontrini
        for (const sessId of sessioniCoinvolte) {
          const rimasti = await pb.collection('scontrini').getList(1, 1, { filter: `sessione="${sessId}"`, fields: 'id' })
          if (rimasti.totalItems === 0) {
            await pb.collection('sessioni_cassa').delete(sessId).catch(() => {})
          }
        }
      }

      pb.autoCancellation(true)
      toast(`Eliminati ${lista.length} scontrini`, 'v')
      caricaSessioni()
      carica()
    } catch(e) {
      pb.autoCancellation(true)
      toast('Errore: ' + e.message, 'r')
    }
    setEliminando(false)
  }

  // ── Export Magazzino ─────────────────────────────────────────
  const caricaMagazzino = async () => {
    const [prodotti, famiglie, magComuni] = await Promise.all([
      pb.collection('prodotti').getFullList({ sort: 'ordine,nome', filter: 'attivo=true', expand: 'famiglia,magazzino_comune' }),
      pb.collection('famiglie').getFullList({ sort: 'ordine,nome' }),
      pb.collection('magazzini_comuni').getFullList({ sort: 'nome' }),
    ])
    return { prodotti, famiglie, magComuni }
  }

  // Ordina prodotti come in cassa: per ordine famiglia, poi ordine prodotto
  const ordinaComeCassa = (prodotti, famiglie) => {
    const famOrd = {}
    famiglie.forEach((f, i) => { famOrd[f.id] = i })
    return prodotti.slice().sort((a, b) => {
      const oa = famOrd[a.famiglia] ?? 999
      const ob = famOrd[b.famiglia] ?? 999
      if (oa !== ob) return oa - ob
      if ((a.ordine || 0) !== (b.ordine || 0)) return (a.ordine || 0) - (b.ordine || 0)
      return a.nome.localeCompare(b.nome)
    })
  }

  const exportMagazzinoXLSX = async () => {
    const { prodotti, famiglie, magComuni } = await caricaMagazzino()
    const wb = XLSX.utils.book_new()

    // Foglio 1: Prodotti con magazzino proprio
    const propri = ordinaComeCassa(prodotti.filter(p => !p.magazzino_comune), famiglie)
    const wsPropri = XLSX.utils.aoa_to_sheet([
      ['Prodotto', 'Famiglia', 'Scorta', 'Soglia allarme', 'Unità', 'Stato'],
      ...propri.map(p => {
        const fam = famiglie.find(f => f.id === p.famiglia)
        const stato = p.quantita < 0 ? 'Infinita' : p.quantita <= 0 ? 'ESAURITO' : p.quantita <= p.soglia_allarme ? 'BASSO' : 'OK'
        return [p.nome, fam?.nome || '—', p.quantita < 0 ? '∞' : p.quantita, p.soglia_allarme || 0, p.unita || 'pz', stato]
      })
    ])
    wsPropri['!cols'] = [{wch:28},{wch:16},{wch:8},{wch:14},{wch:6},{wch:10}]
    XLSX.utils.book_append_sheet(wb, wsPropri, 'Prodotti')

    // Foglio 2: Magazzini comuni
    const wsMC = XLSX.utils.aoa_to_sheet([
      ['Magazzino comune', 'Scorta', 'Soglia allarme', 'Stato'],
      ...magComuni.map(m => {
        const stato = m.quantita <= 0 ? 'ESAURITO' : m.quantita <= m.soglia_allarme ? 'BASSO' : 'OK'
        return [m.nome, m.quantita, m.soglia_allarme || 0, stato]
      })
    ])
    wsMC['!cols'] = [{wch:24},{wch:8},{wch:14},{wch:10}]
    XLSX.utils.book_append_sheet(wb, wsMC, 'Magazzini comuni')

    XLSX.writeFile(wb, `magazzino_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.xlsx`)
  }

  const stampaMagazzinoPDF = async () => {
    const { prodotti, famiglie, magComuni } = await caricaMagazzino()
    const propri = ordinaComeCassa(prodotti.filter(p => !p.magazzino_comune), famiglie)
    const now = new Date().toLocaleString('it-IT')

    const rigaPropri = propri.map(p => {
      const fam = famiglie.find(f => f.id === p.famiglia)
      const scorta = p.quantita < 0 ? '∞' : p.quantita
      const stato = p.quantita < 0 ? '' : p.quantita <= 0 ? 'ESAURITO' : p.quantita <= p.soglia_allarme ? 'BASSO' : ''
      const col = p.quantita < 0 ? '' : p.quantita <= 0 ? '#dc2626' : p.quantita <= p.soglia_allarme ? '#d97706' : ''
      return `<tr><td>${p.nome}</td><td>${fam?.nome||'—'}</td><td style="text-align:center;font-weight:700;color:${col}">${scorta}</td><td style="text-align:center">${p.soglia_allarme||0}</td><td style="text-align:center">${p.unita||'pz'}</td><td style="text-align:center;color:${col};font-weight:700">${stato}</td></tr>`
    }).join('')

    const rigaMC = magComuni.map(m => {
      const stato = m.quantita <= 0 ? 'ESAURITO' : m.quantita <= m.soglia_allarme ? 'BASSO' : ''
      const col = m.quantita <= 0 ? '#dc2626' : m.quantita <= m.soglia_allarme ? '#d97706' : ''
      return `<tr><td>${m.nome}</td><td style="text-align:center;font-weight:700;color:${col}">${m.quantita}</td><td style="text-align:center">${m.soglia_allarme||0}</td><td style="text-align:center;color:${col};font-weight:700">${stato}</td></tr>`
    }).join('')

    const html = `<html><head><title>Magazzino</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:12px;margin:20px}
        h1{font-size:16px;margin-bottom:2px}h2{font-size:13px;margin:18px 0 6px;border-bottom:2px solid #333;padding-bottom:3px}
        p{font-size:10px;color:#666;margin:0 0 12px}
        table{width:100%;border-collapse:collapse;margin-bottom:8px}
        th{background:#1e293b;color:#fff;text-align:left;padding:5px 7px;font-size:11px}
        td{padding:4px 7px;border-bottom:1px solid #e5e7eb;font-size:11px}
        tr:nth-child(even){background:#f9fafb}
        @media print{body{margin:0}}
      </style></head><body>
      <h1>Situazione Magazzino — Cassa Dalila</h1>
      <p>Stampato: ${now}</p>
      <h2>Prodotti (${propri.length})</h2>
      <table><thead><tr><th>Prodotto</th><th>Famiglia</th><th>Scorta</th><th>Soglia</th><th>Unità</th><th>Stato</th></tr></thead><tbody>${rigaPropri}</tbody></table>
      ${magComuni.length > 0 ? `<h2>Magazzini comuni (${magComuni.length})</h2>
      <table><thead><tr><th>Nome</th><th>Scorta</th><th>Soglia</th><th>Stato</th></tr></thead><tbody>${rigaMC}</tbody></table>` : ''}
      </body></html>`

    const oldFrame = document.getElementById('_print_mag')
    if (oldFrame) oldFrame.remove()
    const iframe = document.createElement('iframe')
    iframe.id = '_print_mag'
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;'
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument || iframe.contentWindow.document
    doc.open(); doc.write(html); doc.close()
    iframe.onload = () => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(() => iframe.remove(), 5000) }
  }

  // ── Stampa ───────────────────────────────────────────────────
  const titoloVista = vista === 'corrente' ? 'Sessione corrente'
    : vista === 'sessione' ? (sessVista?.nome || 'Sessione')
    : `${dal} — ${al}`

  const stampa = () => {
    const wasFs = !!document.fullscreenElement
    const html = `<html><head><title>Statistiche ${titoloVista}</title>
      <style>
        @page{size:80mm auto;margin:0}
        *{box-sizing:border-box}
        html,body{margin:0;padding:0}
        body{font-family:Arial,sans-serif;font-size:15px;padding:3mm;width:100%}
        h1{font-size:17px;margin:0 0 2px;text-align:center}
        .sub{font-size:12px;text-align:center;margin-bottom:6px;color:#555}
        hr{border:none;border-top:1px dashed #999;margin:6px 0}
        .riga{display:flex;justify-content:space-between;align-items:baseline;margin:3px 0}
        .riga .lbl{font-size:13px;color:#444}
        .riga .val{font-size:16px;font-weight:bold}
        .riga .val.grande{font-size:20px}
        .verde{color:#16a34a}
        h2{font-size:14px;margin:8px 0 4px;border-bottom:1px solid #ccc;padding-bottom:2px}
        table{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:13px}
        th{text-align:left;padding:3px 2px;font-size:12px;border-bottom:1px solid #999}
        td{padding:3px 2px;border-bottom:1px dotted #ddd}
        td.r,th.r{text-align:right}
        tr.tot td{font-weight:bold;border-top:1px solid #999;border-bottom:none}
      </style></head><body>
      <h1>Cassa Dalila</h1>
      <div class="sub">Statistiche · ${titoloVista}</div>
      <div class="sub">${new Date().toLocaleString('it-IT')}</div>
      <hr>
      <div class="riga"><span class="lbl">Incasso reale</span><span class="val grande verde">${EUR(incasso)}</span></div>
      <div class="riga"><span class="lbl">Scontrini</span><span class="val">${validi.length}</span></div>
      <div class="riga"><span class="lbl">Media scontrino</span><span class="val">${EUR(validi.length ? incasso/validi.length : 0)}</span></div>
      <hr>
      <div class="riga"><span class="lbl">Contanti</span><span class="val">${EUR(incassoContanti)}</span></div>
      <div class="riga"><span class="lbl">Carta</span><span class="val">${EUR(incassoCarta)}</span></div>
      ${incassoSatispay > 0 ? `<div class="riga"><span class="lbl">Satispay</span><span class="val">${EUR(incassoSatispay)}</span></div>` : ''}
      ${incassoBuoni > 0 ? `<div class="riga"><span class="lbl" style="color:#7c3aed">Buoni (costo oratorio)</span><span class="val" style="color:#7c3aed">- ${EUR(incassoBuoni)}</span></div>` : ''}
      ${incassoOmaggio > 0 ? `<div class="riga"><span class="lbl">Omaggi</span><span class="val">${EUR(incassoOmaggio)}</span></div>` : ''}
      <hr>
      <h2>Venduto per prodotto</h2>
      <table><thead><tr><th>Prodotto</th><th class="r">Qtà</th><th class="r">Omag.</th><th class="r">Totale</th></tr></thead><tbody>
        ${venduto.map(v => `<tr><td>${v.nome}</td><td class="r">${v.qta+(v.omaggi||0)}</td><td class="r">${v.omaggi||'-'}</td><td class="r"><b>${EUR(v.tot)}</b></td></tr>`).join('')}
        <tr class="tot"><td>TOTALE</td><td class="r">${venduto.reduce((s,v)=>s+v.qta+(v.omaggi||0),0)}</td><td class="r">${venduto.reduce((s,v)=>s+(v.omaggi||0),0)||'-'}</td><td class="r">${EUR(valoreVenduto)}</td></tr>
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
      ['Numero','Data','Lordo EUR','Buono EUR','Netto EUR','Pagamento','Stornato','Postazione'],
      ...scontriniVista.map(s => [
        parseInt(s.numero), new Date(s.data_ora).toLocaleString('it-IT'),
        parseFloat((s.totale_lordo||0).toFixed(2)), parseFloat((s.importo_buono||0).toFixed(2)),
        parseFloat((s.totale_netto||0).toFixed(2)), s.tipo_pagamento,
        s.stornato ? 'SI' : 'NO', s.postazione || ''
      ])
    ])
    ws2['!cols'] = [{wch:8},{wch:18},{wch:10},{wch:10},{wch:10},{wch:10},{wch:8},{wch:12}]
    XLSX.utils.book_append_sheet(wb, ws2, 'Scontrini')
    const ws3 = XLSX.utils.aoa_to_sheet([
      ['Voce','Valore'], ['Vista', titoloVista],
      ['Incasso reale', parseFloat(incasso.toFixed(2))],
      ['Scontrini', validi.length],
      ['Media scontrino', parseFloat((validi.length ? incasso/validi.length : 0).toFixed(2))],
      ['Contanti', parseFloat(incassoContanti.toFixed(2))],
      ['Carta', parseFloat(incassoCarta.toFixed(2))],
      ['Satispay', parseFloat(incassoSatispay.toFixed(2))],
      ['Buoni (costo oratorio)', parseFloat(incassoBuoni.toFixed(2))],
      ['Valore venduto totale', parseFloat(valoreVenduto.toFixed(2))],
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
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          {utente?.ruolo === 'admin' && vista === 'corrente' && (
            <button onClick={() => setMostraChi(true)} style={{
              padding:'7px 16px', background:'#b45309', color:'#fff', border:'none',
              borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer'
            }}>
              🔒 Chiudi cassa
            </button>
          )}
          <button onClick={stampa} style={{ padding:'7px 14px', background:'#1e293b', color:'#f1f5f9', border:'none', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer' }}>
            🖨 Stampa
          </button>
          <button onClick={exportXLSX} style={{ padding:'7px 14px', background:'var(--green)', color:'#fff', border:'none', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer' }}>
            ⬇ Excel
          </button>
          {/* separatore */}
          <div style={{ width:1, height:28, background:'var(--border)', flexShrink:0 }} />
          <span style={{ fontSize:11, color:'var(--text3)', fontWeight:600, whiteSpace:'nowrap' }}>Magazzino:</span>
          <button onClick={stampaMagazzinoPDF} style={{ padding:'7px 14px', background:'#0369a1', color:'#fff', border:'none', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer' }}>
            🖨 PDF
          </button>
          <button onClick={exportMagazzinoXLSX} style={{ padding:'7px 14px', background:'#0369a1', color:'#fff', border:'2px solid #7dd3fc', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer' }}>
            ⬇ Excel
          </button>
        </div>
      </div>

      {/* Selettore vista */}
      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:14, flexWrap:'wrap' }}>
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
          <>
            <div style={{ width:1, background:'var(--border)', alignSelf:'stretch', flexShrink:0 }} />
            <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
              <select
                value={vista === 'sessione' ? (sessVista?.id || '') : ''}
                onChange={e => {
                  const s = sessioni.find(s => s.id === e.target.value)
                  if (s) { setVista('sessione'); setSessVista(s) }
                }}
                style={{
                  appearance: 'none', WebkitAppearance: 'none',
                  paddingLeft: 12, paddingRight: 32, paddingTop: 7, paddingBottom: 7,
                  borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${vista === 'sessione' ? 'var(--accent)' : 'var(--border)'}`,
                  background: vista === 'sessione' ? 'var(--accent)' : 'var(--surf2)',
                  color: vista === 'sessione' ? '#fff' : 'var(--text2)',
                  minWidth: 220, maxWidth: 340,
                }}
              >
                <option value="" disabled>
                  📦 Archivio sessioni ({sessioni.length})
                </option>
                {sessioni.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.nome || `Sessione #${s.numero_sessione}`}
                    {s.scontrini_count != null ? `  ·  ${s.scontrini_count} sc  ·  ${EUR((s.totale_contanti||0)+(s.totale_carta||0)+(s.totale_satispay||0))}` : ''}
                  </option>
                ))}
              </select>
              {/* freccia custom */}
              <span style={{
                position:'absolute', right:10, pointerEvents:'none',
                color: vista === 'sessione' ? '#fff' : 'var(--text3)', fontSize:11,
              }}>▼</span>
            </div>
          </>
        )}
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

      {/* Filtro tipo pagamento */}
      <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:10, flexWrap:'wrap' }}>
        <span style={{ fontSize:11, color:'var(--text3)', fontWeight:600, marginRight:2 }}>Pagamento:</span>
        {[['tutti','Tutti'],['contanti','Contanti'],['carta','Carta'],['satispay','Satispay'],['buono','Buono'],['omaggio','Omaggio']].map(([k,l]) => (
          <button key={k} onClick={() => setFiltroPagamento(k)} style={{
            padding:'3px 11px', borderRadius:6,
            border:`1px solid ${filtroPagamento===k?'var(--accent)':'var(--border)'}`,
            background: filtroPagamento===k?'var(--accent)':'var(--surf2)',
            color: filtroPagamento===k?'#fff':'var(--text2)',
            fontSize:12, fontWeight:600, cursor:'pointer'
          }}>{l}</button>
        ))}
      </div>

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
        <div className="stat-card"><div className="stat-card-label">Incasso reale</div><div className="stat-card-val verde">{EUR(incasso)}</div></div>
        <div className="stat-card"><div className="stat-card-label">Scontrini</div><div className="stat-card-val">{validi.length}</div></div>
        <div className="stat-card"><div className="stat-card-label">Media scontrino</div><div className="stat-card-val">{EUR(validi.length ? incasso/validi.length : 0)}</div></div>
        <div className="stat-card"><div className="stat-card-label">Contanti</div><div className="stat-card-val">{EUR(incassoContanti)}</div></div>
        <div className="stat-card"><div className="stat-card-label">Carta</div><div className="stat-card-val">{EUR(incassoCarta)}</div></div>
        {incassoSatispay > 0 && <div className="stat-card"><div className="stat-card-label">Satispay</div><div className="stat-card-val" style={{color:'#a855f7'}}>{EUR(incassoSatispay)}</div></div>}
        {incassoBuoni > 0 && <div className="stat-card"><div className="stat-card-label">Buoni (costo oratorio)</div><div className="stat-card-val" style={{color:'#7c3aed'}}>- {EUR(incassoBuoni)}</div></div>}
        {incassoOmaggio > 0 && <div className="stat-card"><div className="stat-card-label">Omaggi (valore)</div><div className="stat-card-val" style={{color:'var(--green)'}}>{EUR(incassoOmaggio)}</div></div>}
        {qtaOmaggi > 0 && <div className="stat-card"><div className="stat-card-label">Pezzi omaggiati</div><div className="stat-card-val" style={{color:'var(--green)'}}>{qtaOmaggi}</div></div>}
        <div className="stat-card"><div className="stat-card-label">↩ Stornati</div><div className="stat-card-val">{stornati}</div></div>
        <div className="stat-card"><div className="stat-card-label">Pezzi venduti</div><div className="stat-card-val">{venduto.reduce((s,v)=>s+v.qta,0)}</div></div>
      </div>

      {/* Venduto per prodotto */}
      <div className="table-box" style={{ marginBottom:16 }}>
        <div className="table-box-head">Venduto per prodotto</div>
        <table>
          <thead><tr><th>Prodotto</th><th>Qtà totale</th><th>di cui omaggi</th><th>Qtà pagata</th><th>Totale</th></tr></thead>
          <tbody>
            {venduto.map((v, i) => (
              <tr key={i}>
                <td style={{ fontWeight:600 }}>{v.nome}</td>
                <td>{v.qta + (v.omaggi || 0)}</td>
                <td style={{ color:'var(--green)' }}>{v.omaggi || '—'}</td>
                <td>{v.qta}</td>
                <td style={{ fontWeight:700, color:'var(--accent2)', fontFamily:'Barlow Condensed', fontSize:15 }}>{EUR(v.tot)}</td>
              </tr>
            ))}
            {venduto.length > 0 && (
              <tr style={{ fontWeight:700, background:'var(--surf2)' }}>
                <td>TOTALE</td>
                <td>{venduto.reduce((s,v)=>s+v.qta+(v.omaggi||0),0)}</td>
                <td style={{ color:'var(--green)' }}>{venduto.reduce((s,v)=>s+(v.omaggi||0),0)||'—'}</td>
                <td>{venduto.reduce((s,v)=>s+v.qta,0)}</td>
                <td style={{ color:'var(--green)', fontFamily:'Barlow Condensed', fontSize:15 }}>{EUR(valoreVenduto)}</td>
              </tr>
            )}
            {!venduto.length && <tr><td colSpan={4} style={{ color:'var(--text3)', textAlign:'center', padding:20 }}>Nessun dato</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Storico scontrini */}
      <div className="table-box">
        <div className="table-box-head" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>
            Storico scontrini
            {vista !== 'corrente' && (
              <span style={{ marginLeft:8, fontSize:11, fontWeight:400, color:'var(--text3)',
                background:'var(--surf2)', border:'1px solid var(--border)',
                borderRadius:4, padding:'2px 7px' }}>
                sola lettura
              </span>
            )}
          </span>
          {utente?.ruolo === 'admin' && (
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => eliminaScontriniPeriodo(false)} disabled={eliminando || !scontrini.length}
                style={{ padding:'4px 10px', fontSize:12, background:'#fef2f2', color:'var(--red)', border:'1px solid #fecaca', borderRadius:6, cursor: (eliminando || !scontrini.length) ? 'default' : 'pointer', fontWeight:600, opacity: (eliminando || !scontrini.length) ? .5 : 1 }}>
                {eliminando ? '...' : vista === 'sessione' ? 'Elimina sessione' : vista === 'perdata' ? 'Elimina periodo' : 'Elimina corrente'}
              </button>
              <button onClick={() => eliminaScontriniPeriodo(true)} disabled={eliminando}
                title="Elimina tutti gli scontrini e tutte le sessioni archiviate"
                style={{ padding:'4px 10px', fontSize:12, background:'var(--red)', color:'#fff', border:'none', borderRadius:6, cursor: eliminando ? 'default' : 'pointer', fontWeight:600, opacity: eliminando ? .5 : 1 }}>
                {eliminando ? '...' : '⚠ Elimina tutto'}
              </button>
            </div>
          )}
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th><th>Data/Ora</th><th>Operatore</th>
              <th>Lordo</th><th>Buono</th><th>Netto</th>
              <th>Pagamento</th><th>Stato</th>
            </tr>
          </thead>
          <tbody>
            {scontriniVista.map(s => (
              <tr key={s.id} style={{ opacity: s.stornato ? .55 : 1 }}>
                <td style={{ fontWeight:700, fontFamily:'Barlow Condensed' }}>#{String(s.numero).padStart(4,'0')}</td>
                <td>{new Date(s.data_ora).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</td>
                <td style={{ fontSize:12, color:'var(--text2)' }}>{s.postazione||'—'}</td>
                <td style={{ color:'var(--text2)' }}>{EUR(s.totale_lordo)}</td>
                <td style={{ color:'#7c3aed' }}>{s.importo_buono > 0 ? '- '+EUR(s.importo_buono) : '—'}</td>
                <td style={{ fontWeight:700, color:'var(--accent2)', fontFamily:'Barlow Condensed', fontSize:15 }}>{EUR(s.totale_netto)}</td>
                <td style={{ textTransform:'capitalize' }}>{s.tipo_pagamento}</td>
                <td><span className={`badge ${s.stornato?'badge-storno':'badge-ok'}`}>{s.stornato?'Stornato':'OK'}</span></td>
              </tr>
            ))}
            {!scontriniVista.length && <tr><td colSpan={8} style={{ color:'var(--text3)', textAlign:'center', padding:20 }}>Nessuno scontrino</td></tr>}
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
