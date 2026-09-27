import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export function useAuth() {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [modoRecuperacion, setModoRecuperacion] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUsuario(session?.user ?? null)
      setCargando(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setModoRecuperacion(true)
      }
      setUsuario(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const registrar = async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  const iniciarSesion = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
  }

  const recuperarContrasena = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    })
    if (error) throw error
  }

  const actualizarContrasena = async (nuevaPassword) => {
    const { error } = await supabase.auth.updateUser({ password: nuevaPassword })
    if (error) throw error
    setModoRecuperacion(false)
  }

  return { usuario, cargando, modoRecuperacion, setModoRecuperacion, registrar, iniciarSesion, cerrarSesion, recuperarContrasena, actualizarContrasena }
}
