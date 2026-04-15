import { createContext, useContext, useState, useCallback } from 'react'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((msg, tipo = 'v') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, msg, tipo }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toasts">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.tipo}`}>{t.msg}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
