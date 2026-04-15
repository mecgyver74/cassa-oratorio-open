import { useState, useEffect } from 'react'
import pb from './lib/pb'
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

// ── SCHERMATA LOGIN PIN ──────────────────────────────────────
function LoginPin({ onLogin }) {
  const [pin, setPin] = useState('')
  const [errore, setErrore] = useState('')
  const [loading, setLoading] = useState(false)

  const digita = (n) => {
    setErrore('')
    if (pin.length < 8) setPin(p => p + n)
  }

  const cancella = () => setPin(p => p.slice(0, -1))
  const reset = () => { setPin(''); setErrore('') }

  const conferma = async () => {
    if (pin.length === 0) { setErrore('Inserisci il PIN'); return }
    setLoading(true)
    try {
      pb.autoCancellation(false)
      const utenti = await pb.collection('utenti').getFullList({ filter: `pin='${pin}' && attivo=true` })
      pb.autoCancellation(true)
      if (utenti.length === 0) {
        setErrore('PIN non valido')
        setPin('')
      } else {
        onLogin(utenti[0])
      }
    } catch (e) {
      pb.autoCancellation(true)
      setErrore('Errore di connessione')
      console.error(e)
    }
    setLoading(false)
  }

  // Invio con Enter
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Enter' && pin.length > 0) conferma() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [pin])

  // Supporto tastiera fisica
  useEffect(() => {
    const handler = (e) => {
      if (e.key >= '0' && e.key <= '9') digita(e.key)
      else if (e.key === 'Backspace') cancella()
      else if (e.key === 'Escape') reset()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [pin])

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    }}>
      <div style={{
        background: 'var(--surf)', borderRadius: 20, padding: '40px 36px', width: 320,
        boxShadow: '0 20px 60px rgba(0,0,0,.4)', textAlign: 'center',
      }}>
        <div style={{ fontFamily: 'Barlow Condensed', fontWeight: 900, fontSize: 28, color: '#f59e0b', letterSpacing: 1, marginBottom: 4 }}>
          CASSA <span style={{ color: 'var(--text2)', fontWeight: 400 }}>DALILA</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 28 }}>Inserisci il tuo PIN per accedere</div>

        {/* Display PIN */}
        <div style={{
          background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '14px 16px', marginBottom: 16, minHeight: 48, display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {pin.length === 0
            ? <span style={{ color: 'var(--text3)', fontSize: 14 }}>- - - -</span>
            : <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: 12, color: 'var(--text)' }}>
                {'●'.repeat(pin.length)}
              </span>
          }
        </div>

        {/* Errore */}
        {errore && (
          <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{errore}</div>
        )}

        {/* Tastierino */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          {['1','2','3','4','5','6','7','8','9'].map(n => (
            <button key={n} onClick={() => digita(n)} style={{
              padding: '14px 0', fontSize: 22, fontWeight: 700, borderRadius: 10,
              border: '1px solid var(--border)', background: 'var(--surf2)',
              color: 'var(--text)', cursor: 'pointer',
            }}>{n}</button>
          ))}
          <button onClick={reset} style={{
            padding: '14px 0', fontSize: 14, fontWeight: 600, borderRadius: 10,
            border: '1px solid var(--border)', background: 'var(--surf2)',
            color: 'var(--text3)', cursor: 'pointer',
          }}>C</button>
          <button onClick={() => digita('0')} style={{
            padding: '14px 0', fontSize: 22, fontWeight: 700, borderRadius: 10,
            border: '1px solid var(--border)', background: 'var(--surf2)',
            color: 'var(--text)', cursor: 'pointer',
          }}>0</button>
          <button onClick={cancella} style={{
            padding: '14px 0', fontSize: 18, fontWeight: 600, borderRadius: 10,
            border: '1px solid var(--border)', background: 'var(--surf2)',
            color: 'var(--text2)', cursor: 'pointer',
          }}>⌫</button>
        </div>

        {/* Pulsante conferma */}
        <button onClick={conferma} disabled={loading || pin.length === 0} style={{
          width: '100%', padding: '14px 0', fontSize: 16, fontWeight: 700, borderRadius: 10,
          border: 'none', background: pin.length > 0 ? '#16a34a' : 'var(--surf2)',
          color: pin.length > 0 ? '#fff' : 'var(--text3)', cursor: pin.length > 0 ? 'pointer' : 'default',
          transition: 'all .2s',
        }}>
          {loading ? 'Accesso...' : 'Accedi'}
        </button>
      </div>
    </div>
  )
}

// ── CLOCK ────────────────────────────────────────────────────
function Clock() {
  const [t, setT] = useState('')
  useEffect(() => {
    const tick = () => setT(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])
  return <span className="topbar-clock">{t}</span>
}

// ── APP PRINCIPALE ───────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState('cassa')
  const [utente, setUtente] = useState(null)

  // All'avvio: migra eventuali impostazioni da localStorage al DB e precarica config stampa
  useEffect(() => {
    migraLocalStorage().then(() => loadStampaConfig()).catch(console.error)
  }, [])

  const handleLogout = () => {
    if (!fsConfirm('Cambiare operatore?')) return
    setUtente(null)
    setPage('cassa')
  }

  // Se non loggato, mostra schermata PIN
  if (!utente) return (
    <ToastProvider>
      <LoginPin onLogin={setUtente} />
    </ToastProvider>
  )

  // Filtra pagine per ruolo: cassiere vede solo cassa e comande
  const pagesVisibili = utente.ruolo === 'admin'
    ? PAGES
    : PAGES.filter(p => ['cassa', 'comande'].includes(p))

  return (
    <ToastProvider>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div className="topbar" style={{ flexWrap: "nowrap", overflowX: "auto" }}>
          <div className="topbar-logo">CASSA <span>DALILA</span></div>
          <nav className="topbar-nav">
            {pagesVisibili.map(p => (
              <button key={p} className={`topbar-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>
                {PAGE_LABELS[p]}
              </button>
            ))}
          </nav>
          <Clock />
          <span className="topbar-utente" style={{ marginLeft: 8, cursor: 'pointer' }} onClick={handleLogout} title="Cambia operatore">
            {utente.nome} ({utente.ruolo})
          </span>
          <button
            title="Spegni la cassa"
            onClick={() => {
              if (!fsConfirm('Spegnere la cassa?')) return
              // Prova a chiudere la tab
              window.open('about:blank', '_self')
              window.close()
              // Se non riesce a chiudere, torna al login
              setTimeout(() => setUtente(null), 500)
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
          {page === 'statistiche'  && <div style={{ flex:1, overflowY:'auto' }}><Statistiche utente={utente} /></div>}
          {page === 'magazzino'    && <div style={{ flex:1, overflowY:'auto' }}><Magazzino /></div>}
          {page === 'setup'        && <div style={{ flex:1, overflowY:'auto' }}><Setup /></div>}
          {page === 'stampe'       && <div style={{ flex:1, overflowY:'auto' }}><EditorStampe /></div>}
          {page === 'comande'      && <ComandeDisplay />}
        </div>
      </div>
    </ToastProvider>
  )
}
