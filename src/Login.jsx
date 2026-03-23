import { useState } from 'react'
import { useAuth } from './useAuth'
import {CreditCard} from 'lucide-react'

import { toast } from 'react-toastify'

export default function Login() {
  const { registrar, iniciarSesion } = useAuth()
  const [modo, setModo] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)

  const handleSubmit = async () => {
    if (!email || !password) return toast.error('Completa todos los campos')
    if (password.length < 6) return toast.error('La contraseña debe tener al menos 6 caracteres')
    setCargando(true)
    try {
      if (modo === 'login') {
        await iniciarSesion(email, password)
        toast.success('Bienvenido')
      } else {
        await registrar(email, password)
        toast.success('Cuenta creada — ya puedes ingresar')
        setModo('login')
      }
    } catch (err) {
      const mensajes = {
        'Invalid login credentials': 'Email o contraseña incorrectos',
        'User already registered': 'Este email ya está registrado',
      }
      toast.error(mensajes[err.message] || err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-9">
          <h1 className=" text-lg font-bold text-accent tracking-[3px] mb-1">CONTROL DE GASTOS</h1>
        </div>

        {/* Card */}
        <div className="bg-gray-100 shadow-md rounded-2xl p-7">

          {/* Tabs */}
          <div className="flex bg-gray-200 rounded-xl p-1 mb-6">
            {['login', 'registro'].map(m => (
              <button key={m} onClick={() => setModo(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border-0 font-sans
                  ${modo === m ? 'bg-accent text-white' : 'bg-transparent text-muted'}`}>
                {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
              </button>
            ))}
          </div>

          {/* Campos */}
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-[11px] text-muted uppercase tracking-wider">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="tucorreo@gmail.com" autoFocus
                className="w-full mt-1.5 px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-black text-sm outline-none focus:border-accent transition-colors" />
            </div>
            <div>
              <label className="text-[11px] text-muted uppercase tracking-wider">Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="mínimo 6 caracteres"
                className="w-full mt-1.5 px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-black text-sm outline-none focus:border-accent transition-colors" />
            </div>
            <button onClick={handleSubmit} disabled={cargando}
              className={`mt-1 py-3 rounded-xl text-white text-sm font-semibold border-0 transition-colors font-sans
                ${cargando ? 'bg-accent cursor-not-allowed' : 'bg-accent cursor-pointer hover:opacity-90'}`}>
              {cargando ? 'Cargando...' : modo === 'login' ? 'Entrar' : 'Crear cuenta'}
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
