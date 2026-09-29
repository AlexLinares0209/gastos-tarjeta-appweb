import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { desplazarPeriodo, fechaDePeriodo, indicePeriodo, mesDePeriodo, obtenerPeriodo } from './periodos'

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

function periodoDeCierre(cierre) {
  return cierre.periodo || cierre.fecha_cierre?.slice(0, 7) || obtenerPeriodo(cierre.mes)
}

export function useGastos(userId, lineaCreditoId) {
  const [gastos, setGastos] = useState([])
  const [cierres, setCierres] = useState({})
  const [lineaCredito, setLineaCreditoState] = useState(1200)
  const [diaCierre, setDiaCierre] = useState(25)
  const [diaPago, setDiaPago] = useState(12)
  const [cargando, setCargando] = useState(true)

  async function crearCierreDefault(periodo, configuracion = { dia_cierre: diaCierre, dia_pago: diaPago }) {
    const mes = mesDePeriodo(periodo)
    const periodoPago = desplazarPeriodo(periodo, 1)
    const cierreDate = fechaDePeriodo(periodo, configuracion?.dia_cierre ?? 25)
    const pagoDate = fechaDePeriodo(periodoPago, configuracion?.dia_pago ?? 12)

    const { data, error } = await supabase
      .from('cierres')
      .insert({ user_id: userId, linea_credito_id: lineaCreditoId, mes, periodo, fecha_cierre: cierreDate, fecha_pago: pagoDate, pagado: false })
      .select()
      .single()
    if (!error) {
      setCierres(prev => ({
        ...prev,
        [periodo]: { cierre: data.fecha_cierre, pago: data.fecha_pago, pagado: false, id: data.id, mes, periodo }
      }))
    }
  }

  async function crearCierresFaltantes(configuracion) {
    const [gastosRes, cierresRes] = await Promise.all([
      supabase.from('gastos').select('periodo, mes, fecha, cuotas').eq('linea_credito_id', lineaCreditoId),
      supabase.from('cierres').select('periodo, mes, fecha_cierre').eq('linea_credito_id', lineaCreditoId),
    ])
    const periodosConGastos = [...new Set((gastosRes.data || []).flatMap(g => {
      const inicio = obtenerPeriodo(g.periodo || g.mes, g.fecha)
      if (!inicio) return []
      return Array.from({ length: Math.max(1, Number(g.cuotas) || 0) }, (_, indice) => desplazarPeriodo(inicio, indice))
    }))]
    const periodosConCierre = new Set((cierresRes.data || []).map(periodoDeCierre).filter(Boolean))
    const periodosFaltantes = periodosConGastos.filter(periodo => !periodosConCierre.has(periodo))
    for (const periodo of periodosFaltantes) {
      await crearCierreDefault(periodo, configuracion)
    }
  }

  async function cargarTodo() {
    setCargando(true)
    const [, , configuracion] = await Promise.all([cargarGastos(), cargarCierres(), cargarLineaCredito()])
    await crearCierresFaltantes(configuracion)
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
        const periodo = periodoDeCierre(c)
        if (!periodo) return
        mapa[periodo] = {
          cierre: c.fecha_cierre,
          pago: c.fecha_pago,
          pagado: c.pagado,
          id: c.id,
          mes: c.mes || mesDePeriodo(periodo),
          periodo,
        }
      })
      setCierres(mapa)
    }
  }

  async function cargarLineaCredito() {
    const { data } = await supabase
      .from('lineas_credito')
      .select('limite, dia_cierre, dia_pago')
      .eq('id', lineaCreditoId)
      .single()
    if (data) {
      setLineaCreditoState(data.limite)
      setDiaCierre(data.dia_cierre ?? 25)
      setDiaPago(data.dia_pago ?? 12)
    }
    return data
  }

  useEffect(() => {
    if (!userId || !lineaCreditoId) return
    Promise.resolve().then(() => cargarTodo())
  }, [userId, lineaCreditoId])

  const agregarGasto = async (gasto) => {
    const periodo = obtenerPeriodo(gasto.periodo || gasto.mes, gasto.fecha)
    const mes = mesDePeriodo(periodo)
    if (!periodo || !mes) return { error: new Error('Selecciona un periodo válido') }
    const periodosGasto = Array.from({ length: Math.max(1, Number(gasto.cuotas) || 0) }, (_, indice) => desplazarPeriodo(periodo, indice))
    const periodoPagado = periodosGasto.find(periodoGasto => cierres[periodoGasto]?.pagado)
    if (periodoPagado) return { error: new Error(`No se puede agregar el gasto porque el periodo ${periodoPagado} ya está pagado`) }

    const datos = { ...gasto, mes, periodo, user_id: userId, linea_credito_id: lineaCreditoId }
    if (gasto.cuota_mensual == null) delete datos.cuota_mensual

    const { data, error } = await supabase
      .from('gastos')
    .insert(datos)
      .select()
      .single()
    if (error) return { error }

    setGastos(prev => [...prev, data])
    for (const periodoGasto of periodosGasto) {
      if (!cierres[periodoGasto]) await crearCierreDefault(periodoGasto)
    }
    return { error: null }
  }

  const editarGasto = async (id, datos) => {
    const periodo = obtenerPeriodo(datos.periodo || datos.mes, datos.fecha)
    const mes = mesDePeriodo(periodo)
    if (!periodo || !mes) return { error: new Error('Selecciona un periodo válido') }
    const periodosGasto = Array.from({ length: Math.max(1, Number(datos.cuotas) || 0) }, (_, indice) => desplazarPeriodo(periodo, indice))
    const periodoPagado = periodosGasto.find(periodoGasto => cierres[periodoGasto]?.pagado)
    if (periodoPagado) return { error: new Error(`No se puede guardar el gasto porque el periodo ${periodoPagado} ya está pagado`) }
    const { lugar, descripcion, categoria, fecha, monto, cuotas, cuota_mensual, cashback, es_abono } = datos
    const cambios = { lugar, descripcion, categoria, fecha, monto, cuotas, cuota_mensual, cashback, mes, periodo, es_abono }
    if (cuota_mensual != null) cambios.cuota_mensual = cuota_mensual
    const { error } = await supabase
      .from('gastos')
      .update(cambios)
      .eq('id', id)
    if (!error) {
      setGastos(prev => prev.map(g => g.id === id ? { ...g, ...datos, mes, periodo } : g))
      for (const periodoGasto of periodosGasto) {
        if (!cierres[periodoGasto]) await crearCierreDefault(periodoGasto)
      }
    }
    return { error }
  }

  const eliminarGasto = async (id) => {
  const gasto = gastos.find(g => g.id === id)
  if (!gasto) return { error: new Error('No se encontró el gasto') }
  const periodo = obtenerPeriodo(gasto.periodo || gasto.mes, gasto.fecha)
  const { error } = await supabase.from('gastos').delete().eq('id', id)
  if (!error) {
    const nuevosGastos = gastos.filter(g => g.id !== id)
    setGastos(nuevosGastos)

    // Si ya no quedan gastos en ese periodo, eliminar el cierre también
    const indiceObjetivo = indicePeriodo(periodo)
    const quedanEnPeriodo = nuevosGastos.some(g => {
      const inicio = obtenerPeriodo(g.periodo || g.mes, g.fecha)
      const diferencia = indiceObjetivo - indicePeriodo(inicio)
      return g.es_abono ? diferencia === 0 : diferencia >= 0 && cuotaParaMes(g, diferencia) > 0
    })
    if (!quedanEnPeriodo && cierres[periodo]) {
      await supabase.from('cierres').delete().eq('id', cierres[periodo].id)
      setCierres(prev => {
        const nuevo = { ...prev }
        delete nuevo[periodo]
        return nuevo
      })
    }
  }
  return { error: null }
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

  const marcarPagado = async (periodo) => {
    const cierre = cierres[periodo]
    if (!cierre) {
      console.error('No existe cierre para:', periodo, 'cierres disponibles:', Object.keys(cierres))
      return { error: new Error('No existe cierre para este periodo') }
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
    setCierres(prev => ({ ...prev, [periodo]: { ...prev[periodo], pagado: nuevoPagado } }))
    return { error: null }
  }

  const actualizarCierre = async (periodo, datos) => {
    const cierre = cierres[periodo]
    if (!cierre) return
    const { error } = await supabase
      .from('cierres')
      .update({ fecha_cierre: datos.cierre, fecha_pago: datos.pago })
      .eq('id', cierre.id)
    if (!error) {
      setCierres(prev => ({ ...prev, [periodo]: { ...prev[periodo], ...datos } }))
    }
  }

  const setLineaCredito = async (valor) => {
    setLineaCreditoState(valor)
    await supabase
      .from('lineas_credito')
      .update({ limite: valor })
      .eq('id', lineaCreditoId)
  }

  const periodos = [...new Set(gastos.flatMap(g => {
    const inicio = obtenerPeriodo(g.periodo || g.mes, g.fecha)
    if (!inicio) return []
    return Array.from({ length: Math.max(1, Number(g.cuotas) || 0) }, (_, indice) => desplazarPeriodo(inicio, indice))
  }).filter(Boolean))].sort()

  const gastosPorMes = (periodo) => gastos.filter(g => obtenerPeriodo(g.periodo || g.mes, g.fecha) === periodo)

  const abonosDelMes = (periodo) => gastos
    .filter(g => obtenerPeriodo(g.periodo || g.mes, g.fecha) === periodo && g.es_abono)
    .reduce((sum, g) => sum + Number(g.monto), 0)

  const totalPagarMes = (periodo) => {
    const indiceObjetivo = indicePeriodo(periodo)
    let total = 0
    gastos.forEach(g => {
      if (g.es_abono) return
      const inicio = obtenerPeriodo(g.periodo || g.mes, g.fecha)
      const diff = indiceObjetivo - indicePeriodo(inicio)
      if (diff >= 0) total += cuotaParaMes(g, diff)
    })
    return parseFloat((total - abonosDelMes(periodo)).toFixed(2))
  }

  const resumenTipoGastoMes = (periodo) => {
    const indiceObjetivo = indicePeriodo(periodo)
    let contado = 0
    let cuotas = 0
    let seguros = 0
    gastos.forEach(g => {
      if (g.es_abono) return
      const inicio = obtenerPeriodo(g.periodo || g.mes, g.fecha)
      const diff = indiceObjetivo - indicePeriodo(inicio)
      if (diff < 0) return
      const monto = cuotaParaMes(g, diff)
      const esDesgravamen = `${g.categoria || ''} ${g.lugar || ''} ${g.descripcion || ''}`.toLowerCase().includes('desgravamen')
      if (esDesgravamen) seguros += monto
      else if (Number(g.cuotas) > 0) cuotas += monto
      else contado += monto
    })
    contado = parseFloat(contado.toFixed(2))
    cuotas = parseFloat(cuotas.toFixed(2))
    seguros = parseFloat(seguros.toFixed(2))
    return { contado, cuotas, seguros, total: parseFloat((contado + cuotas + seguros).toFixed(2)) }
  }

  const resumenCategoriasMes = (periodo) => {
    const indiceObjetivo = indicePeriodo(periodo)
    if (indiceObjetivo < 0) return []

    const totales = new Map()
    gastos.forEach(g => {
      if (g.es_abono) return
      const inicio = obtenerPeriodo(g.periodo || g.mes, g.fecha)
      const diff = indiceObjetivo - indicePeriodo(inicio)
      if (diff < 0) return
      const monto = cuotaParaMes(g, diff)
      if (monto <= 0) return
      const categoria = g.categoria?.trim() || 'Sin categoría'
      totales.set(categoria, (totales.get(categoria) || 0) + monto)
    })

    return [...totales.entries()]
      .map(([categoria, total]) => ({ categoria, total: parseFloat(total.toFixed(2)) }))
      .sort((a, b) => b.total - a.total)
  }

  const cuotasPendientesEnMes = (periodo) => {
    const indiceObjetivo = indicePeriodo(periodo)
    return gastos.filter(g => {
      const diff = indiceObjetivo - indicePeriodo(obtenerPeriodo(g.periodo || g.mes, g.fecha))
      return diff > 0 && diff < Number(g.cuotas)
    }).map(g => {
      const diff = indiceObjetivo - indicePeriodo(obtenerPeriodo(g.periodo || g.mes, g.fecha))
      const calc = calcularCuotas(g.monto, g.cuotas, g.cuota_mensual)
      return { ...g, cuotaActual: diff + 1, cuotaMensual: calc.cuotaMensual }
    })
  }

  const periodosConDeuda = () => {
    const set = new Set()
    gastos.forEach(g => {
      const inicio = obtenerPeriodo(g.periodo || g.mes, g.fecha)
      if (!inicio) return
      for (let i = 0; i < Math.max(1, Number(g.cuotas) || 0); i++) {
        set.add(desplazarPeriodo(inicio, i))
      }
    })
    return [...set].filter(periodo => !cierres[periodo]?.pagado)
  }

  const deudaBruta = parseFloat(
    periodosConDeuda().reduce((sum, periodo) => sum + totalPagarMes(periodo), 0).toFixed(2)
  )

  const deudaPendiente = deudaBruta

  const disponible = parseFloat((lineaCredito - deudaPendiente).toFixed(2))

  const alertas = Object.entries(cierres)
    .filter(([, c]) => !c.pagado)
    .map(([periodo, c]) => ({ periodo, mes: mesDePeriodo(periodo), ...c }))

  return {
    gastos, cierres, periodos, cargando,
    lineaCredito, setLineaCredito, diaCierre, diaPago,
    disponible, deudaPendiente,
    gastosPorMes, abonosDelMes, totalPagarMes, resumenTipoGastoMes, resumenCategoriasMes, cuotasPendientesEnMes,
    alertas, agregarGasto, editarGasto, eliminarGasto,
    marcarPagado, actualizarCierre, resetearTodo,
  }
}