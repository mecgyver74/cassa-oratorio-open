import { useState } from 'react'

const EUR = v => '€ ' + Number(v).toFixed(2).replace('.', ',')

export default function ModalePagamento({ totale, onConferma, onAnnulla }) {
  const [tipo, setTipo] = useState('contanti')
  const [npStr, setNpStr] = useState('')

  const ric = tipo === 'carta' ? totale : tipo === 'omaggio' ? 0 : (parseFloat(npStr) || 0)
  const resto = ric - totale
  const pagatoEsatto = npStr === '' && tipo === 'contanti'

  const np = v => {
    if (tipo !== 'contanti') return
    if (v === 'X') setNpStr(s => s.slice(0, -1))
    else if (v === '.') setNpStr(s => s.includes('.') ? s : s + '.')
    else setNpStr(s => s + v)
  }

  const importoDisplay = tipo === 'carta'
    ? totale.toFixed(2).replace('.', ',')
    : tipo === 'omaggio' ? '0,00'
    : npStr.replace('.', ',') || ''

  // Se campo vuoto + contanti = pagamento esatto (OK senza inserire importo)
  const canConferma = tipo === 'carta' || tipo === 'omaggio' || pagatoEsatto || ric >= totale

  const handleConferma = () => {
    const pagato = pagatoEsatto ? totale : ric
    onConferma({ tipoPagamento: tipo, pagato })
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onAnnulla()}>
      <div className="modal">
        <h3>💳 Pagamento</h3>
        <div className="modal-tot">{EUR(totale)}</div>

        <div className="pag-tipos">
          {[['contanti','💵 Contanti'],['carta','💳 Carta'],['omaggio','🎁 Omaggio']].map(([k,l]) => (
            <button key={k} className={`pag-tipo-btn ${tipo===k?'active':''}`}
              onClick={() => { setTipo(k); setNpStr('') }}>{l}</button>
          ))}
        </div>

        <label className="modal-label">Importo ricevuto <span style={{color:'var(--text3)',fontWeight:400}}>(facoltativo)</span></label>
        <input className="modal-importo" readOnly value={importoDisplay}
          placeholder="Lascia vuoto = esatto" />

        <div className="numpad">
          {['1','2','3','4','5','6','7','8','9'].map(n => (
            <button key={n} className="np-btn" onClick={() => np(n)}>{n}</button>
          ))}
          <button className="np-btn zero" onClick={() => np('0')}>0</button>
          <button className="np-btn" onClick={() => np('.')}>.</button>
          <button className="np-btn del" onClick={() => np('X')}>⌫</button>
        </div>

        {tipo === 'contanti' && (
          <div className="resto-box">
            {pagatoEsatto
              ? <div style={{ textAlign:'center', color:'var(--green2)', fontWeight:600, fontSize:13 }}>Pagamento esatto — nessun resto</div>
              : npStr.length > 0 && (
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
