import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Login from './Login.jsx'
import RestablecerContrasena from './RestablecerContrasena.jsx'
import SeleccionLinea from './SeleccionLinea.jsx'
import MorphingSquare from './components/MorphingSquare.jsx'
import { useAuth } from './useAuth.js'

import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

function Root() {
  const { usuario, cargando, modoRecuperacion, cerrarSesion } = useAuth()
  const [lineaActiva, setLineaActiva] = useState(null)

  if (cargando) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <MorphingSquare />
      </div>
    )
  }

  return (
    <>
      <ToastContainer position="top-right" theme="light" />
      {modoRecuperacion
        ? <RestablecerContrasena />
        : usuario
          ? lineaActiva
            ? <App usuario={usuario} lineaActiva={lineaActiva}
                   onVolver={() => setLineaActiva(null)} />
            : <SeleccionLinea usuario={usuario}
                   onSeleccionar={setLineaActiva}
                   onCerrarSesion={cerrarSesion} />
          : <Login />
      }
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode><Root /></StrictMode>
)
