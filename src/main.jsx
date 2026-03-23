import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'
import Login from './Login.jsx'
import { useAuth } from './useAuth.js'

function Root() {
  const { usuario, cargando } = useAuth()

  if (cargando) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center text-muted">
          <div className="text-4xl mb-3">💳</div>
          <p className="font-mono text-xs tracking-[2px]">CARGANDO...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#20242f', color: '#e8eaf0', border: '1px solid #2a2f3d', fontFamily: 'DM Sans' },
        success: { iconTheme: { primary: '#22c55e', secondary: '#052e16' } },
        error: { iconTheme: { primary: '#ef4444', secondary: '#3a1a1a' } },
      }} />
      {usuario ? <App usuario={usuario} /> : <Login />}
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode><Root /></StrictMode>
)
