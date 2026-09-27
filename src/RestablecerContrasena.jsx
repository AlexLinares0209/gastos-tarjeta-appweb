import { useState } from 'react'
import { useAuth } from './useAuth'
import { toast } from 'react-toastify'
import { Eye, EyeOff } from 'lucide-react'

export default function RestablecerContrasena() {
  const { actualizarContrasena, cerrarSesion, setModoRecuperacion } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [verConfirmar, setVerConfirmar] = useState(false)
  const [cargando, setCargando] = useState(false)

  const handleSubmit = async () => {
    if (!password) return toast.error('Ingresa una contraseña')
    if (password.length < 6) return toast.error('La contraseña debe tener al menos 6 caracteres')
    if (password !== confirmar) return toast.error('Las contraseñas no coinciden')

    setCargando(true)
    try {
      await actualizarContrasena(password)
      toast.success('Contraseña actualizada — inicia sesión con tu nueva contraseña')
      await cerrarSesion()
    } catch (err) {
      toast.error(err.message || 'No se pudo actualizar la contraseña')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-9">
          <h1 className="text-lg font-bold text-accent tracking-[3px] mb-1">CONTROL DE GASTOS</h1>
        </div>

        <div className="bg-gray-100 shadow-md rounded-2xl p-7">
          <p className="text-sm text-gray-600 mb-5 text-center">Ingresa tu nueva contraseña.</p>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-[11px] text-muted uppercase tracking-wider">Nueva contraseña</label>
              <div className="relative">
                <input type={verPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="mínimo 6 caracteres" autoFocus
                  className="w-full mt-1.5 px-3.5 py-2.5 pr-10 bg-white border border-gray-300 rounded-lg text-black text-sm outline-none focus:border-accent transition-colors" />
                <button type="button" onClick={() => setVerPassword(p => !p)}
                  className="absolute right-3 top-0 bottom-0 flex items-center text-muted bg-transparent border-0 cursor-pointer p-0">
                  {verPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-[11px] text-muted uppercase tracking-wider">Confirmar contraseña</label>
              <div className="relative">
                <input type={verConfirmar ? 'text' : 'password'} value={confirmar} onChange={e => setConfirmar(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="repite la contraseña"
                  className="w-full mt-1.5 px-3.5 py-2.5 pr-10 bg-white border border-gray-300 rounded-lg text-black text-sm outline-none focus:border-accent transition-colors" />
                <button type="button" onClick={() => setVerConfirmar(p => !p)}
                  className="absolute right-3 top-0 bottom-0 flex items-center text-muted bg-transparent border-0 cursor-pointer p-0">
                  {verConfirmar ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button onClick={handleSubmit} disabled={cargando}
              className={`mt-1 py-3 rounded-xl text-white text-sm font-semibold border-0 transition-colors font-sans
                ${cargando ? 'bg-accent cursor-not-allowed' : 'bg-accent cursor-pointer hover:opacity-90'}`}>
              {cargando ? 'Guardando...' : 'Guardar contraseña'}
            </button>
            <button onClick={() => setModoRecuperacion(false)}
              className="text-xs text-muted bg-transparent border-0 cursor-pointer text-center font-sans hover:underline">
              Volver a iniciar sesión
            </button>
          </div>
        </div>

        <p className="text-center mt-5 text-xs text-muted">
          Tus datos son privados — solo tú puedes verlos
        </p>
      </div>
    </div>
  )
}
