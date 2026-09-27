import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const ORDEN_MESES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
  'JULIO','AGOSTO','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE']

export function calcularCuotas(monto, cuotas, cuotaMensual = 0) {
  if (cuotas === 0) return { cuotaMensual: 0, interes: 0, totalPagar: monto }
  if (cuotaMensual > 0) {
    const total = cuotaMensual * cuotas
    return {
      cuotaMensual,
      interes: parseFloat((total - monto).toFixed(2)),
      totalPagar: parseFloat(total.toFixed(2)),
    }
  }
  return { cuotaMensual: 0, interes: 0, totalPagar: monto }
}

export function cuotaParaMes(gasto, mesIndex) {
  const cuotas = Number(gasto.cuotas) || 0
  const cashback = Number(gasto.cashback) || 0
  if (cuotas === 0) return mesIndex === 0 ? Math.max(0, Number(gasto.monto) - cashback) : 0
  const calc = calcularCuotas(Number(gasto.monto), cuotas, Number(gasto.cuota_mensual) || 0)
  if (mesIndex >= 0 && mesIndex < cuotas) {
    return mesIndex === 0
      ? Math.max(0, calc.cuotaMensual - cashback)
      : calc.cuotaMensual
  }
  return 0
}

export function useGastos(userId, lineaCreditoId) {
  const [gastos, setGastos] = useState([])
  const [cierres, setCierres] = useState({})
  const [lineaCredito, setLineaCreditoState] = useState(1200)
  const [cargando, setCargando] = useState(true)

  async function crearCierreDefault(mes) {
    const idx = ORDEN_MESES.indexOf(mes)
    const year = new Date().getFullYear()
    const cierreDate = `${year}-${String(idx + 1).padStart(2, '0')}-25`
    const pagoMonth = idx + 2 > 12 ? 1 : idx + 2
    const pagoYear = idx + 2 > 12 ? year + 1 : year
    const pagoDate = `${pagoYear}-${String(pagoMonth).padStart(2, '0')}-12`

    const { data, error } = await supabase
      .from('cierres')
      .insert({ user_id: userId, linea_credito_id: lineaCreditoId, mes, fecha_cierre: cierreDate, fecha_pago: pagoDate, pagado: false })
      .select()
      .single()
    if (!error) {
      setCierres(prev => ({
        ...prev,
        [mes]: { cierre: data.fecha_cierre, pago: data.fecha_pago, pagado: false, id: data.id }
      }))
    }
  }

  async function crearCierresFaltantes() {
    const [gastosRes, cierresRes] = await Promise.all([
      supabase.from('gastos').select('mes').eq('linea_credito_id', lineaCreditoId),
      supabase.from('cierres').select('mes').eq('linea_credito_id', lineaCreditoId),
    ])
    const mesesConGastos = [...new Set((gastosRes.data || []).map(g => g.mes))]
    const mesesConCierre = new Set((cierresRes.data || []).map(c => c.mes))
    const mesesFaltantes = mesesConGastos.filter(m => !mesesConCierre.has(m))
    for (const mes of mesesFaltantes) {
      await crearCierreDefault(mes)
    }
  }

  async function cargarTodo() {
    setCargando(true)
    await Promise.all([cargarGastos(), cargarCierres(), cargarLineaCredito()])
    await crearCierresFaltantes()
    setCargando(false)
  }

  async function cargarGastos() {
    const { data, error } = await supabase
      .from('gastos')
      .select('*')
      .eq('linea_credito_id', lineaCreditoId)
      .order('fecha', { ascending: true })
    if (!error) setGastos(data || [])
  }

  async function cargarCierres() {
    const { data, error } = await supabase
      .from('cierres')
      .select('*')
      .eq('linea_credito_id', lineaCreditoId)
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

  async function cargarLineaCredito() {
    const { data } = await supabase
      .from('lineas_credito')
      .select('limite')
      .eq('id', lineaCreditoId)
      .single()
    if (data) setLineaCreditoState(data.limite)
  }

  useEffect(() => {
    if (!userId || !lineaCreditoId) return
    Promise.resolve().then(() => cargarTodo())
  }, [userId, lineaCreditoId])

  const agregarGasto = async (gasto) => {
    const datos = { ...gasto, user_id: userId, linea_credito_id: lineaCreditoId }
    if (gasto.cuota_mensual == null) delete datos.cuota_mensual

    const { data, error } = await supabase
      .from('gastos')
    .insert(datos)
      .select()
      .single()
    if (error) return { error }

    setGastos(prev => [...prev, data])
    if (!cierres[gasto.mes]) {
      await crearCierreDefault(gasto.mes)
    }
    return { error: null }
  }

  const editarGasto = async (id, datos) => {
    const { lugar, fecha, monto, cuotas, cuota_mensual, cashback, mes, es_abono } = datos
    const cambios = { lugar, fecha, monto, cuotas, cashback, mes, es_abono }
    if (cuota_mensual != null) cambios.cuota_mensual = cuota_mensual
    const { error } = await supabase
      .from('gastos')
      .update(cambios)
      .eq('id', id)
    if (!error) setGastos(prev => prev.map(g => g.id === id ? { ...g, ...datos } : g))
    return { error }
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

  const resetearTodo = async () => {
    const [gastosResult, cierresResult] = await Promise.all([
      supabase.from('gastos').delete().eq('linea_credito_id', lineaCreditoId),
      supabase.from('cierres').delete().eq('linea_credito_id', lineaCreditoId),
    ])

    const error = gastosResult.error || cierresResult.error
    if (error) return { error }

    setGastos([])
    setCierres({})
    setLineaCreditoState(1200)
    return { error: null }
  }

  const marcarPagado = async (mes) => {
    const cierre = cierres[mes]
    if (!cierre) {
      console.error('No existe cierre para:', mes, 'cierres disponibles:', Object.keys(cierres))
      return { error: new Error('No existe cierre para este mes') }
    }
    const nuevoPagado = !cierre.pagado
    const { error } = await supabase
      .from('cierres')
      .update({ pagado: nuevoPagado })
      .eq('id', cierre.id)
    if (error) {
      console.error('Error Supabase:', error.message, error.code, error.details, 'cierre.id:', cierre.id)
      return { error }
    }
    setCierres(prev => ({ ...prev, [mes]: { ...prev[mes], pagado: nuevoPagado } }))
    return { error: null }
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
      .from('lineas_credito')
      .update({ limite: valor })
      .eq('id', lineaCreditoId)
  }

  const meses = [...new Set(gastos.map(g => g.mes))].sort(
    (a, b) => ORDEN_MESES.indexOf(a) - ORDEN_MESES.indexOf(b)
  )

  const gastosPorMes = (mes) => gastos.filter(g => g.mes === mes)

  const abonosDelMes = (mes) => gastos
    .filter(g => g.mes === mes && g.es_abono)
    .reduce((sum, g) => sum + Number(g.monto), 0)

  const totalPagarMes = (mes) => {
    const idxMes = ORDEN_MESES.indexOf(mes)
    let total = 0
    gastos.forEach(g => {
      if (g.es_abono) return
      const diff = idxMes - ORDEN_MESES.indexOf(g.mes)
      if (diff >= 0) total += cuotaParaMes(g, diff)
    })
    return parseFloat((total - abonosDelMes(mes)).toFixed(2))
  }

  const cuotasPendientesEnMes = (mes) => {
    const idxMes = ORDEN_MESES.indexOf(mes)
    return gastos.filter(g => {
      const diff = idxMes - ORDEN_MESES.indexOf(g.mes)
      return diff > 0 && diff < g.cuotas
    }).map(g => {
      const diff = idxMes - ORDEN_MESES.indexOf(g.mes)
      const calc = calcularCuotas(g.monto, g.cuotas, g.cuota_mensual)
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

  const deudaBruta = parseFloat(
    mesesConDeuda().reduce((sum, mes) => sum + totalPagarMes(mes), 0).toFixed(2)
  )

  const deudaPendiente = deudaBruta

  const disponible = parseFloat((lineaCredito - deudaPendiente).toFixed(2))

  const alertas = Object.entries(cierres)
    .filter(([, c]) => !c.pagado)
    .map(([mes, c]) => ({ mes, ...c }))

  return {
    gastos, cierres, meses, cargando,
    lineaCredito, setLineaCredito,
    disponible, deudaPendiente,
    gastosPorMes, abonosDelMes, totalPagarMes, cuotasPendientesEnMes,
    alertas, agregarGasto, editarGasto, eliminarGasto,
    marcarPagado, actualizarCierre, resetearTodo,
  }
}