import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { CreditCard, LogOut, Plus, Pencil, Trash } from 'lucide-react'
import { toast } from 'react-toastify'
import { cuotaParaMes } from './useGastos'
import { desplazarPeriodo, fechaDePeriodo, indicePeriodo, obtenerPeriodo } from './periodos'

const fmt = n => `S/.${parseFloat(n).toFixed(2)}`

function ModalNuevaLinea({ onGuardar, onCerrar }) {
  const [nombre, setNombre] = useState('')
  const [limite, setLimite] = useState('1200')
  const [diaCierre, setDiaCierre] = useState('25')
  const [diaPago, setDiaPago] = useState('12')

  const handleSubmit = async () => {
    if (!nombre.trim()) return toast.error('Ingresa un nombre')
    if (!limite || parseFloat(limite) <= 0) return toast.error('Ingresa un límite válido')
    if ([diaCierre, diaPago].some(dia => !dia || Number(dia) < 1 || Number(dia) > 31)) return toast.error('Los días deben estar entre 1 y 31')
    const result = await onGuardar(nombre.trim().toUpperCase(), parseFloat(limite), Number(diaCierre), Number(diaPago))
    if (result !== false) onCerrar()
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onCerrar()}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-sm">
        <p className="text-xs text-accent tracking-[2px] mb-4">NUEVA LÍNEA DE CRÉDITO</p>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[11px] text-muted uppercase tracking-wider">Nombre</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Interbank, BBVA" autoFocus
              className="w-full mt-1.5 px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-black text-sm outline-none focus:border-accent transition-colors" />
          </div>
          <div>
            <label className="text-[11px] text-muted uppercase tracking-wider">Límite (S/.)</label>
            <input type="number" min="0" step="50" value={limite}
              onChange={e => setLimite(e.target.value)}
              className="w-full mt-1.5 px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-black text-sm outline-none focus:border-accent transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-muted uppercase tracking-wider">Día de cierre</label>
              <input type="number" min="1" max="31" value={diaCierre}
                onChange={e => setDiaCierre(e.target.value)}
                className="w-full mt-1.5 px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-black text-sm outline-none focus:border-accent transition-colors" />
            </div>
            <div>
              <label className="text-[11px] text-muted uppercase tracking-wider">Día de pago</label>
              <input type="number" min="1" max="31" value={diaPago}
                onChange={e => setDiaPago(e.target.value)}
                className="w-full mt-1.5 px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-black text-sm outline-none focus:border-accent transition-colors" />
            </div>
          </div>
          <div className="flex gap-3 mt-1">
            <button onClick={onCerrar}
              className="flex-1 py-2.5 bg-transparent border border-gray-300 rounded-xl text-gray-600 cursor-pointer text-sm font-sans">
              Cancelar
            </button>
            <button onClick={handleSubmit}
              className="flex-1 py-2.5 bg-accent border-0 rounded-xl text-white cursor-pointer text-sm font-semibold font-sans hover:opacity-90">
              Crear
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ModalEditarLinea({ linea, onGuardar, onEliminar, onCerrar }) {
  const [nombre, setNombre] = useState(linea.nombre)
  const [limite, setLimite] = useState(String(linea.limite))
  const [diaCierre, setDiaCierre] = useState(String(linea.dia_cierre ?? 25))
  const [diaPago, setDiaPago] = useState(String(linea.dia_pago ?? 12))

  const handleGuardar = async () => {
    if (!nombre.trim()) return toast.error('Ingresa un nombre')
    if (!limite || parseFloat(limite) <= 0) return toast.error('Ingresa un límite válido')
    if ([diaCierre, diaPago].some(dia => !dia || Number(dia) < 1 || Number(dia) > 31)) return toast.error('Los días deben estar entre 1 y 31')
    const result = await onGuardar(linea.id, nombre.trim().toUpperCase(), parseFloat(limite), Number(diaCierre), Number(diaPago))
    if (result !== false) onCerrar()
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onCerrar()}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-sm">
        <p className="text-xs text-accent tracking-[2px] mb-4">EDITAR LÍNEA</p>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[11px] text-muted uppercase tracking-wider">Nombre</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)}
              className="w-full mt-1.5 px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-black text-sm outline-none focus:border-accent transition-colors" />
          </div>
          <div>
            <label className="text-[11px] text-muted uppercase tracking-wider">Límite (S/.)</label>
            <input type="number" min="0" step="50" value={limite}
              onChange={e => setLimite(e.target.value)}
              className="w-full mt-1.5 px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-black text-sm outline-none focus:border-accent transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-muted uppercase tracking-wider">Día de cierre</label>
              <input type="number" min="1" max="31" value={diaCierre}
                onChange={e => setDiaCierre(e.target.value)}
                className="w-full mt-1.5 px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-black text-sm outline-none focus:border-accent transition-colors" />
            </div>
            <div>
              <label className="text-[11px] text-muted uppercase tracking-wider">Día de pago</label>
              <input type="number" min="1" max="31" value={diaPago}
                onChange={e => setDiaPago(e.target.value)}
                className="w-full mt-1.5 px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-black text-sm outline-none focus:border-accent transition-colors" />
            </div>
          </div>
          <div className="flex gap-3 mt-1">
            <button onClick={() => { onEliminar(linea.id); onCerrar() }}
              className="py-2.5 px-4 bg-transparent border border-red-300 rounded-xl text-red-500 cursor-pointer text-sm font-sans hover:bg-red-50">
              <Trash size={14} />
            </button>
            <button onClick={onCerrar}
              className="flex-1 py-2.5 bg-transparent border border-gray-300 rounded-xl text-gray-600 cursor-pointer text-sm font-sans">
              Cancelar
            </button>
            <button onClick={handleGuardar}
              className="flex-1 py-2.5 bg-accent border-0 rounded-xl text-white cursor-pointer text-sm font-semibold font-sans hover:opacity-90">
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CardLinea({ linea, stats, onSeleccionar, onEditar }) {
  const pct = stats.limite > 0 ? Math.min(100, (stats.deuda / stats.limite) * 100) : 0
  const barColor = pct > 85 ? 'bg-danger' : pct > 60 ? 'bg-warning' : 'bg-success'

  return (
    <div onClick={onSeleccionar}
      className="bg-white border border-gray-400 rounded-2xl p-5 cursor-pointer hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <CreditCard size={20} className="text-accent" />
          <span className="font-semibold text-gray-800">{linea.nombre}</span>
        </div>
        <button onClick={e => { e.stopPropagation(); onEditar(linea) }}
          className="text-muted hover:text-accent transition-colors bg-transparent border-0 cursor-pointer p-1">
          <Pencil size={14} />
        </button>
      </div>
      <p className="text-2xl font-medium text-gray-800 mb-1">{fmt(linea.limite)}</p>
      <div className="bg-gray-300 rounded-full h-2 overflow-hidden mb-2">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-muted">
        <span>Deuda: <strong>{fmt(stats.deuda)}</strong></span>
        <span>{stats.gastos} gasto{stats.gastos !== 1 ? 's' : ''}</span>
      </div>
      <p className="m-0 mt-2 text-xs text-muted">Cierre: día {linea.dia_cierre ?? 25} · Pago: día {linea.dia_pago ?? 12}</p>
    </div>
  )
}

export default function SeleccionLinea({ usuario, onSeleccionar, onCerrarSesion }) {
  const [lineas, setLineas] = useState([])
  const [stats, setStats] = useState({})
  const [cargando, setCargando] = useState(true)
  const [modalNueva, setModalNueva] = useState(false)
  const [modalEditar, setModalEditar] = useState(null)

  async function cargarStats(lineasData) {
    const mapa = {}
    for (const linea of lineasData) {
      const { data: gastos } = await supabase
        .from('gastos')
        .select('monto, cuotas, cuota_mensual, cashback, mes, periodo, fecha, es_abono')
        .eq('linea_credito_id', linea.id)

      const { data: cierresData } = await supabase
        .from('cierres')
        .select('mes, periodo, fecha_cierre, pagado')
        .eq('linea_credito_id', linea.id)

      const cierresMap = {}
      ;(cierresData || []).forEach(c => {
        const periodo = c.periodo || c.fecha_cierre?.slice(0, 7) || obtenerPeriodo(c.mes)
        if (periodo) cierresMap[periodo] = c.pagado
      })

      const periodosConDeuda = new Set()
      ;(gastos || []).forEach(g => {
        if (g.es_abono) return
        const inicio = obtenerPeriodo(g.periodo || g.mes, g.fecha)
        if (!inicio) return
        for (let i = 0; i < Math.max(1, Number(g.cuotas) || 0); i++) periodosConDeuda.add(desplazarPeriodo(inicio, i))
      })

      let deuda = 0
      ;[...periodosConDeuda].filter(periodo => !cierresMap[periodo]).forEach(periodo => {
        const indiceObjetivo = indicePeriodo(periodo)
        let totalPeriodo = 0
        ;(gastos || []).forEach(g => {
          if (g.es_abono) return
          const inicio = obtenerPeriodo(g.periodo || g.mes, g.fecha)
          const diff = indiceObjetivo - indicePeriodo(inicio)
          if (diff >= 0) totalPeriodo += cuotaParaMes(g, diff)
        })
        const abonos = (gastos || [])
          .filter(g => g.es_abono && obtenerPeriodo(g.periodo || g.mes, g.fecha) === periodo)
          .reduce((total, g) => total + Number(g.monto), 0)
        deuda += totalPeriodo - abonos
      })

      mapa[linea.id] = {
        deuda: parseFloat(deuda.toFixed(2)),
        gastos: (gastos || []).length,
        limite: linea.limite,
      }
    }
    setStats(mapa)
  }

  async function cargarLineas() {
    setCargando(true)
    const { data, error } = await supabase
      .from('lineas_credito')
      .select('*')
      .eq('user_id', usuario.id)
      .order('created_at', { ascending: true })
    if (!error) {
      setLineas(data || [])
      await cargarStats(data || [])
    }
    setCargando(false)
  }

  useEffect(() => {
    Promise.resolve().then(() => cargarLineas())
  }, [usuario.id])

  async function crearLinea(nombre, limite, diaCierre, diaPago) {
    const { data, error } = await supabase
      .from('lineas_credito')
      .insert({ user_id: usuario.id, nombre, limite, dia_cierre: diaCierre, dia_pago: diaPago })
      .select()
      .single()
    if (error) { toast.error('No se pudo crear la línea'); return false }
    setLineas(prev => [...prev, data])
    setStats(prev => ({ ...prev, [data.id]: { deuda: 0, gastos: 0, limite } }))
    toast.success('Línea creada')
    return true
  }

  async function editarLinea(id, nombre, limite, diaCierre, diaPago) {
    const hoy = new Date()
    const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
    const { data: cierresFuturos, error: errorCierres } = await supabase
      .from('cierres')
      .select('id, mes, periodo, fecha_cierre')
      .eq('linea_credito_id', id)
      .eq('pagado', false)
      .gte('fecha_cierre', hoyISO)
    if (errorCierres) { toast.error('No se pudieron consultar los cierres futuros'); return false }

    const { error } = await supabase
      .from('lineas_credito')
      .update({ nombre, limite, dia_cierre: diaCierre, dia_pago: diaPago })
      .eq('id', id)
    if (error) { toast.error('No se pudo actualizar'); return false }

    const resultadosCierres = await Promise.all((cierresFuturos || []).map(cierre => {
      const periodo = cierre.periodo || cierre.fecha_cierre?.slice(0, 7)
      if (!periodo) return null
      const periodoPago = desplazarPeriodo(periodo, 1)
      return supabase.from('cierres').update({
        fecha_cierre: fechaDePeriodo(periodo, diaCierre),
        fecha_pago: fechaDePeriodo(periodoPago, diaPago),
      }).eq('id', cierre.id)
    }).filter(Boolean))

    setLineas(prev => prev.map(l => l.id === id ? { ...l, nombre, limite, dia_cierre: diaCierre, dia_pago: diaPago } : l))
    setStats(prev => ({ ...prev, [id]: { ...prev[id], limite } }))
    if (resultadosCierres.some(resultado => resultado.error)) {
      toast.error('Tarjeta actualizada, pero no se pudieron cambiar todos los cierres futuros')
    } else {
      toast.success('Tarjeta y cierres futuros actualizados')
    }
    return true
  }

  async function eliminarLinea(id) {
    const { error } = await supabase.from('lineas_credito').delete().eq('id', id)
    if (error) { toast.error('No se pudo eliminar'); return }
    setLineas(prev => prev.filter(l => l.id !== id))
    setStats(prev => { const n = { ...prev }; delete n[id]; return n })
    toast.success('Línea eliminada')
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600 text-lg tracking-[2px]">CARGANDO...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-lg font-bold text-accent tracking-[3px]">MIS TARJETAS</h1>
          <button onClick={async () => { await onCerrarSesion(); toast.success('Sesión cerrada') }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-transparent border border-border rounded-xl text-muted text-sm cursor-pointer font-sans hover:opacity-90">
            <LogOut size={14} /> Salir
          </button>
        </div>

        <p className="text-gray-600 mb-6">
          Hola, <span className="text-accent font-semibold">{usuario.email.split('@')[0]}</span>. Selecciona una tarjeta para ver sus gastos.
        </p>

        {lineas.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16 text-gray-600">
            <CreditCard size={48} className="mb-4 text-muted" />
            <p className="text-lg mb-2">Todavía no tienes líneas de crédito</p>
            <p className="text-sm text-muted mb-6">Crea tu primera línea para empezar a registrar gastos</p>
            <button onClick={() => setModalNueva(true)}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-accent border-0 rounded-xl text-white text-sm font-semibold cursor-pointer font-sans hover:opacity-90">
              <Plus size={14} /> Crear primera línea
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {lineas.map(linea => (
                <CardLinea key={linea.id} linea={linea}
                  stats={stats[linea.id] || { deuda: 0, gastos: 0, limite: linea.limite }}
                  onSeleccionar={() => onSeleccionar(linea)}
                  onEditar={setModalEditar} />
              ))}
            </div>
            <div className="text-center">
              <button onClick={() => setModalNueva(true)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-transparent border border-accent rounded-xl text-accent text-sm font-medium cursor-pointer font-sans hover:bg-accent hover:text-white transition-colors">
                <Plus size={14} /> Nueva línea de crédito
              </button>
            </div>
          </>
        )}
      </div>

      {modalNueva && (
        <ModalNuevaLinea onGuardar={crearLinea} onCerrar={() => setModalNueva(false)} />
      )}
      {modalEditar && (
        <ModalEditarLinea linea={modalEditar} onGuardar={editarLinea}
          onEliminar={eliminarLinea} onCerrar={() => setModalEditar(null)} />
      )}
    </div>
  )
}
