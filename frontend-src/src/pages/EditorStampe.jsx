import { useState, useRef, useCallback, useEffect } from 'react'
import { getConfig, saveConfig, loadStampaConfig } from '../lib/stampa'
import { useToast } from '../components/Toast'
import { fsConfirm } from '../lib/fullscreen'

const FONTS = [
  "'Courier New', monospace",
  "Arial, sans-serif",
  "'Times New Roman', serif",
  "Verdana, sans-serif",
  "Georgia, serif",
  "'Lucida Console', monospace",
]

const DEMO_SCONTRINO = {
  numero: 42,
  data_ora: new Date().toISOString(),
  postazione: 'Cassa 1',
  tavolo: '5',
  note: 'Nessuna cipolla',
  totale_lordo: 18.50,
  sconto_euro: 1.50,
  sconto_perc: 0,
  totale_netto: 17.00,
  tipo_pagamento: 'contanti',
  pagato: 20.00,
}
const DEMO_RIGHE = [
  { id:1, nome_snapshot: 'Hamburger Classico', quantita: 2, prezzo_snapshot: 5.00, totale_riga: 10.00, omaggio: false, note: '', stornata: false },
  { id:2, nome_snapshot: 'Coca Cola latt.', quantita: 2, prezzo_snapshot: 1.50, totale_riga: 3.00, omaggio: false, note: '', stornata: false },
  { id:3, nome_snapshot: 'Patatine Fritte', quantita: 1, prezzo_snapshot: 2.50, totale_riga: 2.50, omaggio: false, note: '', stornata: false },
  { id:4, nome_snapshot: 'Acqua Nat.', quantita: 1, prezzo_snapshot: 1.00, totale_riga: 0, omaggio: true, note: '', stornata: false },
]
const DEMO_RIGHE_COMANDA = [
  { nome_snapshot: 'Hamburger Classico', quantita: 2, note: 'senza cipolla' },
  { nome_snapshot: 'Patatine Fritte', quantita: 1, note: '' },
]

function Preview({ cfg, tipo }) {
  const nome = cfg.nomeLoc || 'Oratorio'
  const ind = cfg.indirizzo || ''
  const fontFamily = tipo === 'comanda' ? (cfg.fontComanda || "'Courier New', monospace") : (cfg.fontFamily || "'Courier New', monospace")
  const fontSize = tipo === 'comanda' ? (cfg.fontSizeComanda || 14) : (cfg.fontSize || 11)
  const larghezza = cfg.larghezza || 80

  if (tipo === 'scontrino') {
    const footer = cfg.footerScontrino || 'Grazie e arrivederci!'
    const layout = cfg.colonneLayout || 'standard'
    return (
      <div style={{ fontFamily, fontSize, width: larghezza + 'mm', maxWidth: '100%',
        background: '#fff', color: '#000', padding: 8, border: '1px solid #ddd',
        borderRadius: 4, boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}>
        {cfg.mostraLogo && cfg.logoUrl && (
          <div style={{ textAlign: 'center', marginBottom: 4 }}>
            <img src={cfg.logoUrl} style={{ maxHeight: 40 }} alt="logo" />
          </div>
        )}
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: fontSize + 4 }}>{nome}</div>
        {ind && <div style={{ textAlign: 'center' }}>{ind}</div>}
        <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '3px 0' }} />
        {cfg.mostraData !== false && <div>Data: {new Date().toLocaleString('it-IT')}</div>}
        <div>Scontrino n. 0042</div>
        <div>Tavolo: 5</div>
        <div style={{ fontStyle: 'italic', fontSize: fontSize - 1 }}>Note: Nessuna cipolla</div>
        <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '3px 0' }} />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          {layout !== 'compatto' && (
            <thead><tr>
              <th style={{ textAlign: 'left' }}>Prodotto</th>
              <th>Qta</th>
              {layout === 'dettagliato' && <th style={{ textAlign: 'right' }}>P.um</th>}
              <th style={{ textAlign: 'right' }}>Tot</th>
            </tr></thead>
          )}
          <tbody>
            {DEMO_RIGHE.map((r,i) => (
              <tr key={i}>
                {layout === 'compatto'
                  ? <><td>{r.quantita}x {r.nome_snapshot}{r.omaggio?' (OM)':''}</td><td style={{textAlign:'right'}}>{r.omaggio?'—':'€'+r.totale_riga.toFixed(2)}</td></>
                  : <><td>{r.nome_snapshot}{r.omaggio?' (OM)':''}</td><td style={{textAlign:'center'}}>{r.quantita}</td>{layout==='dettagliato'&&<td style={{textAlign:'right'}}>€{r.prezzo_snapshot.toFixed(2)}</td>}<td style={{textAlign:'right'}}>{r.omaggio?'—':'€'+r.totale_riga.toFixed(2)}</td></>
                }
              </tr>
            ))}
          </tbody>
        </table>
        <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '3px 0' }} />
        <div style={{ textAlign: 'right' }}>Sconto: - €1.50</div>
        <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: fontSize + 3 }}>TOTALE: €17.00</div>
        <div style={{ textAlign: 'right' }}>Contanti · Resto: €3.00</div>
        <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '3px 0' }} />
        <div style={{ textAlign: 'center' }}>{footer}</div>
      </div>
    )
  }

  // Comanda
  const fontSizeComanda = cfg.fontSizeComanda || 14
  return (
    <div style={{ fontFamily, fontSize: fontSizeComanda, width: larghezza + 'mm', maxWidth: '100%',
      background: '#fff', color: '#000', padding: 8, border: '1px solid #ddd',
      borderRadius: 4, boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}>
      <div style={{ textAlign: 'center', fontSize: 10 }}>{nome}</div>
      <div style={{ textAlign: 'center', fontSize: fontSizeComanda + 8, fontWeight: 900,
        border: '3px solid #000', padding: '3px', margin: '3px 0', textTransform: 'uppercase' }}>
        GRIGLIA
      </div>
      {cfg.mostraNumero !== false && <div style={{ fontWeight: 'bold' }}>Scontrino #0042</div>}
      {cfg.mostraOrario !== false && <div>{new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}</div>}
      {cfg.mostraTavolo !== false && (
        <div style={{ fontSize: fontSizeComanda + 4, fontWeight: 900, borderBottom: '2px solid #000' }}>
          TAVOLO 5
        </div>
      )}
      <div style={{ fontStyle: 'italic', fontSize: fontSizeComanda - 2 }}>Note: Nessuna cipolla</div>
      <hr style={{ border: 'none', borderTop: '2px solid #000', margin: '3px 0' }} />
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {DEMO_RIGHE_COMANDA.map((r,i) => (
            <tr key={i}>
              <td style={{ fontSize: cfg.evidenziaQta !== false ? fontSizeComanda+6 : fontSizeComanda, fontWeight: 'bold', verticalAlign: 'top', paddingRight: 8, whiteSpace: 'nowrap' }}>
                {r.quantita}x
              </td>
              <td style={{ fontSize: fontSizeComanda, fontWeight: 'bold', padding: '2px 0' }}>
                {r.nome_snapshot}
                {r.note && <div style={{ fontSize: fontSizeComanda-2, fontWeight: 'normal' }}>{r.note}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function EditorStampe() {
  const toast = useToast()
  const [cfg, setCfg] = useState(() => getConfig())
  const [tab, setTab] = useState('scontrino')

  // Ricarica dal DB se la cache sync era vuota
  useEffect(() => { loadStampaConfig().then(c => { if (c && Object.keys(c).length > 0) setCfg(c) }) }, [])

  const set = (k, v) => setCfg(prev => ({ ...prev, [k]: v }))

  const salva = () => {
    saveConfig(cfg)
    toast('Configurazione stampe salvata!', 'v')
  }

  const reset = () => {
    if (!fsConfirm('Ripristinare le impostazioni predefinite?')) return
    const def = {}
    saveConfig(def)
    setCfg(def)
    toast('Impostazioni ripristinate', 'b')
  }

  const Sl = ({ label, children, help }) => (
    <div className="fg" style={{ marginBottom: 14 }}>
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{label}</span>
        {help && <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>{help}</span>}
      </label>
      {children}
    </div>
  )

  const CB = ({ label, k, help }) => (
    <div className="cb-row" style={{ marginBottom: 10 }}>
      <input type="checkbox" checked={cfg[k] !== false} onChange={e => set(k, e.target.checked)} />
      <span>{label}</span>
      {help && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{help}</span>}
    </div>
  )

  const NumInput = ({ label, k, min, max, step, help }) => (
    <Sl label={label} help={help}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="range" min={min} max={max} step={step || 1}
          value={cfg[k] !== undefined ? cfg[k] : (k==='fontSize'?11:k==='fontSizeComanda'?14:k==='larghezza'?80:k==='marginePagina'?2:6)}
          onChange={e => set(k, parseInt(e.target.value))}
          style={{ flex: 1 }} />
        <span style={{ minWidth: 36, fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: 16,
          background: 'var(--surf2)', padding: '2px 8px', borderRadius: 6, textAlign: 'center' }}>
          {cfg[k] !== undefined ? cfg[k] : (k==='fontSize'?11:k==='fontSizeComanda'?14:k==='larghezza'?80:k==='marginePagina'?2:6)}
        </span>
      </div>
    </Sl>
  )

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', padding: 18 }}>
      {/* Pannello controlli */}
      <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Tab scontrino/comanda */}
        <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {[['scontrino','Scontrino'],['comanda','Comanda']].map(([k,l]) => (
            <button key={k} className={'prodotti-tab ' + (tab===k?'active':'')} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        {/* Impostazioni comuni */}
        <div className="setup-box">
          <div className="setup-box-head"><h3>Impostazioni generali</h3></div>
          <div className="setup-form">
            <Sl label="Nome locale / oratorio">
              <input key={'nomeLoc'+String(cfg.nomeLoc)} defaultValue={cfg.nomeLoc||''} onBlur={e=>set('nomeLoc',e.target.value)} placeholder="es. Oratorio San Giuseppe" className="fg input" style={{ width:'100%', background:'var(--surf2)', border:'1px solid var(--border)', borderRadius:'var(--rs)', padding:'8px 10px', color:'var(--text)', fontSize:14 }} />
            </Sl>
            <Sl label="Indirizzo">
              <input key={'indirizzo'+String(cfg.indirizzo)} defaultValue={cfg.indirizzo||''} onBlur={e=>set('indirizzo',e.target.value)} placeholder="es. Via Roma 1 - Milano" style={{ width:'100%', background:'var(--surf2)', border:'1px solid var(--border)', borderRadius:'var(--rs)', padding:'8px 10px', color:'var(--text)', fontSize:14 }} />
            </Sl>
            <NumInput label="Larghezza carta (mm)" k="larghezza" min={58} max={120} help="58mm / 80mm / 112mm" />
            <NumInput label="Margine stampa (mm)" k="marginePagina" min={0} max={15} step={1} help="0-2mm per termiche, 5-10mm per A4" />
          </div>
        </div>

        {/* Scontrino */}
        {tab === 'scontrino' && (
          <div className="setup-box">
            <div className="setup-box-head"><h3>Layout scontrino</h3></div>
            <div className="setup-form">
              <Sl label="Font">
                <select value={cfg.fontFamily||FONTS[0]} onChange={e=>set('fontFamily',e.target.value)}
                  style={{ width:'100%', background:'var(--surf2)', border:'1px solid var(--border)', borderRadius:'var(--rs)', padding:'8px 10px', color:'var(--text)', fontSize:13, fontFamily: cfg.fontFamily }}>
                  {FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f.split(',')[0].replace(/'/g,'')}</option>)}
                </select>
              </Sl>
              <NumInput label="Dimensione font (px)" k="fontSize" min={8} max={16} />
              <Sl label="Layout colonne">
                <select value={cfg.colonneLayout||'standard'} onChange={e=>set('colonneLayout',e.target.value)}
                  style={{ width:'100%', background:'var(--surf2)', border:'1px solid var(--border)', borderRadius:'var(--rs)', padding:'8px 10px', color:'var(--text)', fontSize:13 }}>
                  <option value="standard">Standard (prodotto · qta · totale)</option>
                  <option value="compatto">Compatto (qta x prodotto · totale)</option>
                  <option value="dettagliato">Dettagliato (prodotto · qta · p.um · totale)</option>
                </select>
              </Sl>
              <Sl label="Testo piede scontrino">
                <input key={'footerScontrino'+String(cfg.footerScontrino)} defaultValue={cfg.footerScontrino||''} onBlur={e=>set('footerScontrino',e.target.value)}
                  placeholder="es. Grazie e arrivederci!"
                  style={{ width:'100%', background:'var(--surf2)', border:'1px solid var(--border)', borderRadius:'var(--rs)', padding:'8px 10px', color:'var(--text)', fontSize:14 }} />
              </Sl>
              <CB label="Stampa scontrino automaticamente" k="stampaScontrino" />
              <CB label="Mostra data e ora" k="mostraData" />
              <CB label="Mostra nome cassa" k="mostraCassa" />
              <CB label="Mostra totale" k="mostraTotale" />
              <Sl label="Logo (URL immagine)" help="opzionale">
                <input key={'logoUrl'+String(cfg.logoUrl)} defaultValue={cfg.logoUrl||''} onBlur={e=>set('logoUrl',e.target.value)}
                  placeholder="https://... oppure lascia vuoto"
                  style={{ width:'100%', background:'var(--surf2)', border:'1px solid var(--border)', borderRadius:'var(--rs)', padding:'8px 10px', color:'var(--text)', fontSize:12 }} />
                <div className="cb-row" style={{ marginTop: 6 }}>
                  <input type="checkbox" checked={!!cfg.mostraLogo} onChange={e=>set('mostraLogo',e.target.checked)} />
                  <span>Mostra logo</span>
                </div>
              </Sl>
            </div>
          </div>
        )}

        {/* Comanda */}
        {tab === 'comanda' && (
          <div className="setup-box">
            <div className="setup-box-head"><h3>Layout comanda cucina</h3></div>
            <div className="setup-form">
              <Sl label="Font comanda">
                <select value={cfg.fontComanda||FONTS[0]} onChange={e=>set('fontComanda',e.target.value)}
                  style={{ width:'100%', background:'var(--surf2)', border:'1px solid var(--border)', borderRadius:'var(--rs)', padding:'8px 10px', color:'var(--text)', fontSize:13, fontFamily: cfg.fontComanda }}>
                  {FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f.split(',')[0].replace(/'/g,'')}</option>)}
                </select>
              </Sl>
              <NumInput label="Dimensione font prodotti (px)" k="fontSizeComanda" min={10} max={24} />
              <CB label="Evidenzia quantità (font grande)" k="evidenziaQta" />
              <CB label="Mostra numero scontrino" k="mostraNumero" />
              <CB label="Mostra orario" k="mostraOrario" />
              <CB label="Mostra numero tavolo" k="mostraTavolo" />
            </div>
          </div>
        )}

        {/* Bottoni */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-salva" style={{ flex: 1 }} onClick={salva}>Salva</button>
          <button onClick={reset}
            style={{ padding: '10px 16px', background: 'var(--surf2)', border: '1px solid var(--border)',
              borderRadius: 'var(--r)', color: 'var(--text2)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            ↺ Reset
          </button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, background: 'var(--surf2)',
          border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
          <b>Stampante termica TM20:</b><br/>
          Usa Chrome · Menu Stampa · Imposta:<br/>
          • Stampante: TM20<br/>
          • Margini: Nessuno (o Minimi)<br/>
          • Formato: Personalizzato {cfg.larghezza||80}mm × auto<br/>
          • Scala: 100%
        </div>
      </div>

      {/* Anteprima */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="page-title" style={{ margin: 0 }}>
          {tab === 'scontrino' ? 'Anteprima scontrino' : 'Anteprima comanda'}
        </div>
        <div style={{ background: '#f3f4f6', borderRadius: 12, padding: 20, display: 'flex', justifyContent: 'center' }}>
          <div style={{ padding: `${cfg.marginePagina !== undefined ? cfg.marginePagina : 2}mm`, background: '#fff' }}>
            <Preview cfg={cfg} tipo={tab} />
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center' }}>
          ↑ Anteprima con dati di esempio — la stampa reale userà i dati dello scontrino
        </div>
      </div>
    </div>
  )
}