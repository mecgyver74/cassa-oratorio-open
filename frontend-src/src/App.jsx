import { useState, useEffect } from 'react'
import Cassa from './pages/Cassa'
import Statistiche from './pages/Statistiche'
import Magazzino from './pages/Magazzino'
import Setup from './pages/Setup'
import ComandeDisplay from './pages/ComandeDisplay'
import EditorStampe from './pages/EditorStampe'
import { ToastProvider } from './components/Toast'
import { migraLocalStorage } from './lib/config'
import { loadStampaConfig } from './lib/stampa'
import { fsConfirm } from './lib/fullscreen'
import './index.css'

const PAGES = ['cassa', 'statistiche', 'magazzino', 'setup', 'stampe', 'comande']
const PAGE_LABELS = {
  cassa: 'Cassa',
  statistiche: 'Statistiche',
  magazzino: 'Magazzino',
  setup: 'Setup',
  stampe: 'Stampe',
  comande: 'Comande'
}

function Clock() {
  const [t, setT] = useState('')
  useEffect(() => {
    const tick = () => setT(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])
  return <span className="topbar-clock">{t}</span>
}

export default function App() {
  const [page, setPage] = useState('cassa')
  const utente = { id: null, nome: 'Cassa 1', postazione: 'Cassa', ruolo: 'cassiere' }

  // All'avvio: migra eventuali impostazioni da localStorage al DB e precarica config stampa
  useEffect(() => {
    migraLocalStorage().then(() => loadStampaConfig()).catch(console.error)
  }, [])

  return (
    <ToastProvider>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div className="topbar" style={{ flexWrap: "nowrap", overflowX: "auto" }}>
          <div className="topbar-logo">CASSA <span>ORATORIO</span></div>
          <nav className="topbar-nav">
            {PAGES.map(p => (
              <button key={p} className={`topbar-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>
                {PAGE_LABELS[p]}
              </button>
            ))}
          </nav>
          <Clock />
          <span className="topbar-utente" style={{ marginLeft: 8 }}>{utente.postazione}</span>
          <button
            title="Spegni la cassa"
            onClick={() => {
              if (!fsConfirm('Spegnere la cassa?')) return
              window.close()
            }}
            style={{ marginLeft: 8, padding: '3px 10px', background: 'var(--red)',
              color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer',
              fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
            Spegni
          </button>
          <button
            title="Schermo intero"
            onClick={() => {
              if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {})
              else document.exitFullscreen().catch(() => {})
            }}
            style={{ marginLeft: 4, padding: '3px 8px', background: 'var(--surf2)',
              color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 6,
              cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>
            ⛶
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
          {page === 'cassa'        && <Cassa utente={utente} />}
          {page === 'statistiche'  && <div style={{ flex:1, overflowY:'auto' }}><Statistiche /></div>}
          {page === 'magazzino'    && <div style={{ flex:1, overflowY:'auto' }}><Magazzino /></div>}
          {page === 'setup'        && <div style={{ flex:1, overflowY:'auto' }}><Setup /></div>}
          {page === 'stampe'       && <div style={{ flex:1, overflowY:'auto' }}><EditorStampe /></div>}
          {page === 'comande'      && <ComandeDisplay />}
        </div>
      </div>
    </ToastProvider>
  )
}
