import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Login from './Login.jsx'
import { useAuth } from './useAuth.js'

import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

function Root() {
  const { usuario, cargando } = useAuth()

  if (cargando) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center text-muted">
          <p className="font-mono text-xs tracking-[2px]">CARGANDO...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <ToastContainer position="top-right" theme="light" />
      {usuario ? <App usuario={usuario} /> : <Login />}
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode><Root /></StrictMode>
)
