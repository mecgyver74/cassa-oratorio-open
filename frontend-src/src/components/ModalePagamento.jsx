import { useState } from 'react'

const EUR = v => '€ ' + Number(v).toFixed(2).replace('.', ',')

// Tagli banconote e monete euro
const BANCONOTE = [500, 200, 100, 50, 20, 10, 5]
const MONETE = [
  { v: 2,    label: '2€' },
  { v: 1,    label: '1€' },
  { v: 0.5,  label: '50c' },
  { v: 0.2,  label: '20c' },
  { v: 0.1,  label: '10c' },
  { v: 0.05, label: '5c' },
]

export default function ModalePagamento({ totale, onConferma, onAnnulla }) {
  const [tipo, setTipo] = useState('contanti')
  const [npStr, setNpStr] = useState('')
  const [tagli, setTagli] = useState([])

  const sommaTagli = tagli.reduce((s, v) => s + v, 0)
  const haTagli = tagli.length > 0

  const ric = tipo === 'carta' ? totale
    : tipo === 'omaggio' ? 0
    : haTagli ? sommaTagli
    : (parseFloat(npStr) || 0)

  const resto = ric - totale
  const pagatoEsatto = !haTagli && npStr === '' && tipo === 'contanti'
  const canConferma = tipo === 'carta' || tipo === 'omaggio' || pagatoEsatto || ric >= totale

  const np = v => {
    if (tipo !== 'contanti') return
    if (haTagli) return
    if (v === 'X') setNpStr(s => s.slice(0, -1))
    else if (v === '.') setNpStr(s => s.includes('.') ? s : s + '.')
    else setNpStr(s => s + v)
  }

  const aggiungiTaglio = (val) => {
    if (tipo !== 'contanti') return
    setNpStr('')
    setTagli(prev => [...prev, val])
  }

  const resetTagli = () => {
    setTagli([])
    setNpStr('')
  }

  const importoDisplay = tipo === 'carta'
    ? totale.toFixed(2).replace('.', ',')
    : tipo === 'omaggio' ? '0,00'
    : haTagli ? sommaTagli.toFixed(2).replace('.', ',')
    : npStr.replace('.', ',') || ''

  const handleConferma = () => {
    const pagato = pagatoEsatto ? totale : ric
    onConferma({ tipoPagamento: tipo, pagato })
  }

  const taglioBtnStyle = {
    padding: '5px 0', borderRadius: 6, border: '1px solid var(--border)',
    background: 'var(--surf2)', cursor: 'pointer', fontWeight: 700,
    fontSize: 13, color: 'var(--text)', flex: '1 1 0', textAlign: 'center',
    minWidth: 0,
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onAnnulla()}>
      <div className="modal" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <h3>💳 Pagamento</h3>
        <div className="modal-tot">{EUR(totale)}</div>

        <div className="pag-tipos">
          {[['contanti','💵 Contanti'],['carta','💳 Carta'],['omaggio','🎁 Omaggio']].map(([k,l]) => (
            <button key={k} className={`pag-tipo-btn ${tipo===k?'active':''}`}
              onClick={() => { setTipo(k); setNpStr(''); setTagli([]) }}>{l}</button>
          ))}
        </div>

        {tipo === 'contanti' && (
          <>
            {/* Banconote — tutte su una riga */}
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 3, fontWeight: 600 }}>
                BANCONOTE
              </div>
              <div style={{ display: 'flex', gap: 3 }}>
                {BANCONOTE.map(v => (
                  <button key={v} onClick={() => aggiungiTaglio(v)} style={taglioBtnStyle}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Monete — tutte su una riga */}
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 3, fontWeight: 600 }}>
                MONETE
              </div>
              <div style={{ display: 'flex', gap: 3 }}>
                {MONETE.map(t => (
                  <button key={t.v} onClick={() => aggiungiTaglio(t.v)} style={taglioBtnStyle}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tagli selezionati */}
            {haTagli && (
              <div style={{ background: 'var(--surf2)', borderRadius: 8, padding: '5px 10px',
                marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>Ricevuto:</span>
                {tagli.map((v, i) => (
                  <span key={i} style={{ background: 'var(--accent)', color: '#000',
                    borderRadius: 4, padding: '1px 6px', fontSize: 12, fontWeight: 700 }}>
                    {v >= 1 ? `€${v}` : `${Math.round(v*100)}c`}
                  </span>
                ))}
                <button onClick={resetTagli}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none',
                    color: 'var(--red)', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                  ✕ Reset
                </button>
              </div>
            )}

            <label className="modal-label" style={{ marginBottom: 2 }}>
              Oppure inserisci importo{' '}
              <span style={{color:'var(--text3)',fontWeight:400}}>(facoltativo)</span>
            </label>
            <input className="modal-importo" readOnly
              value={haTagli ? '' : importoDisplay}
              placeholder={haTagli ? 'Usa i tagli sopra' : 'Lascia vuoto = esatto'}
              style={{ opacity: haTagli ? 0.4 : 1 }} />

            <div className="numpad">
              {['1','2','3','4','5','6','7','8','9','0','.','X'].map(n => (
                <button key={n} className="np-btn" onClick={() => np(n)}
                  disabled={haTagli}>
                  {n === 'X' ? '⌫' : n}
                </button>
              ))}
            </div>
          </>
        )}

        {tipo === 'contanti' && (
          <div className="resto-box">
            {pagatoEsatto
              ? <div style={{ textAlign:'center', color:'var(--green2)', fontWeight:600, fontSize:13 }}>
                  Pagamento esatto — nessun resto
                </div>
              : (haTagli || npStr.length > 0) && (
                <>
                  <div className="resto-label">{resto < 0 ? 'Mancante' : 'Resto'}</div>
                  <div className={`resto-val ${resto < 0 ? 'neg' : ''}`}>{EUR(Math.abs(resto))}</div>
                </>
              )
            }
          </div>
        )}

        <div className="modal-btns">
          <button className="modal-btn-annulla" onClick={onAnnulla}>Annulla</button>
          <button className="modal-btn-ok" disabled={!canConferma} onClick={handleConferma}>
            ✓ Conferma
          </button>
        </div>
      </div>
    </div>
  )
}
