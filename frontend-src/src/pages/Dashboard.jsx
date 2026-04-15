import { useState, useEffect, useCallback } from 'react'
import pb from '../lib/pb'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const EUR     = v => '€ ' + Number(v || 0).toFixed(2).replace('.', ',')
const PCT     = (a, b) => b > 0 ? Math.round(a / b * 100) : 0
const fmtDay  = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) : ''
const fmtDt   = iso => iso ? new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'
function oggi() { return new Date().toISOString().slice(0, 10) }

const C = { amber: '#d97706', green: '#16a34a', blue: '#2563eb', red: '#dc2626', purple: '#7c3aed', teal: '#0d9488' }

export default function Dashboard() {
  // ── Vista ─────────────────────────────────────────────────────
  const [vista,     setVista]    = useState('corrente')   // corrente | sessione | perdata | tutto
  const [sessVista, setSessVista] = useState(null)
  const [dal,       setDal]      = useState(oggi())
  const [al,        setAl]       = useState(oggi())
  const [sessioni,  setSessioni] = useState([])

  // ── Dati ──────────────────────────────────────────────────────
  const [dati,    setDati]  = useState(null)
  const [loading, setLoad]  = useState(true)
  const [aggAt,   setAgg]   = useState(null)

  // Carica lista sessioni (per il dropdown)
  const caricaSessioni = useCallback(async () => {
    try {
      const s = await pb.collection('sessioni_cassa').getFullList({ sort: '-numero_sessione' })
      setSessioni(s)
    } catch(_) {}
  }, [])

  useEffect(() => { caricaSessioni() }, [caricaSessioni])

  // Costruisce i filtri in base alla vista
  const buildFilters = useCallback(() => {
    if (vista === 'corrente') {
      const ago90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      return {
        sc:    'sessione=""',
        righe: 'scontrino.sessione=""',
        trend: `data_ora>="${ago90} 00:00:00" && stornato=false`,
      }
    }
    if (vista === 'sessione' && sessVista) return {
      sc:    `sessione="${sessVista.id}"`,
      righe: `scontrino.sessione="${sessVista.id}"`,
      trend: `sessione="${sessVista.id}" && stornato=false`,
    }
    if (vista === 'perdata') return {
      sc:    `data_ora>="${dal} 00:00:00" && data_ora<="${al} 23:59:59"`,
      righe: `scontrino.data_ora>="${dal} 00:00:00" && scontrino.data_ora<="${al} 23:59:59"`,
      trend: `data_ora>="${dal} 00:00:00" && data_ora<="${al} 23:59:59" && stornato=false`,
    }
    // tutto
    return { sc: '', righe: '', trend: 'stornato=false' }
  }, [vista, sessVista, dal, al])

  const carica = useCallback(async () => {
    if (vista === 'sessione' && !sessVista) return
    setLoad(true)
    try {
      pb.autoCancellation(false)
      const f = buildFilters()
      const [sc, righe, trendSc] = await Promise.all([
        pb.collection('scontrini').getFullList({
          filter: f.sc, fields: 'id,data_ora,totale_netto,totale_lordo,tipo_pagamento,stornato', sort: 'data_ora',
        }),
        pb.collection('righe_scontrino').getFullList({
          filter: f.righe, fields: 'nome_snapshot,quantita,totale_riga,omaggio,stornata', expand: 'scontrino',
        }),
        pb.collection('scontrini').getFullList({
          filter: f.trend, fields: 'data_ora,totale_netto', sort: 'data_ora',
        }),
      ])
      setDati({ sc, righe, trendSc })
      setAgg(new Date())
    } catch(e) { console.error(e) }
    finally { pb.autoCancellation(true); setLoad(false) }
  }, [buildFilters, vista, sessVista])

  useEffect(() => { carica() }, [carica])

  // ── Etichetta vista attiva ────────────────────────────────────
  const labelVista = vista === 'corrente' ? 'Sessione Corrente'
    : vista === 'sessione' ? (sessVista?.nome || 'Sessione')
    : vista === 'perdata'  ? `${dal} — ${al}`
    : 'Complessivo'

  if (loading && !dati) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', fontSize:15 }}>
      Caricamento dashboard…
    </div>
  )
  if (!dati) return null

  const { sc, righe, trendSc } = dati

  // ── KPI ───────────────────────────────────────────────────────
  const validi   = sc.filter(s => !s.stornato)
  const incasso  = validi.reduce((s, x) => s + (x.totale_netto || 0), 0)
  const contanti = validi.filter(s => s.tipo_pagamento === 'contanti').reduce((s, x) => s + (x.totale_netto || 0), 0)
  const carta    = validi.filter(s => s.tipo_pagamento === 'carta').reduce((s, x) => s + (x.totale_netto || 0), 0)
  const omaggi   = validi.filter(s => s.tipo_pagamento === 'omaggio').reduce((s, x) => s + (x.totale_lordo || 0), 0)
  const media    = validi.length ? incasso / validi.length : 0
  const stornati = sc.filter(s => s.stornato).length

  // ── Trend ─────────────────────────────────────────────────────
  // Per la vista "sessione" mostra per-ora, altrimenti per-giorno
  let trendData = []
  if (vista === 'sessione') {
    const oraMap = {}
    trendSc.forEach(s => {
      const h = new Date(s.data_ora).getHours()
      const k = `${String(h).padStart(2, '0')}:00`
      if (!oraMap[k]) oraMap[k] = { label: k, incasso: 0, n: 0 }
      oraMap[k].incasso += s.totale_netto || 0
      oraMap[k].n++
    })
    trendData = Object.values(oraMap).sort((a, b) => a.label.localeCompare(b.label))
      .map(d => ({ ...d, incasso: +d.incasso.toFixed(2) }))
  } else {
    const dayMap = {}
    trendSc.forEach(s => {
      const g = s.data_ora.slice(0, 10)
      if (!dayMap[g]) dayMap[g] = { data: g, label: fmtDay(g), incasso: 0, n: 0 }
      dayMap[g].incasso += s.totale_netto || 0
      dayMap[g].n++
    })
    trendData = Object.values(dayMap).sort((a, b) => a.data.localeCompare(b.data))
      .map(d => ({ ...d, incasso: +d.incasso.toFixed(2) }))
  }

  // ── Donut pagamenti ───────────────────────────────────────────
  const pagData = [
    { name: 'Contanti', value: +contanti.toFixed(2), color: C.green },
    { name: 'Carta',    value: +carta.toFixed(2),    color: C.blue  },
    { name: 'Omaggi',   value: +omaggi.toFixed(2),   color: C.amber },
  ].filter(d => d.value > 0)

  // ── Top prodotti ──────────────────────────────────────────────
  const prodMap = {}
  righe.filter(r => !r.omaggio && !r.stornata && !r.expand?.scontrino?.stornato)
    .forEach(r => {
      const k = r.nome_snapshot
      if (!prodMap[k]) prodMap[k] = { nome: k, qta: 0, tot: 0 }
      prodMap[k].qta += r.quantita
      prodMap[k].tot += r.totale_riga || 0
    })
  const topProd = Object.values(prodMap).sort((a, b) => b.tot - a.tot)
    .slice(0, 8).map(d => ({ ...d, tot: +d.tot.toFixed(2) }))

  // ── Distribuzione oraria (sempre) ────────────────────────────
  const oraMap = {}
  validi.forEach(s => {
    const h = new Date(s.data_ora).getHours()
    if (!oraMap[h]) oraMap[h] = { ora: `${String(h).padStart(2, '0')}:00`, incasso: 0, n: 0 }
    oraMap[h].incasso += s.totale_netto || 0
    oraMap[h].n++
  })
  const oraData = Object.values(oraMap).sort((a, b) => parseInt(a.ora) - parseInt(b.ora))
    .map(d => ({ ...d, incasso: +d.incasso.toFixed(2) }))

  // ── Trend subtitle ────────────────────────────────────────────
  const trendSub = vista === 'sessione' ? 'distribuzione oraria · questa sessione'
    : vista === 'perdata'  ? `giorno per giorno · ${dal} — ${al}`
    : vista === 'tutto'    ? 'andamento giornaliero · tutti i dati'
    : 'ultimi 90 giorni · tutte le sessioni'

  return (
    <div style={{ flex:1, overflowY:'auto', padding:18, background:'var(--bg)' }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontFamily:'Barlow Condensed', fontWeight:900, fontSize:24 }}>
            Dashboard &nbsp;<span style={{ color:'var(--accent)' }}>{labelVista}</span>
          </div>
          {aggAt && (
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
              Aggiornato alle {aggAt.toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
            </div>
          )}
        </div>
        <button onClick={carica} disabled={loading} style={{
          padding:'7px 14px', background:'var(--surf)', border:'1px solid var(--border)',
          borderRadius:8, fontWeight:700, fontSize:13, color:'var(--text2)', cursor:'pointer',
        }}>
          {loading ? '⟳ …' : '↻ Aggiorna'}
        </button>
      </div>

      {/* ── Selettore vista ─────────────────────────────────────── */}
      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:14, flexWrap:'wrap' }}>
        <TabBtn label="Sessione corrente" active={vista==='corrente'}
          onClick={() => { setVista('corrente'); setSessVista(null) }} />
        <TabBtn label="Per data"          active={vista==='perdata'}
          onClick={() => { setVista('perdata');  setSessVista(null) }} />
        <TabBtn label="Complessivo"       active={vista==='tutto'}
          onClick={() => { setVista('tutto');    setSessVista(null) }} />

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
                  appearance:'none', WebkitAppearance:'none',
                  paddingLeft:12, paddingRight:32, paddingTop:7, paddingBottom:7,
                  borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer',
                  border:`1px solid ${vista==='sessione' ? 'var(--accent)' : 'var(--border)'}`,
                  background: vista==='sessione' ? 'var(--accent)' : 'var(--surf2)',
                  color: vista==='sessione' ? '#fff' : 'var(--text2)',
                  minWidth:220, maxWidth:340,
                }}
              >
                <option value="" disabled>📦 Sessione archiviata ({sessioni.length})</option>
                {sessioni.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.nome || `Sessione #${s.numero_sessione}`}
                    {s.scontrini_count != null ? `  ·  ${s.scontrini_count} sc  ·  ${EUR(s.totale_netto)}` : ''}
                  </option>
                ))}
              </select>
              <span style={{ position:'absolute', right:10, pointerEvents:'none',
                color: vista==='sessione' ? '#fff' : 'var(--text3)', fontSize:11 }}>▼</span>
            </div>
          </>
        )}
      </div>

      {/* Filtro date (solo vista per-data) */}
      {vista === 'perdata' && (
        <div className="filtri-row" style={{ marginBottom:14 }}>
          <label>Dal</label>
          <input type="date" value={dal} onChange={e => setDal(e.target.value)} />
          <label>Al</label>
          <input type="date" value={al}  onChange={e => setAl(e.target.value)} />
          <button className="btn-refresh" onClick={carica}>{loading ? '...' : '↻ Aggiorna'}</button>
        </div>
      )}

      {/* Info banner sessione archiviata */}
      {vista === 'sessione' && sessVista && (
        <div style={{ background:'var(--surf2)', border:'1px solid var(--border)', borderRadius:10,
          padding:'10px 16px', marginBottom:14, fontSize:13, color:'var(--text2)',
          display:'flex', gap:24, flexWrap:'wrap' }}>
          <span>📦 <b>{sessVista.nome}</b></span>
          {sessVista.aperta_il && <span>Apertura: {fmtDt(sessVista.aperta_il)}</span>}
          {sessVista.chiusa_il && <span>Chiusura: {fmtDt(sessVista.chiusa_il)}</span>}
          <span>Scontrini #{sessVista.primo_numero}–#{sessVista.ultimo_numero}</span>
        </div>
      )}

      {/* ── KPI ─────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(170px, 1fr))', gap:12, marginBottom:18 }}>
        <KCard label="Incasso netto"    val={EUR(incasso)}    color={C.green} big />
        <KCard label="Scontrini"        val={validi.length}   sub={stornati > 0 ? `${stornati} stornati` : undefined} />
        <KCard label="Contanti"         val={EUR(contanti)}   color={C.green} pct={PCT(contanti, incasso)} pctLabel="del totale" />
        <KCard label="Carta"            val={EUR(carta)}      color={C.blue}  pct={PCT(carta, incasso)}    pctLabel="del totale" />
        <KCard label="Media scontrino"  val={EUR(media)}      color={C.amber} />
      </div>

      {/* ── Row 1: Trend + Donut ────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:14, marginBottom:14 }}>

        <Box title={vista === 'sessione' ? 'Vendite per fascia oraria' : 'Andamento vendite'} sub={trendSub}>
          {trendData.length > 0 ? (
            vista === 'sessione' ? (
              // Vista sessione: bar chart orario
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={trendData} margin={{ top:8, right:8, left:0, bottom:0 }}>
                  <defs>
                    <linearGradient id="gAmberBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={C.amber} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={C.amber} stopOpacity={0.5} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize:10, fill:'var(--text3)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize:10, fill:'var(--text3)' }} tickLine={false} axisLine={false}
                    tickFormatter={v => `€${v}`} width={48} />
                  <Tooltip
                    contentStyle={{ background:'var(--surf)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }}
                    formatter={(v, _, p) => [`${EUR(v)} · ${p.payload.n} scontrini`, 'Incasso']}
                  />
                  <Bar dataKey="incasso" fill="url(#gAmberBar)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              // Altre viste: area chart giornaliero
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendData} margin={{ top:8, right:12, left:0, bottom:0 }}>
                  <defs>
                    <linearGradient id="gAmber" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.amber} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={C.amber} stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize:10, fill:'var(--text3)' }}
                    tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize:10, fill:'var(--text3)' }}
                    tickLine={false} axisLine={false} tickFormatter={v => `€${v}`} width={52} />
                  <Tooltip
                    contentStyle={{ background:'var(--surf)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }}
                    formatter={v => [EUR(v), 'Incasso']}
                    labelStyle={{ fontWeight:600, color:'var(--text)', marginBottom:4 }}
                  />
                  <Area type="monotone" dataKey="incasso"
                    stroke={C.amber} strokeWidth={2.5} fill="url(#gAmber)" dot={false}
                    activeDot={{ r:5, fill:C.amber, strokeWidth:0 }} />
                </AreaChart>
              </ResponsiveContainer>
            )
          ) : (
            <Empty msg="Nessun dato disponibile" />
          )}
        </Box>

        <Box title="Pagamenti" sub={labelVista}>
          {pagData.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
              <ResponsiveContainer width="100%" height={155}>
                <PieChart>
                  <Pie data={pagData} cx="50%" cy="50%"
                    innerRadius={48} outerRadius={70}
                    dataKey="value" paddingAngle={4} startAngle={90} endAngle={450}>
                    {pagData.map((d, i) => <Cell key={i} fill={d.color} strokeWidth={0} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background:'var(--surf)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }}
                    formatter={v => [EUR(v)]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:6, padding:'0 4px' }}>
                {pagData.map(d => (
                  <div key={d.name} style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <div style={{ width:10, height:10, borderRadius:2, background:d.color, flexShrink:0 }} />
                    <span style={{ flex:1, fontSize:12, color:'var(--text2)' }}>{d.name}</span>
                    <span style={{ fontFamily:'Barlow Condensed', fontSize:15, fontWeight:700 }}>{EUR(d.value)}</span>
                    <span style={{ fontSize:11, color:'var(--text3)', width:34, textAlign:'right' }}>
                      {PCT(d.value, incasso)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : <Empty msg="Nessuna vendita ancora" />}
        </Box>
      </div>

      {/* ── Row 2: Top prodotti + Per ora ───────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>

        <Box title="Top prodotti" sub={`per incasso · ${labelVista}`}>
          {topProd.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(180, topProd.length * 34 + 20)}>
              <BarChart data={topProd} layout="vertical" margin={{ top:4, right:48, left:4, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize:10, fill:'var(--text3)' }}
                  tickLine={false} axisLine={false} tickFormatter={v => `€${v}`} />
                <YAxis type="category" dataKey="nome" tick={{ fontSize:11, fill:'var(--text)' }}
                  tickLine={false} axisLine={false} width={110} />
                <Tooltip
                  contentStyle={{ background:'var(--surf)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }}
                  formatter={(v, _, p) => [`${EUR(v)} · ${p.payload.qta} pz`, 'Incasso']}
                />
                <Bar dataKey="tot" fill={C.amber} radius={[0,4,4,0]}
                  label={{ position:'right', fontSize:11, fill:'var(--text3)', formatter: v => `€${v}` }} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty msg="Nessun prodotto venduto" />}
        </Box>

        {/* Per ora — ha senso sempre tranne quando il trend sopra è già orario (sessione) */}
        {vista !== 'sessione' ? (
          <Box title="Vendite per fascia oraria" sub={labelVista}>
            {oraData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={oraData} margin={{ top:8, right:8, left:0, bottom:0 }}>
                  <defs>
                    <linearGradient id="gBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={C.blue} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={C.teal} stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="ora" tick={{ fontSize:10, fill:'var(--text3)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize:10, fill:'var(--text3)' }} tickLine={false} axisLine={false}
                    tickFormatter={v => `€${v}`} width={48} />
                  <Tooltip
                    contentStyle={{ background:'var(--surf)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }}
                    formatter={(v, _, p) => [`${EUR(v)} · ${p.payload.n} scontrini`, 'Incasso']}
                  />
                  <Bar dataKey="incasso" fill="url(#gBlue)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty msg="Nessuna vendita ancora" />}
          </Box>
        ) : (
          // In vista sessione al posto del grafico orario (già sopra) metti i prodotti per quantità
          <Box title="Top prodotti per quantità" sub={labelVista}>
            {topProd.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(180, topProd.length * 34 + 20)}>
                <BarChart data={[...topProd].sort((a,b) => b.qta - a.qta)} layout="vertical"
                  margin={{ top:4, right:40, left:4, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize:10, fill:'var(--text3)' }}
                    tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize:11, fill:'var(--text)' }}
                    tickLine={false} axisLine={false} width={110} />
                  <Tooltip
                    contentStyle={{ background:'var(--surf)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }}
                    formatter={(v, _, p) => [`${v} pz · ${EUR(p.payload.tot)}`, 'Quantità']}
                  />
                  <Bar dataKey="qta" fill={C.teal} radius={[0,4,4,0]}
                    label={{ position:'right', fontSize:11, fill:'var(--text3)', formatter: v => `${v} pz` }} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty msg="Nessun prodotto venduto" />}
          </Box>
        )}
      </div>

      {/* ── Confronto sessioni (non in vista singola sessione) ───── */}
      {vista !== 'sessione' && sessioni.length > 0 && (
        <div className="table-box" style={{ marginBottom:14 }}>
          <div className="table-box-head">Confronto sessioni archiviate</div>
          <table>
            <thead>
              <tr>
                <th>#</th><th>Sessione</th><th>Apertura</th><th>Chiusura</th>
                <th style={{ textAlign:'center' }}>Scontrini</th>
                <th>Contanti</th><th>Carta</th><th>Netto</th>
              </tr>
            </thead>
            <tbody>
              {sessioni.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight:700, fontFamily:'Barlow Condensed', fontSize:15 }}>#{s.numero_sessione}</td>
                  <td style={{ fontWeight:600 }}>{s.nome}</td>
                  <td style={{ fontSize:12, color:'var(--text2)' }}>{fmtDt(s.aperta_il)}</td>
                  <td style={{ fontSize:12, color:'var(--text2)' }}>{fmtDt(s.chiusa_il)}</td>
                  <td style={{ textAlign:'center', fontWeight:700 }}>{s.scontrini_count}</td>
                  <td style={{ color:C.green,  fontFamily:'Barlow Condensed', fontSize:15, fontWeight:700 }}>{EUR(s.totale_contanti)}</td>
                  <td style={{ color:C.blue,   fontFamily:'Barlow Condensed', fontSize:15, fontWeight:700 }}>{EUR(s.totale_carta)}</td>
                  <td style={{ fontWeight:800, color:C.amber, fontFamily:'Barlow Condensed', fontSize:17 }}>{EUR(s.totale_netto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}

// ── Helper components ─────────────────────────────────────────

function TabBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px',
      background: active ? 'var(--accent)' : 'var(--surf2)',
      color: active ? '#fff' : 'var(--text2)',
      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {label}
    </button>
  )
}

function KCard({ label, val, sub, color, big, pct, pctLabel }) {
  return (
    <div style={{
      background:'var(--surf)', border:'1px solid var(--border)',
      borderRadius:'var(--r)', padding:'14px 16px', boxShadow:'var(--shadow)',
    }}>
      <div style={{ fontSize:11, color:'var(--text2)', fontWeight:600,
        textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>{label}</div>
      <div style={{ fontFamily:'Barlow Condensed', fontWeight:800,
        fontSize: big ? 28 : 24, color: color || 'var(--text)', lineHeight:1 }}>{val}</div>
      {(sub || pct != null) && (
        <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>
          {sub && <span style={{ color:'var(--red)', marginRight:6 }}>{sub}</span>}
          {pct != null && <span>{pct}% {pctLabel}</span>}
        </div>
      )}
    </div>
  )
}

function Box({ title, sub, children }) {
  return (
    <div style={{
      background:'var(--surf)', border:'1px solid var(--border)',
      borderRadius:'var(--r)', padding:'14px 16px', boxShadow:'var(--shadow)',
    }}>
      <div style={{ marginBottom:12 }}>
        <div style={{ fontFamily:'Barlow Condensed', fontWeight:700, fontSize:15 }}>{title}</div>
        {sub && <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{sub}</div>}
      </div>
      {children}
    </div>
  )
}

function Empty({ msg = 'Nessun dato' }) {
  return (
    <div style={{ height:120, display:'flex', alignItems:'center', justifyContent:'center',
      color:'var(--text3)', fontSize:13 }}>{msg}</div>
  )
}
