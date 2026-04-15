// Sistema stampa unificato - tutto in una finestra, una sola conferma
import { getConf, setConf } from './config'

// Cache sincrona in memoria (per le funzioni di stampa che sono sync)
let _stampaCfgCache = null

export async function loadStampaConfig() {
  _stampaCfgCache = await getConf('cassa_stampa_config', {})
  return _stampaCfgCache
}

export function getConfig() {
  // Se cache presente, usa quella (dal DB)
  if (_stampaCfgCache !== null) return _stampaCfgCache
  // Fallback localStorage per retrocompatibilità
  try { return JSON.parse(localStorage.getItem('cassa_stampa_config') || '{}') } catch { return {} }
}

export async function saveConfig(cfg) {
  _stampaCfgCache = cfg
  localStorage.setItem('cassa_stampa_config', JSON.stringify(cfg))
  await setConf('cassa_stampa_config', cfg)
}

// Genera HTML scontrino
function htmlScontrino(scontrino, righe, cfg) {
  const nome = cfg.nomeLoc || 'La mia Cassa'
  const ind = cfg.indirizzo || ''
  const footer = cfg.footerScontrino || 'Grazie e arrivederci!'
  const fontFamily = cfg.fontFamily || "'Courier New', monospace"
  const fontSize = cfg.fontSize || 11
  const larghezza = cfg.larghezza || 80
  const mostraLogo = cfg.mostraLogo && cfg.logoUrl
  const mostraTotale = cfg.mostraTotale !== false
  const mostraData = cfg.mostraData !== false
  const mostraCassa = cfg.mostraCassa !== false
  const colonneLayout = cfg.colonneLayout || 'standard' // standard | compatto | dettagliato

  const righeHtml = righe.filter(r => !r.stornata).map(r => {
    if (colonneLayout === 'compatto') {
      return `<tr><td>${r.quantita}x ${r.nome_snapshot}${r.omaggio ? ' (OM)' : ''}</td><td style="text-align:right">${r.omaggio ? '—' : '€' + r.totale_riga.toFixed(2)}</td></tr>`
    }
    if (colonneLayout === 'dettagliato') {
      return `<tr><td>${r.nome_snapshot}${r.omaggio ? ' <i>(omaggio)</i>' : ''}</td><td style="text-align:center">${r.quantita}</td><td style="text-align:right">€${r.prezzo_snapshot.toFixed(2)}</td><td style="text-align:right">${r.omaggio ? '—' : '€' + r.totale_riga.toFixed(2)}</td></tr>`
    }
    return `<tr><td>${r.nome_snapshot}${r.omaggio ? ' <b>(OM)</b>' : ''}</td><td style="text-align:center">${r.quantita}</td><td style="text-align:right">${r.omaggio ? '—' : '€' + r.totale_riga.toFixed(2)}</td></tr>`
  }).join('')

  const theadHtml = colonneLayout === 'dettagliato'
    ? '<tr><th style="text-align:left">Prodotto</th><th>Qta</th><th style="text-align:right">Prezzo</th><th style="text-align:right">Tot</th></tr>'
    : colonneLayout === 'compatto'
    ? ''
    : '<tr><th style="text-align:left">Prodotto</th><th>Qta</th><th style="text-align:right">Tot</th></tr>'

  return `
    <div class="scontrino" style="width:${larghezza}mm;font-family:${fontFamily};font-size:${fontSize}px;">
      ${mostraLogo ? `<div style="text-align:center;margin-bottom:6px"><img src="${cfg.logoUrl}" style="max-height:40px;max-width:${larghezza-10}mm"></div>` : ''}
      <div style="text-align:center;font-weight:bold;font-size:${fontSize+4}px">${nome}</div>
      ${ind ? `<div style="text-align:center">${ind}</div>` : ''}
      <hr style="border:none;border-top:1px dashed #000;margin:4px 0">
      ${mostraData ? `<div>Data: ${new Date(scontrino.data_ora).toLocaleString('it-IT')}</div>` : ''}
      <div>Scontrino n. ${String(scontrino.numero).padStart(4,'0')}</div>
      ${mostraCassa && scontrino.postazione ? `<div>Cassa: ${scontrino.postazione}</div>` : ''}
      ${scontrino.asporto ? `<div style="font-weight:bold;font-size:1.2em;text-align:center;border:2px solid #000;padding:2px">*** ASPORTO ***</div>` : ''}
      ${scontrino.tavolo ? `<div style="font-weight:bold">Tavolo/Nome: ${scontrino.tavolo}</div>` : ''}
      ${scontrino.note ? `<div>Note: ${scontrino.note}</div>` : ''}
      <hr style="border:none;border-top:1px dashed #000;margin:4px 0">
      <table style="width:100%;border-collapse:collapse">
        <thead>${theadHtml}</thead>
        <tbody>${righeHtml}</tbody>
      </table>
      <hr style="border:none;border-top:1px solid #000;margin:4px 0">
      ${scontrino.sconto_euro > 0 ? `<div style="text-align:right">Sconto: - €${scontrino.sconto_euro.toFixed(2)}</div>` : ''}
      ${scontrino.sconto_perc > 0 ? `<div style="text-align:right">Sconto: ${scontrino.sconto_perc}%</div>` : ''}
      ${mostraTotale ? `<div style="text-align:right;font-weight:bold;font-size:${fontSize+4}px">TOTALE: €${scontrino.totale_netto.toFixed(2)}</div>` : ''}
      <div style="text-align:right">Pag: ${scontrino.tipo_pagamento}</div>
      ${scontrino.tipo_pagamento === 'contanti' && scontrino.pagato > scontrino.totale_netto
        ? `<div style="text-align:right">Resto: €${(scontrino.pagato - scontrino.totale_netto).toFixed(2)}</div>` : ''}
      <hr style="border:none;border-top:1px dashed #000;margin:4px 0">
      <div style="text-align:center">${footer}</div>
    </div>`
}

// Genera HTML comanda
function htmlComanda(nomeComanda, righe, scontrino, cfg) {
  const nome = cfg.nomeLoc || 'La mia Cassa'
  const fontFamily = cfg.fontComanda || "'Courier New', monospace"
  const fontSizeComanda = cfg.fontSizeComanda || 14
  const mostraTavolo = cfg.mostraTavolo !== false
  const mostraOrario = cfg.mostraOrario !== false
  const mostraNumero = cfg.mostraNumero !== false
  const larghezza = cfg.larghezza || 80
  const evidenziaQta = cfg.evidenziaQta !== false

  const righeHtml = righe.map(r => `
    <tr>
      <td style="font-size:${evidenziaQta ? fontSizeComanda+6 : fontSizeComanda}px;font-weight:bold;vertical-align:top;padding-right:8px;white-space:nowrap">
        ${r.quantita}x
      </td>
      <td style="font-size:${fontSizeComanda}px;font-weight:bold;padding:3px 0">
        ${r.nome_snapshot}
        ${r.note ? `<br><span style="font-size:${fontSizeComanda-2}px;font-weight:normal">${r.note}</span>` : ''}
      </td>
    </tr>`).join('')

  return `
    <div class="comanda" style="width:${larghezza}mm;font-family:${fontFamily};">
      <div style="text-align:center;font-size:11px">${nome}</div>
      <div style="text-align:center;font-size:${fontSizeComanda+8}px;font-weight:900;border:3px solid #000;padding:4px;margin:4px 0;text-transform:uppercase">
        ${nomeComanda}
      </div>
      ${mostraNumero ? `<div style="font-weight:bold;font-size:${fontSizeComanda}px">Scontrino #${String(scontrino.numero).padStart(4,'0')}</div>` : ''}
      ${mostraOrario ? `<div style="font-size:${fontSizeComanda}px">${new Date(scontrino.data_ora).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}</div>` : ''}
      ${scontrino.asporto ? `<div style="font-size:${fontSizeComanda+4}px;font-weight:900;border:2px solid #000;text-align:center">*** ASPORTO ***</div>` : ''}
      ${mostraTavolo && scontrino.tavolo ? `<div style="font-size:${fontSizeComanda+4}px;font-weight:900;border-bottom:2px solid #000">TAVOLO/NOME ${scontrino.tavolo}</div>` : ''}
      ${scontrino.note ? `<div style="font-size:${fontSizeComanda-1}px;font-style:italic">Note: ${scontrino.note}</div>` : ''}
      <hr style="border:none;border-top:2px solid #000;margin:4px 0">
      <table style="width:100%;border-collapse:collapse"><tbody>${righeHtml}</tbody></table>
      <hr style="border:none;border-top:1px dashed #000;margin:4px 0">
      <div style="font-size:9px;text-align:right">${new Date().toLocaleString('it-IT')}</div>
    </div>`
}

// Helper: stampa tramite iframe nascosto + ripristina fullscreen dopo
function printViaIframe(html) {
  const wasFullscreen = !!document.fullscreenElement

  // Rimuovi iframe precedente se esiste
  const old = document.getElementById('_print_frame')
  if (old) old.remove()

  const iframe = document.createElement('iframe')
  iframe.id = '_print_frame'
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow.document
  doc.open()
  doc.write(html)
  doc.close()

  iframe.onload = () => {
    try {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
    } catch (e) {
      console.error('Errore stampa iframe:', e)
    }
    // Dopo la stampa, ripristina fullscreen se era attivo
    if (wasFullscreen) {
      setTimeout(() => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {})
        }
      }, 500)
    }
    setTimeout(() => iframe.remove(), 5000)
  }
}

// STAMPA TUTTO IN UNA FINESTRA - una sola conferma
export function stampaTutto(scontrino, righeScontrino, comande, righePerComanda, cfg = {}) {
  const config = { ...getConfig(), ...cfg }
  
  const sezioni = []

  // Scontrino cliente
  if (config.stampaScontrino !== false) {
    sezioni.push(htmlScontrino(scontrino, righeScontrino, config))
  }

  // Comande
  for (const comanda of comande) {
    const righe = righePerComanda[comanda.id] || []
    if (righe.length === 0) continue
    const copies = comanda.copie || 1
    for (let i = 0; i < copies; i++) {
      sezioni.push(htmlComanda(comanda.nome, righe, scontrino, config))
    }
  }

  if (sezioni.length === 0) return

  const html = `
    <html><head><title>Stampa cassa</title>
    <style>
      @page { margin: ${config.marginePagina || 2}mm; }
      body { margin: 0; padding: 0; }
      .scontrino, .comanda { page-break-after: always; padding: 4px; }
      .scontrino:last-child, .comanda:last-child { page-break-after: avoid; }
      table { width: 100%; border-collapse: collapse; }
      td, th { padding: 1px 2px; }
      hr { margin: 3px 0; }
    </style></head>
    <body>${sezioni.join('\n')}</body>
    </html>`

  printViaIframe(html)
}

// Compat: stampa solo scontrino
export function stampaScontrino(scontrino, righe, cfg = {}) {
  const config = { ...getConfig(), ...cfg }
  if (config.stampaScontrino === false) return
  const html = `<html><head><style>@page{margin:${config.marginePagina||2}mm}body{margin:0;padding:0}table{width:100%;border-collapse:collapse}</style></head><body>${htmlScontrino(scontrino, righe, config)}</body></html>`
  printViaIframe(html)
}

// Compat: stampa solo comanda
export function stampaComanda(nomeComanda, righe, scontrino, cfg = {}) {
  const config = { ...getConfig(), ...cfg }
  const html = `<html><head><style>@page{margin:${config.marginePagina||2}mm}body{margin:0;padding:0}table{width:100%;border-collapse:collapse}</style></head><body>${htmlComanda(nomeComanda, righe, scontrino, config)}</body></html>`
  printViaIframe(html)
}