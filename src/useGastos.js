import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const ORDEN_MESES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
  'JULIO','AGOSTO','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE']

export function calcularCuotas(monto, cuotas) {
  const TASA = 0.0584
  if (cuotas === 0) return { cuotaMensual: 0, interes: 0, totalPagar: monto }
  const interes = monto * TASA * cuotas
  const total = monto + interes
  return {
    cuotaMensual: parseFloat((total / cuotas).toFixed(2)),
    interes: parseFloat(interes.toFixed(2)),
    totalPagar: parseFloat(total.toFixed(2)),
  }
}

export function cuotaParaMes(gasto, mesIndex) {
  if (gasto.cuotas === 0) return mesIndex === 0 ? gasto.monto : 0
  const calc = calcularCuotas(gasto.monto, gasto.cuotas)
  if (mesIndex >= 0 && mesIndex < gasto.cuotas) return calc.cuotaMensual
  return 0
}

export function useGastos(userId) {
  const [gastos, setGastos] = useState([])
  const [cierres, setCierres] = useState({})
  const [lineaCredito, setLineaCreditoState] = useState(1200)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!userId) return
    cargarTodo()
  }, [userId])

  async function cargarTodo() {
    setCargando(true)
    await Promise.all([cargarGastos(), cargarCierres(), cargarConfig()])
    setCargando(false)
  }

  async function cargarGastos() {
    const { data, error } = await supabase
      .from('gastos')
      .select('*')
      .order('fecha', { ascending: true })
    if (!error) setGastos(data || [])
  }

  async function cargarCierres() {
    const { data, error } = await supabase
      .from('cierres')
      .select('*')
    if (!error) {
      const mapa = {}
      ;(data || []).forEach(c => {
        mapa[c.mes] = {
          cierre: c.fecha_cierre,
          pago: c.fecha_pago,
          pagado: c.pagado,
          id: c.id,
        }
      })
      setCierres(mapa)
    }
  }

  async function cargarConfig() {
    const { data } = await supabase
      .from('configuracion')
      .select('linea_credito')
      .single()
    if (data) setLineaCreditoState(data.linea_credito)
  }

  const agregarGasto = async (gasto) => {
    const { data, error } = await supabase
      .from('gastos')
      .insert({ ...gasto, user_id: userId })
      .select()
      .single()
    if (!error) setGastos(prev => [...prev, data])
    if (!cierres[gasto.mes]) {
      await crearCierreDefault(gasto.mes)
    }
  }

  const editarGasto = async (id, datos) => {
    const { lugar, fecha, monto, cuotas, mes } = datos
    const { error } = await supabase
      .from('gastos')
      .update({ lugar, fecha, monto, cuotas, mes })
      .eq('id', id)
    if (!error) setGastos(prev => prev.map(g => g.id === id ? { ...g, ...datos } : g))
  }

  const eliminarGasto = async (id) => {
  const gasto = gastos.find(g => g.id === id)
  const { error } = await supabase.from('gastos').delete().eq('id', id)
  if (!error) {
    const nuevosGastos = gastos.filter(g => g.id !== id)
    setGastos(nuevosGastos)

    // Si ya no quedan gastos en ese mes, eliminar el cierre también
    const quedanEnMes = nuevosGastos.filter(g => g.mes === gasto.mes)
    if (quedanEnMes.length === 0 && cierres[gasto.mes]) {
      await supabase.from('cierres').delete().eq('id', cierres[gasto.mes].id)
      setCierres(prev => {
        const nuevo = { ...prev }
        delete nuevo[gasto.mes]
        return nuevo
      })
    }
  }
}

  async function crearCierreDefault(mes) {
    const idx = ORDEN_MESES.indexOf(mes)
    const year = 2026
    const cierreDate = `${year}-${String(idx + 1).padStart(2, '0')}-25`
    const pagoMonth = idx + 2 > 12 ? 1 : idx + 2
    const pagoYear = idx + 2 > 12 ? year + 1 : year
    const pagoDate = `${pagoYear}-${String(pagoMonth).padStart(2, '0')}-12`

    const { data, error } = await supabase
      .from('cierres')
      .insert({ user_id: userId, mes, fecha_cierre: cierreDate, fecha_pago: pagoDate, pagado: false })
      .select()
      .single()
    if (!error) {
      setCierres(prev => ({
        ...prev,
        [mes]: { cierre: data.fecha_cierre, pago: data.fecha_pago, pagado: false, id: data.id }
      }))
    }
  }

  const marcarPagado = async (mes) => {
    const cierre = cierres[mes]
    if (!cierre) return
    const nuevoPagado = !cierre.pagado
    const { error } = await supabase
      .from('cierres')
      .update({ pagado: nuevoPagado })
      .eq('id', cierre.id)
    if (!error) {
      setCierres(prev => ({ ...prev, [mes]: { ...prev[mes], pagado: nuevoPagado } }))
    }
  }

  const actualizarCierre = async (mes, datos) => {
    const cierre = cierres[mes]
    if (!cierre) return
    const { error } = await supabase
      .from('cierres')
      .update({ fecha_cierre: datos.cierre, fecha_pago: datos.pago })
      .eq('id', cierre.id)
    if (!error) {
      setCierres(prev => ({ ...prev, [mes]: { ...prev[mes], ...datos } }))
    }
  }

  const setLineaCredito = async (valor) => {
    setLineaCreditoState(valor)
    await supabase
      .from('configuracion')
      .upsert({ user_id: userId, linea_credito: valor }, { onConflict: 'user_id' })
  }

  const meses = [...new Set(gastos.map(g => g.mes))].sort(
    (a, b) => ORDEN_MESES.indexOf(a) - ORDEN_MESES.indexOf(b)
  )

  const gastosPorMes = (mes) => gastos.filter(g => g.mes === mes)

  const totalPagarMes = (mes) => {
    const idxMes = ORDEN_MESES.indexOf(mes)
    let total = 0
    gastos.forEach(g => {
      const diff = idxMes - ORDEN_MESES.indexOf(g.mes)
      if (diff >= 0) total += cuotaParaMes(g, diff)
    })
    return parseFloat(total.toFixed(2))
  }

  const cuotasPendientesEnMes = (mes) => {
    const idxMes = ORDEN_MESES.indexOf(mes)
    return gastos.filter(g => {
      const diff = idxMes - ORDEN_MESES.indexOf(g.mes)
      return diff > 0 && diff < g.cuotas
    }).map(g => {
      const diff = idxMes - ORDEN_MESES.indexOf(g.mes)
      const calc = calcularCuotas(g.monto, g.cuotas)
      return { ...g, cuotaActual: diff + 1, cuotaMensual: calc.cuotaMensual }
    })
  }

  const mesesConDeuda = () => {
    const set = new Set()
    gastos.forEach(g => {
      for (let i = 0; i < Math.max(1, g.cuotas); i++) {
        const idxMes = ORDEN_MESES.indexOf(g.mes) + i
        if (idxMes < ORDEN_MESES.length) set.add(ORDEN_MESES[idxMes])
      }
    })
    return [...set].filter(mes => !cierres[mes]?.pagado)
  }

  const deudaPendiente = parseFloat(
    mesesConDeuda().reduce((sum, mes) => sum + totalPagarMes(mes), 0).toFixed(2)
  )

  const disponible = parseFloat((lineaCredito - deudaPendiente).toFixed(2))

  const alertas = Object.entries(cierres)
    .filter(([_, c]) => !c.pagado)
    .map(([mes, c]) => ({ mes, ...c }))

  return {
    gastos, cierres, meses, cargando,
    lineaCredito, setLineaCredito,
    disponible, deudaPendiente,
    gastosPorMes, totalPagarMes, cuotasPendientesEnMes,
    alertas, agregarGasto, editarGasto, eliminarGasto,
    marcarPagado, actualizarCierre,
  }
}