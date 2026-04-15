import { useState, useEffect } from 'react'
import pb from '../lib/pb'
import { useToast } from './Toast'

const EUR = v => '€ ' + Number(v || 0).toFixed(2).replace('.', ',')
const fmt = iso => iso ? new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'

export default function ModaleChiusuraCassa({ utente, onChiusa, onClose }) {
  const toast = useToast()
  const [attivi, setAttivi]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [step, setStep]             = useState('preview') // preview | conferma | salvataggio | done
  const [nomeSessione, setNome]     = useState('')
  const [sessioneCreata, setSess]   = useState(null)
  const [progresso, setProgresso]   = useState(0)

  useEffect(() => { caricaAttivi() }, [])

  const caricaAttivi = async () => {
    setLoading(true)
    try {
      pb.autoCancellation(false)
      const sc = await pb.collection('scontrini').getFullList({
        filter: 'sessione=""', sort: 'numero',
        fields: 'id,numero,data_ora,totale_netto,totale_lordo,tipo_pagamento,stornato'
      })
      setAttivi(sc)
    } catch(e) {
      toast('Errore caricamento: ' + e.message, 'r')
    } finally {
      pb.autoCancellation(true)
      setLoading(false)
    }
  }

  // Calcoli riepilogo
  const validi   = attivi.filter(s => !s.stornato)
  const stornati = attivi.filter(s => s.stornato)
  const totNetto      = validi.reduce((s, x) => s + (x.totale_netto || 0), 0)
  const totContanti   = validi.filter(s => s.tipo_pagamento === 'contanti').reduce((s, x) => s + (x.totale_netto || 0), 0)
  const totCarta      = validi.filter(s => s.tipo_pagamento === 'carta').reduce((s, x) => s + (x.totale_netto || 0), 0)
  const totOmaggi     = validi.filter(s => s.tipo_pagamento === 'omaggio').reduce((s, x) => s + (x.totale_lordo || 0), 0)
  const primoNum      = validi.length ? Math.min(...validi.map(s => s.numero)) : 0
  const ultimoNum     = validi.length ? Math.max(...validi.map(s => s.numero)) : 0
  const primaOra      = attivi.length ? attivi[0].data_ora : null
  const ultimaOra     = attivi.length ? attivi[attivi.length - 1].data_ora : null

  const chiudiCassa = async () => {
    setStep('salvataggio')
    setProgresso(0)
    try {
      pb.autoCancellation(false)

      // Numero progressivo sessione
      const lastSess = await pb.collection('sessioni_cassa').getList(1, 1, {
        sort: '-numero_sessione', fields: 'numero_sessione'
      })
      const numSess = (lastSess.items[0]?.numero_sessione || 0) + 1

      // Crea record sessione
      const data = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
      const sess = await pb.collection('sessioni_cassa').create({
        numero_sessione: numSess,
        nome:            nomeSessione.trim() || `Sessione ${numSess} — ${data}`,
        aperta_il:       primaOra || new Date().toISOString(),
        chiusa_il:       new Date().toISOString(),
        chiusa_da:       utente?.id || '',
        scontrini_count: validi.length,
        totale_netto:    totNetto,
        totale_contanti: totContanti,
        totale_carta:    totCarta,
        totale_omaggi:   totOmaggi,
        primo_numero:    primoNum,
        ultimo_numero:   ultimoNum,
      })

      // Collega tutti gli scontrini (inclusi stornati) alla sessione
      let done = 0
      for (const sc of attivi) {
        await pb.collection('scontrini').update(sc.id, { sessione: sess.id })
        done++
        setProgresso(Math.round(done / attivi.length * 100))
      }

      setSess(sess)
      setStep('done')
      onChiusa && onChiusa(sess)
    } catch(e) {
      toast('Errore durante la chiusura: ' + e.message, 'r')
      setStep('conferma')
    } finally {
      pb.autoCancellation(true)
    }
  }

  // ── Overlay ──────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16,
    }} onClick={e => { if (e.target === e.currentTarget && step !== 'salvataggio') onClose() }}>
      <div style={{
        background: 'var(--surf)', borderRadius: 16, width: '100%', maxWidth: 520,
        boxShadow: '0 20px 60px rgba(0,0,0,.5)', overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'Barlow Condensed', fontWeight: 900, fontSize: 22, color: '#f59e0b', letterSpacing: 1 }}>
              CHIUSURA CASSA
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
              Archivia la sessione corrente e azzera il contatore
            </div>
          </div>
          {step !== 'salvataggio' && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
          )}
        </div>

        <div style={{ padding: '20px 24px' }}>

          {/* STEP: loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Caricamento dati sessione...</div>
          )}

          {/* STEP: preview + conferma */}
          {!loading && (step === 'preview' || step === 'conferma') && (<>

            {/* Riepilogo sessione corrente */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <StatCard label="Scontrini validi"  val={validi.length}       big />
              <StatCard label="Incasso netto"      val={EUR(totNetto)}       big green />
              <StatCard label="Contanti"           val={EUR(totContanti)} />
              <StatCard label="Carta"              val={EUR(totCarta)} />
              {totOmaggi > 0 && <StatCard label="Omaggi (lordo)" val={EUR(totOmaggi)} />}
              {stornati.length > 0 && <StatCard label="Stornati" val={stornati.length} warn />}
            </div>

            {attivi.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14, textAlign: 'center' }}>
                Scontrini #{primoNum} — #{ultimoNum} &nbsp;·&nbsp; {fmt(primaOra)} → {fmt(ultimaOra)}
              </div>
            )}

            {attivi.length === 0 && (
              <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text3)', fontSize: 14, marginBottom: 12 }}>
                Nessuno scontrino nella sessione corrente.
              </div>
            )}

            {/* Nome sessione */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
                Nome sessione <span style={{ fontWeight: 400, color: 'var(--text3)' }}>(opzionale)</span>
              </label>
              <input
                value={nomeSessione}
                onChange={e => setNome(e.target.value)}
                placeholder={`es. Serata del ${new Date().toLocaleDateString('it-IT')}`}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '9px 12px', fontSize: 14,
                  background: 'var(--surf2)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text)',
                }}
              />
            </div>

            {step === 'preview' && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onClose} style={btnStyle('secondary')}>Annulla</button>
                <button onClick={() => setStep('conferma')} style={btnStyle('primary')}>
                  Chiudi cassa →
                </button>
              </div>
            )}

            {step === 'conferma' && (
              <div style={{ background: 'rgba(220,38,38,.08)', border: '1px solid rgba(220,38,38,.3)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: 'var(--red)', marginBottom: 6, fontSize: 14 }}>
                  ⚠ Operazione irreversibile
                </div>
                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
                  Gli scontrini saranno archiviati e il numeratore verrà azzerato.
                  Potrai comunque visualizzarli in <b>Statistiche → Sessioni</b>.
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button onClick={() => setStep('preview')} style={btnStyle('secondary')}>← Indietro</button>
                  <button onClick={chiudiCassa} style={btnStyle('danger')}>
                    Conferma chiusura
                  </button>
                </div>
              </div>
            )}
          </>)}

          {/* STEP: salvataggio */}
          {step === 'salvataggio' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>
                Archiviazione in corso...
              </div>
              <div style={{ background: 'var(--surf2)', borderRadius: 999, height: 10, overflow: 'hidden', marginBottom: 10 }}>
                <div style={{
                  height: '100%', borderRadius: 999,
                  background: 'linear-gradient(90deg, #f59e0b, #16a34a)',
                  width: progresso + '%', transition: 'width .3s',
                }} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>
                {progresso}% — {Math.round(attivi.length * progresso / 100)}/{attivi.length} scontrini
              </div>
            </div>
          )}

          {/* STEP: done */}
          {step === 'done' && sessioneCreata && (
            <div style={{ textAlign: 'center', padding: '10px 0 6px' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
                Cassa chiusa!
              </div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 18 }}>
                {sessioneCreata.nome}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                <StatCard label="Scontrini"    val={sessioneCreata.scontrini_count} big />
                <StatCard label="Incasso netto" val={EUR(sessioneCreata.totale_netto)} big green />
              </div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
                Il prossimo scontrino inizierà da <b>#0001</b>
              </div>
              <button onClick={onClose} style={btnStyle('primary')}>Chiudi</button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function StatCard({ label, val, big, green, warn }) {
  return (
    <div style={{
      background: 'var(--surf2)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '10px 14px',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>{label}</div>
      <div style={{
        fontFamily: big ? 'Barlow Condensed' : undefined,
        fontSize: big ? 22 : 16, fontWeight: 700,
        color: green ? 'var(--green)' : warn ? 'var(--red)' : 'var(--text)',
      }}>{val}</div>
    </div>
  )
}

function btnStyle(type) {
  const base = { flex: 1, padding: '11px 0', fontSize: 14, fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer' }
  if (type === 'primary') return { ...base, background: '#16a34a', color: '#fff' }
  if (type === 'danger')  return { ...base, background: 'var(--red)', color: '#fff' }
  return { ...base, background: 'var(--surf2)', border: '1px solid var(--border)', color: 'var(--text2)' }
}
