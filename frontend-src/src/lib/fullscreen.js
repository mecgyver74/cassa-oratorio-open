// Ripristina fullscreen dopo un breve ritardo (se era attivo prima)
export function ripristinaFullscreen() {
  setTimeout(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    }
  }, 300)
}

// Wrapper per window.confirm che ripristina fullscreen
export function fsConfirm(msg) {
  const wasFs = !!document.fullscreenElement
  const result = confirm(msg)
  if (wasFs) ripristinaFullscreen()
  return result
}

// Wrapper per window.prompt che ripristina fullscreen
export function fsPrompt(msg, defaultVal) {
  const wasFs = !!document.fullscreenElement
  const result = prompt(msg, defaultVal)
  if (wasFs) ripristinaFullscreen()
  return result
}

// Wrapper per window.alert che ripristina fullscreen
export function fsAlert(msg) {
  const wasFs = !!document.fullscreenElement
  alert(msg)
  if (wasFs) ripristinaFullscreen()
}
