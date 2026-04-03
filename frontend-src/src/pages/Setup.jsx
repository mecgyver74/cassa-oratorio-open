import { useState, useEffect, useCallback } from 'react'
import pb from '../lib/pb'
import { useToast } from '../components/Toast'

export default function Setup() {
  const toast = useToast()
  const [tab, setTab] = useState('prodotti')

  return (
    <div className="page-pad">
      <div className="page-title">⚙️ Setup</div>
      <div className="prodotti-tabs" style={{ marginBottom: 16, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', display: 'inline-flex' }}>
        {[['prodotti','Prodotti'],['famiglie','Famiglie'],['magcomuni','Magazzini comuni'],['comande','Comande'],['menu','Menù'],['utenti','Utenti'],['display','Aspetto']].map(([k,l]) => (
          <button key={k} className={`prodotti-tab ${tab===k?'active':''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === 'prodotti' && <TabProdotti toast={toast} />}
      {tab === 'famiglie' && <TabFamiglie toast={toast} />}
      {tab === 'magcomuni' && <TabMagComuni toast={toast} />}
      {tab === 'comande' && <TabComande toast={toast} />}
      {tab === 'menu' && <TabMenu toast={toast} />}
      {tab === 'utenti' && <TabUtenti toast={toast} />}
      {tab === 'display' && <TabDisplay toast={toast} />}
    </div>
  )
}

// ── TAB PRODOTTI ──────────────────────────────────────────────────────────────
function TabProdotti({ toast }) {
  const [lista, setLista] = useState([])
  const [famiglie, setFamiglie] = useState([])
  const [magComuni, setMagComuni] = useState([])
  const [comande, setComande] = useState([])
  const [sel, setSel] = useState(null)
  const [form, setForm] = useState({})

  const [filtroFam, setFiltroFam] = useState('')

  const carica = useCallback(async () => {
    const [pr, fam, mc, co] = await Promise.all([
      pb.collection('prodotti').getFullList({ sort: 'ordine,nome', expand: 'famiglia' }),
      pb.collection('famiglie').getFullList({ sort: 'ordine,nome' }),
      pb.collection('magazzini_comuni').getFullList({ sort: 'nome' }),
      pb.collection('comande').getFullList({ sort: 'ordine,nome' }),
    ])
    setLista(pr); setFamiglie(fam); setMagComuni(mc); setComande(co)
  }, [])

  useEffect(() => { carica() }, [carica])

  const selProd = (p) => {
    setSel(p.id)
    setForm({ nome: p.nome, codice_pers: p.codice_pers||'', famiglia: p.famiglia, magazzino_comune: p.magazzino_comune||'', prezzo: p.prezzo, quantita: p.quantita, unita: p.unita||'pz', soglia_allarme: p.soglia_allarme||0, attivo: p.attivo, solo_menu: p.solo_menu, colore: p.colore||'', ordine: p.ordine||0, comanda: p.comanda||'' })
  }

  const salva = async () => {
    try {
      const data = { ...form, prezzo: parseFloat(form.prezzo)||0, quantita: form.quantita===-1 ? -1 : parseFloat(form.quantita)||0, soglia_allarme: parseFloat(form.soglia_allarme)||0, ordine: parseInt(form.ordine)||0, magazzino_comune: form.magazzino_comune||null, comanda: form.comanda||null }
      if (sel === 'new') await pb.collection('prodotti').create(data)
      else await pb.collection('prodotti').update(sel, data)
      toast('Salvato', 'v'); carica(); setSel(null)
    } catch(e) { toast('Errore: '+e.message, 'r') }
  }

  const elimina = async (id) => {
    if (!confirm('Eliminare?')) return
    await pb.collection('prodotti').delete(id).catch(e => toast(e.message,'r'))
    carica(); setSel(null)
  }

  const nuovo = () => { setSel('new'); setForm({ nome:'', codice_pers:'', famiglia: famiglie[0]?.id||'', magazzino_comune:'', prezzo:'', quantita:0, unita:'pz', soglia_allarme:0, attivo:true, solo_menu:false, colore:'', ordine:0, comanda:'' }) }

  return (
    <div className="setup-cols">
      <div className="setup-box">
        <div className="setup-box-head"><h3>Prodotti</h3><button className="btn-add" onClick={nuovo}>+ Nuovo</button></div>
        <div style={{ padding:'6px 10px', borderBottom:'1px solid var(--border)', display:'flex', gap:4, flexWrap:'wrap' }}>
          <button onClick={() => setFiltroFam('')}
            style={{ padding:'3px 8px', borderRadius:12, fontSize:11, fontWeight:700, cursor:'pointer', border:'none',
              background: filtroFam==='' ? 'var(--accent)' : 'var(--surf2)', color: filtroFam==='' ? '#fff' : 'var(--text2)' }}>
            Tutti
          </button>
          {famiglie.map(f => (
            <button key={f.id} onClick={() => setFiltroFam(f.id)}
              style={{ padding:'3px 8px', borderRadius:12, fontSize:11, fontWeight:700, cursor:'pointer', border:'none',
                background: filtroFam===f.id ? (f.colore||'var(--accent)') : 'var(--surf2)',
                color: filtroFam===f.id ? '#fff' : 'var(--text2)' }}>
              {f.nome}
            </button>
          ))}
        </div>
        <div className="setup-list">
          {lista.filter(p => !filtroFam || p.famiglia === filtroFam).map(p => (
            <div key={p.id} className={`setup-li ${sel===p.id?'sel':''}`} onClick={() => selProd(p)}>
              <span style={{ width:12,height:12,borderRadius:'50%',background:p.colore||'var(--border)',flexShrink:0,display:'inline-block' }}/>
              {p.nome}
              {!p.attivo && <span style={{fontSize:10,color:'var(--red)',marginLeft:4}}>(disattivo)</span>}
              <span className="setup-li-del" onClick={e=>{e.stopPropagation();elimina(p.id)}}>✕</span>
            </div>
          ))}
        </div>
      </div>
      <div className="setup-box">
        {sel ? (
          <div className="setup-form">
            <div className="fg-row">
              <div className="fg"><label>Nome</label><input value={form.nome||''} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}/></div>
              <div className="fg"><label>Codice personale</label><input value={form.codice_pers||''} onChange={e=>setForm(f=>({...f,codice_pers:e.target.value}))}/></div>
            </div>
            <div className="fg-row">
              <div className="fg"><label>Famiglia</label>
                <select value={form.famiglia||''} onChange={e=>setForm(f=>({...f,famiglia:e.target.value}))}>
                  {famiglie.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>
              <div className="fg"><label>Magazzino comune</label>
                <select value={form.magazzino_comune||''} onChange={e=>setForm(f=>({...f,magazzino_comune:e.target.value}))}>
                  <option value="">— Magazzino proprio —</option>
                  {magComuni.map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="fg-row">
              <div className="fg"><label>Prezzo €</label><input type="number" step="0.01" value={form.prezzo||''} onChange={e=>setForm(f=>({...f,prezzo:e.target.value}))}/></div>
              <div className="fg">
                <label>Qtà / Scorta</label>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <input type="number" value={form.quantita===-1?'':form.quantita||0}
                    disabled={form.quantita===-1}
                    onChange={e=>setForm(f=>({...f,quantita:e.target.value}))}
                    style={{ flex:1, opacity: form.quantita===-1 ? 0.4 : 1 }} />
                  <label style={{ display:'flex', alignItems:'center', gap:4, fontSize:13, whiteSpace:'nowrap', fontWeight:400 }}>
                    <input type="checkbox"
                      checked={form.quantita===-1}
                      onChange={e=>setForm(f=>({...f,quantita:e.target.checked?-1:0}))} />
                    Infinita
                  </label>
                </div>
              </div>
            </div>
            <div className="fg-row">
              <div className="fg"><label>Unità</label><input value={form.unita||'pz'} onChange={e=>setForm(f=>({...f,unita:e.target.value}))}/></div>
              <div className="fg"><label>Soglia allarme</label><input type="number" value={form.soglia_allarme||0} onChange={e=>setForm(f=>({...f,soglia_allarme:e.target.value}))}/></div>
            </div>
            <div className="fg-row">
              <div className="fg"><label>Colore (hex)</label><input type="color" value={form.colore||'#888888'} onChange={e=>setForm(f=>({...f,colore:e.target.value}))}/></div>
              <div className="fg"><label>Ordine</label><input type="number" value={form.ordine||0} onChange={e=>setForm(f=>({...f,ordine:e.target.value}))}/></div>
            </div>
            <div className="fg"><label>Comanda</label>
              <select value={form.comanda||''} onChange={e=>setForm(f=>({...f,comanda:e.target.value}))}>
                <option value="">— Nessuna —</option>
                {comande.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="cb-row"><input type="checkbox" checked={!!form.attivo} onChange={e=>setForm(f=>({...f,attivo:e.target.checked}))}/> Attivo</div>
            <div className="cb-row"><input type="checkbox" checked={!!form.solo_menu} onChange={e=>setForm(f=>({...f,solo_menu:e.target.checked}))}/> Solo nei menù (non visibile in cassa)</div>
            <button className="btn-salva" onClick={salva}>Salva</button>
          </div>
        ) : <div style={{padding:20,color:'var(--text3)',fontSize:13}}>← Seleziona un prodotto per modificarlo</div>}
      </div>
    </div>
  )
}

// ── TAB FAMIGLIE ──────────────────────────────────────────────────────────────
function TabFamiglie({ toast }) {
  const [lista, setLista] = useState([])
  const [sel, setSel] = useState(null)
  const [form, setForm] = useState({})

  const carica = useCallback(async () => {
    setLista(await pb.collection('famiglie').getFullList({ sort: 'ordine,nome' }))
  }, [])
  useEffect(() => { carica() }, [carica])

  const selItem = f => { setSel(f.id); setForm({ nome:f.nome, codice:f.codice||'', colore:f.colore||'#888888', attivo:f.attivo, ordine:f.ordine||0 }) }
  const salva = async () => {
    try {
      if (sel==='new') await pb.collection('famiglie').create({ ...form, codice: parseInt(form.codice)||0, ordine: parseInt(form.ordine)||0 })
      else await pb.collection('famiglie').update(sel, { ...form, codice: parseInt(form.codice)||0, ordine: parseInt(form.ordine)||0 })
      toast('Salvato','v'); carica(); setSel(null)
    } catch(e) { toast(e.message,'r') }
  }
  const elimina = async id => { if(!confirm('Eliminare?')) return; await pb.collection('famiglie').delete(id).catch(e=>toast(e.message,'r')); carica(); setSel(null) }
  const nuovo = () => { setSel('new'); setForm({nome:'',codice:'',colore:'#888888',attivo:true,ordine:0}) }

  return (
    <div className="setup-cols">
      <div className="setup-box">
        <div className="setup-box-head"><h3>Famiglie</h3><button className="btn-add" onClick={nuovo}>+ Nuova</button></div>
        <div className="setup-list">
          {lista.map(f => (
            <div key={f.id} className={`setup-li ${sel===f.id?'sel':''}`} onClick={() => selItem(f)}>
              <span style={{width:12,height:12,borderRadius:'50%',background:f.colore,display:'inline-block',flexShrink:0}}/>
              {f.nome}
              <span className="setup-li-del" onClick={e=>{e.stopPropagation();elimina(f.id)}}>✕</span>
            </div>
          ))}
        </div>
      </div>
      <div className="setup-box">
        {sel ? (
          <div className="setup-form">
            <div className="fg"><label>Nome</label><input value={form.nome||''} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}/></div>
            <div className="fg-row">
              <div className="fg"><label>Codice</label><input type="number" value={form.codice||''} onChange={e=>setForm(f=>({...f,codice:e.target.value}))}/></div>
              <div className="fg"><label>Ordine</label><input type="number" value={form.ordine||0} onChange={e=>setForm(f=>({...f,ordine:e.target.value}))}/></div>
            </div>
            <div className="fg"><label>Colore</label><input type="color" value={form.colore||'#888888'} onChange={e=>setForm(f=>({...f,colore:e.target.value}))}/></div>
            <div className="cb-row"><input type="checkbox" checked={!!form.attivo} onChange={e=>setForm(f=>({...f,attivo:e.target.checked}))}/> Attiva</div>
            <button className="btn-salva" onClick={salva}>Salva</button>
          </div>
        ) : <div style={{padding:20,color:'var(--text3)',fontSize:13}}>← Seleziona una famiglia</div>}
      </div>
    </div>
  )
}

// ── TAB MAGAZZINI COMUNI ──────────────────────────────────────────────────────
function TabMagComuni({ toast }) {
  const [lista, setLista] = useState([])
  const [sel, setSel] = useState(null)
  const [form, setForm] = useState({})
  const carica = useCallback(async () => { setLista(await pb.collection('magazzini_comuni').getFullList({ sort: 'nome' })) }, [])
  useEffect(() => { carica() }, [carica])
  const selItem = m => { setSel(m.id); setForm({ nome:m.nome, quantita:m.quantita, soglia_allarme:m.soglia_allarme||0 }) }
  const salva = async () => {
    try {
      const data = { nome:form.nome, quantita: parseFloat(form.quantita)||0, soglia_allarme: parseFloat(form.soglia_allarme)||0 }
      if (sel==='new') await pb.collection('magazzini_comuni').create(data)
      else await pb.collection('magazzini_comuni').update(sel, data)
      toast('Salvato','v'); carica(); setSel(null)
    } catch(e) { toast(e.message,'r') }
  }
  const elimina = async id => { if(!confirm('Eliminare?')) return; await pb.collection('magazzini_comuni').delete(id).catch(e=>toast(e.message,'r')); carica(); setSel(null) }
  const nuovo = () => { setSel('new'); setForm({nome:'',quantita:0,soglia_allarme:5}) }
  return (
    <div className="setup-cols">
      <div className="setup-box">
        <div className="setup-box-head"><h3>Magazzini comuni</h3><button className="btn-add" onClick={nuovo}>+ Nuovo</button></div>
        <div className="setup-list">
          {lista.map(m=>(
            <div key={m.id} className={`setup-li ${sel===m.id?'sel':''}`} onClick={()=>selItem(m)}>
              {m.nome} <span style={{fontSize:11,color:'var(--text2)'}}>({m.quantita})</span>
              <span className="setup-li-del" onClick={e=>{e.stopPropagation();elimina(m.id)}}>✕</span>
            </div>
          ))}
        </div>
      </div>
      <div className="setup-box">
        {sel ? (
          <div className="setup-form">
            <div className="fg"><label>Nome</label><input value={form.nome||''} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}/></div>
            <div className="fg-row">
              <div className="fg"><label>Quantità iniziale</label><input type="number" value={form.quantita||0} onChange={e=>setForm(f=>({...f,quantita:e.target.value}))}/></div>
              <div className="fg"><label>Soglia allarme</label><input type="number" value={form.soglia_allarme||0} onChange={e=>setForm(f=>({...f,soglia_allarme:e.target.value}))}/></div>
            </div>
            <button className="btn-salva" onClick={salva}>Salva</button>
          </div>
        ) : <div style={{padding:20,color:'var(--text3)',fontSize:13}}>← Seleziona un magazzino</div>}
      </div>
    </div>
  )
}

// ── TAB COMANDE ──────────────────────────────────────────────────────────────
function TabComande({ toast }) {
  const [lista, setLista] = useState([])
  const [famiglie, setFamiglie] = useState([])
  const [sel, setSel] = useState(null)
  const [form, setForm] = useState({})
  const carica = useCallback(async () => {
    const [co,fam] = await Promise.all([pb.collection('comande').getFullList({sort:'ordine,nome'}), pb.collection('famiglie').getFullList({sort:'ordine,nome'})])
    setLista(co); setFamiglie(fam)
  }, [])
  useEffect(() => { carica() }, [carica])
  const selItem = c => { setSel(c.id); setForm({ nome:c.nome, abilitata:c.abilitata, stampante:c.stampante||'', copie:c.copie||1, salva_su_db:c.salva_su_db, invia_stampante:c.invia_stampante, famiglie_ids: c.famiglie_ids||[], ordine:c.ordine||0 }) }
  const salva = async () => {
    try {
      if (sel==='new') await pb.collection('comande').create({...form, copie:parseInt(form.copie)||1, ordine:parseInt(form.ordine)||0})
      else await pb.collection('comande').update(sel, {...form, copie:parseInt(form.copie)||1, ordine:parseInt(form.ordine)||0})
      toast('Salvato','v'); carica(); setSel(null)
    } catch(e) { toast(e.message,'r') }
  }
  const elimina = async id => { if(!confirm('Eliminare?')) return; await pb.collection('comande').delete(id).catch(e=>toast(e.message,'r')); carica(); setSel(null) }
  const nuovo = () => { setSel('new'); setForm({nome:'',abilitata:true,stampante:'',copie:1,salva_su_db:true,invia_stampante:false,famiglie_ids:[],ordine:0}) }
  const toggleFam = fid => {
    setForm(f => ({ ...f, famiglie_ids: f.famiglie_ids.includes(fid) ? f.famiglie_ids.filter(x=>x!==fid) : [...f.famiglie_ids, fid] }))
  }
  return (
    <div className="setup-cols">
      <div className="setup-box">
        <div className="setup-box-head"><h3>Comande</h3><button className="btn-add" onClick={nuovo}>+ Nuova</button></div>
        <div className="setup-list">
          {lista.map(c=>(
            <div key={c.id} className={`setup-li ${sel===c.id?'sel':''}`} onClick={()=>selItem(c)}>
              {c.nome} {!c.abilitata&&<span style={{fontSize:10,color:'var(--red)'}}>(disabilitata)</span>}
              <span className="setup-li-del" onClick={e=>{e.stopPropagation();elimina(c.id)}}>✕</span>
            </div>
          ))}
        </div>
      </div>
      <div className="setup-box">
        {sel ? (
          <div className="setup-form">
            <div className="fg-row">
              <div className="fg"><label>Nome</label><input value={form.nome||''} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}/></div>
              <div className="fg"><label>Ordine</label><input type="number" value={form.ordine||0} onChange={e=>setForm(f=>({...f,ordine:e.target.value}))}/></div>
            </div>
            <div className="fg"><label>Stampante (nome condivisione Windows)</label><input value={form.stampante||''} onChange={e=>setForm(f=>({...f,stampante:e.target.value}))}/></div>
            <div className="fg"><label>Copie</label><input type="number" min="1" value={form.copie||1} onChange={e=>setForm(f=>({...f,copie:e.target.value}))}/></div>
            <div className="cb-row"><input type="checkbox" checked={!!form.abilitata} onChange={e=>setForm(f=>({...f,abilitata:e.target.checked}))}/> Abilitata</div>
            <div className="cb-row"><input type="checkbox" checked={!!form.salva_su_db} onChange={e=>setForm(f=>({...f,salva_su_db:e.target.checked}))}/> Salva su database</div>
            <div className="cb-row"><input type="checkbox" checked={!!form.invia_stampante} onChange={e=>setForm(f=>({...f,invia_stampante:e.target.checked}))}/> Invia a stampante</div>
            <div className="fg">
              <label>Famiglie incluse in questa comanda</label>
              {famiglie.map(fam=>(
                <div key={fam.id} className="cb-row" style={{marginBottom:4}}>
                  <input type="checkbox" checked={(form.famiglie_ids||[]).includes(fam.id)} onChange={()=>toggleFam(fam.id)}/>
                  <span style={{color:fam.colore}}>{fam.nome}</span>
                </div>
              ))}
            </div>
            <button className="btn-salva" onClick={salva}>Salva</button>
          </div>
        ) : <div style={{padding:20,color:'var(--text3)',fontSize:13}}>← Seleziona una comanda</div>}
      </div>
    </div>
  )
}

// ── TAB MENU ─────────────────────────────────────────────────────────────────
function TabMenu({ toast }) {
  const [lista, setLista] = useState([])
  const [sel, setSel] = useState(null)
  const [form, setForm] = useState({})
  const carica = useCallback(async () => { setLista(await pb.collection('menu').getFullList({sort:'ordine,nome'})) }, [])
  useEffect(() => { carica() }, [carica])
  const selItem = m => { setSel(m.id); setForm({nome:m.nome,prezzo:m.prezzo,colore:m.colore||'',attivo:m.attivo,ordine:m.ordine||0}) }
  const salva = async () => {
    try {
      const data = {...form, prezzo:parseFloat(form.prezzo)||0, ordine:parseInt(form.ordine)||0}
      if(sel==='new') await pb.collection('menu').create(data)
      else await pb.collection('menu').update(sel,data)
      toast('Salvato','v'); carica(); setSel(null)
    } catch(e){toast(e.message,'r')}
  }
  const elimina = async id => { if(!confirm('Eliminare il menù e i suoi componenti?')) return; await pb.collection('menu').delete(id).catch(e=>toast(e.message,'r')); carica(); setSel(null) }
  const nuovo = () => { setSel('new'); setForm({nome:'',prezzo:'',colore:'',attivo:true,ordine:0}) }
  return (
    <div className="setup-cols">
      <div className="setup-box">
        <div className="setup-box-head"><h3>Menù</h3><button className="btn-add" onClick={nuovo}>+ Nuovo</button></div>
        <div className="setup-list">
          {lista.map(m=>(
            <div key={m.id} className={`setup-li ${sel===m.id?'sel':''}`} onClick={()=>selItem(m)}>
              {m.nome} <span style={{fontSize:11,color:'var(--accent)'}}>€{m.prezzo}</span>
              <span className="setup-li-del" onClick={e=>{e.stopPropagation();elimina(m.id)}}>✕</span>
            </div>
          ))}
        </div>
      </div>
      <div className="setup-box">
        {sel ? (
          <div className="setup-form">
            <div className="fg"><label>Nome menù</label><input value={form.nome||''} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}/></div>
            <div className="fg-row">
              <div className="fg"><label>Prezzo €</label><input type="number" step="0.01" value={form.prezzo||''} onChange={e=>setForm(f=>({...f,prezzo:e.target.value}))}/></div>
              <div className="fg"><label>Ordine</label><input type="number" value={form.ordine||0} onChange={e=>setForm(f=>({...f,ordine:e.target.value}))}/></div>
            </div>
            <div className="fg"><label>Colore</label><input type="color" value={form.colore||'#888888'} onChange={e=>setForm(f=>({...f,colore:e.target.value}))}/></div>
            <div className="cb-row"><input type="checkbox" checked={!!form.attivo} onChange={e=>setForm(f=>({...f,attivo:e.target.checked}))}/> Attivo</div>
            <button className="btn-salva" onClick={salva}>Salva menù</button>
            {sel!=='new' && <div style={{marginTop:12,fontSize:12,color:'var(--text2)'}}>Configura componenti e prodotti dal pannello Menù dopo aver salvato.</div>}
          </div>
        ) : <div style={{padding:20,color:'var(--text3)',fontSize:13}}>← Seleziona un menù</div>}
      </div>
    </div>
  )
}

// ── TAB UTENTI ────────────────────────────────────────────────────────────────
function TabUtenti({ toast }) {
  const [lista, setLista] = useState([])
  const [sel, setSel] = useState(null)
  const [form, setForm] = useState({})
  const carica = useCallback(async () => { setLista(await pb.collection('utenti').getFullList({sort:'nome'})) }, [])
  useEffect(() => { carica() }, [carica])
  const selItem = u => { setSel(u.id); setForm({nome:u.nome,postazione:u.postazione||'',ruolo:u.ruolo||'cassiere',pin:u.pin||'',attivo:u.attivo}) }
  const salva = async () => {
    try {
      if(sel==='new') await pb.collection('utenti').create(form)
      else await pb.collection('utenti').update(sel,form)
      toast('Salvato','v'); carica(); setSel(null)
    } catch(e){toast(e.message,'r')}
  }
  const elimina = async id => { if(!confirm('Eliminare?')) return; await pb.collection('utenti').delete(id).catch(e=>toast(e.message,'r')); carica(); setSel(null) }
  const nuovo = () => { setSel('new'); setForm({nome:'',postazione:'',ruolo:'cassiere',pin:'',attivo:true}) }
  return (
    <div className="setup-cols">
      <div className="setup-box">
        <div className="setup-box-head"><h3>Utenti</h3><button className="btn-add" onClick={nuovo}>+ Nuovo</button></div>
        <div className="setup-list">
          {lista.map(u=>(
            <div key={u.id} className={`setup-li ${sel===u.id?'sel':''}`} onClick={()=>selItem(u)}>
              {u.nome} <span style={{fontSize:11,color:'var(--text2)'}}>({u.ruolo})</span>
              <span className="setup-li-del" onClick={e=>{e.stopPropagation();elimina(u.id)}}>✕</span>
            </div>
          ))}
        </div>
      </div>
      <div className="setup-box">
        {sel ? (
          <div className="setup-form">
            <div className="fg"><label>Nome</label><input value={form.nome||''} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}/></div>
            <div className="fg"><label>Postazione (nome PC)</label><input value={form.postazione||''} onChange={e=>setForm(f=>({...f,postazione:e.target.value}))}/></div>
            <div className="fg-row">
              <div className="fg"><label>Ruolo</label>
                <select value={form.ruolo||'cassiere'} onChange={e=>setForm(f=>({...f,ruolo:e.target.value}))}>
                  <option value="cassiere">Cassiere</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="fg"><label>PIN</label><input type="password" maxLength={6} value={form.pin||''} onChange={e=>setForm(f=>({...f,pin:e.target.value}))}/></div>
            </div>
            <div className="cb-row"><input type="checkbox" checked={!!form.attivo} onChange={e=>setForm(f=>({...f,attivo:e.target.checked}))}/> Attivo</div>
            <button className="btn-salva" onClick={salva}>Salva</button>
          </div>
        ) : <div style={{padding:20,color:'var(--text3)',fontSize:13}}>← Seleziona un utente</div>}
      </div>
    </div>
  )
}

// ── TAB ASPETTO ────────────────────────────────────────────────────────────
function TabDisplay({ toast }) {
  const load = () => {
    try { return JSON.parse(localStorage.getItem('cassa_display') || '{}') } catch { return {} }
  }
  const [cfg, setCfg] = useState(load)

  const set = (k, v) => {
    const n = { ...cfg, [k]: v }
    setCfg(n)
    localStorage.setItem('cassa_display', JSON.stringify(n))
  }

  const reset = () => {
    localStorage.removeItem('cassa_display')
    setCfg({})
    toast('Impostazioni ripristinate', 'b')
  }

  const Row = ({ label, children, help }) => (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <label style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{label}</label>
        {help && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{help}</span>}
      </div>
      {children}
    </div>
  )

  const Slider = ({ label, k, min, max, defaultVal, unit, help }) => {
    const val = cfg[k] ?? defaultVal
    return (
      <Row label={label} help={help}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="range" min={min} max={max} value={val}
            onChange={e => set(k, parseInt(e.target.value))}
            style={{ flex: 1 }} />
          <span style={{ minWidth: 48, textAlign: 'center', fontFamily: 'Barlow Condensed',
            fontWeight: 800, fontSize: 18, background: 'var(--surf2)',
            border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px', color: 'var(--text)' }}>
            {val}{unit}
          </span>
        </div>
      </Row>
    )
  }

  // Anteprima bottone prodotto con le impostazioni correnti
  const Preview = () => {
    const nomeSz = cfg.nomeFontSize ?? 14
    const prezzoSz = cfg.prezzoFontSize ?? 12
    const altezza = cfg.btnHeight ?? 90
    const larghezza = cfg.btnWidth ?? 130
    const colNome    = cfg.colNome    ?? '#ffffff'
    const colPrezzo  = cfg.colPrezzo  ?? '#ffffff'
    const colGiacenza = cfg.colGiacenza ?? '#ffffffaa'
    const gapX = cfg.gapX ?? 6
    const gapY = cfg.gapY ?? 6
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: gapX, rowGap: gapY, margin: '16px 0' }}>
        {[
          { nome: 'Hamburger Classico', prezzo: '€ 5,00', scorta: 'Scorta: 12', colore: '#c0392b' },
          { nome: 'Coca Cola', prezzo: '€ 1,50', scorta: 'Scorta: 3', colore: '#27ae60' },
          { nome: 'Birra alla Spina', prezzo: '€ 4,00', scorta: 'ESAURITO', colore: '#2980b9' },
        ].map((p, i) => (
          <div key={i} style={{
            background: p.colore, borderRadius: 10, padding: '8px 10px',
            width: larghezza, height: altezza, display: 'flex', flexDirection: 'column',
            justifyContent: 'space-between', boxShadow: `0 3px 10px ${p.colore}44`, flexShrink: 0
          }}>
            <div style={{ fontSize: nomeSz, fontWeight: 700, lineHeight: 1.2, color: colNome }}>{p.nome}</div>
            <div style={{ fontSize: prezzoSz, fontWeight: 600, color: colPrezzo }}>{p.prezzo}</div>
            <div style={{ fontSize: 10, color: colGiacenza }}>{p.scorta}</div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="setup-box">
        <div className="setup-box-head"><h3>Aspetto pulsanti prodotto</h3></div>
        <div className="setup-form">

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>Anteprima:</div>
            <div style={{ background: 'var(--surf2)', borderRadius: 8, padding: 12, overflowX: 'auto' }}>
              <Preview />
            </div>
          </div>

          <Slider label="Dimensione nome prodotto" k="nomeFontSize" min={10} max={24} defaultVal={14} unit="px" />
          <Slider label="Dimensione prezzo" k="prezzoFontSize" min={9} max={20} defaultVal={12} unit="px" />
          <Slider label="Altezza pulsante" k="btnHeight" min={60} max={180} defaultVal={90} unit="px" />
          <Slider label="Larghezza pulsante" k="btnWidth" min={80} max={220} defaultVal={130} unit="px" />
          <Slider label="Spaziatura orizzontale" k="gapX" min={2} max={24} defaultVal={6} unit="px" />
          <Slider label="Spaziatura verticale" k="gapY" min={2} max={24} defaultVal={6} unit="px" />

          <Row label="Colore nome prodotto">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {['#ffffff','#000000','#fef9c3','#fde68a'].map(col => (
                <button key={col} onClick={() => set('colNome', col)}
                  style={{ width: 28, height: 28, borderRadius: 6, background: col, cursor: 'pointer',
                    border: (cfg.colNome??'#ffffff') === col ? '3px solid var(--accent)' : '2px solid var(--border)' }} />
              ))}
              <input type="color" value={cfg.colNome ?? '#ffffff'} onChange={e => set('colNome', e.target.value)}
                style={{ width: 36, height: 28, padding: 2, borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer' }} />
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>personalizzato</span>
            </div>
          </Row>

          <Row label="Colore prezzo">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {['#ffffff','#000000','#fef9c3','#fde68a'].map(col => (
                <button key={col} onClick={() => set('colPrezzo', col)}
                  style={{ width: 28, height: 28, borderRadius: 6, background: col, cursor: 'pointer',
                    border: (cfg.colPrezzo??'#ffffff') === col ? '3px solid var(--accent)' : '2px solid var(--border)' }} />
              ))}
              <input type="color" value={cfg.colPrezzo ?? '#ffffff'} onChange={e => set('colPrezzo', e.target.value)}
                style={{ width: 36, height: 28, padding: 2, borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer' }} />
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>personalizzato</span>
            </div>
          </Row>

          <Row label="Colore giacenza / scorta">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {['#ffffff','#000000','#fef9c3','#ffffff88'].map(col => (
                <button key={col} onClick={() => set('colGiacenza', col)}
                  style={{ width: 28, height: 28, borderRadius: 6, background: col, cursor: 'pointer',
                    border: (cfg.colGiacenza??'#ffffffaa') === col ? '3px solid var(--accent)' : '2px solid var(--border)' }} />
              ))}
              <input type="color" value={(cfg.colGiacenza ?? '#ffffff').slice(0,7)} onChange={e => set('colGiacenza', e.target.value)}
                style={{ width: 36, height: 28, padding: 2, borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer' }} />
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>personalizzato</span>
            </div>
          </Row>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn-salva" style={{ flex: 1 }}
              onClick={() => toast('Impostazioni salvate', 'v')}>
              Salva
            </button>
            <button onClick={reset}
              style={{ padding: '10px 16px', background: 'var(--surf2)', border: '1px solid var(--border)',
                borderRadius: 'var(--r)', color: 'var(--text2)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              Reset
            </button>
          </div>

          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
            Le impostazioni sono salvate sul browser. Torna alla Cassa per vederle applicate.
          </div>
        </div>
      </div>
    </div>
  )
}
