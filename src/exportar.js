import * as XLSX from 'xlsx'
import { desplazarPeriodo, etiquetaPeriodo, obtenerPeriodo } from './periodos'

export function exportarExcel(gastos, cierres, calcularCuotas) {
  const wb = XLSX.utils.book_new()
  const totalesPorPeriodo = new Map()
  const agregarAlPeriodo = (periodo, monto) => {
    totalesPorPeriodo.set(periodo, (totalesPorPeriodo.get(periodo) || 0) + monto)
  }

  gastos.forEach(g => {
    const periodoInicio = obtenerPeriodo(g.periodo || g.mes, g.fecha)
    if (!periodoInicio) return
    if (g.es_abono) {
      agregarAlPeriodo(periodoInicio, -Number(g.monto))
      return
    }

    const cantidadCuotas = Number(g.cuotas) || 0
    const cantidadPeriodos = Math.max(1, cantidadCuotas)
    const calc = calcularCuotas(g.monto, cantidadCuotas, g.cuota_mensual)
    for (let indice = 0; indice < cantidadPeriodos; indice++) {
      const periodo = desplazarPeriodo(periodoInicio, indice)
      const monto = cantidadCuotas === 0
        ? Math.max(0, Number(g.monto) - Number(g.cashback || 0))
        : Math.max(0, calc.cuotaMensual - (indice === 0 ? Number(g.cashback || 0) : 0))
      agregarAlPeriodo(periodo, monto)
    }
  })

  const periodosCierre = Object.entries(cierres).map(([periodo, cierre]) =>
    cierre.periodo || cierre.fecha_cierre?.slice(0, 7) || periodo
  )
  const periodos = [...new Set([...totalesPorPeriodo.keys(), ...periodosCierre])].sort()

  // Hoja de resumen
  const resumenData = [
    ['PERIODO', 'TOTAL A PAGAR', 'FECHA CIERRE', 'FECHA PAGO', 'ESTADO'],
  ]

  periodos.forEach(periodo => {
    const cierre = cierres[periodo] || {}
    resumenData.push([
      etiquetaPeriodo(periodo),
      parseFloat((totalesPorPeriodo.get(periodo) || 0).toFixed(2)),
      cierre.cierre || '',
      cierre.pago || '',
      cierre.pagado ? 'PAGADO' : 'PENDIENTE',
    ])
  })

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData)
  wsResumen['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

  // Hoja detalle
  const detalleData = [
    ['PERIODO', 'LUGAR', 'CATEGORÍA', 'FECHA', 'MONTO', 'CUOTAS', 'CUOTA MENSUAL', 'INTERÉS', 'CASHBACK', 'TOTAL A PAGAR'],
  ]

  gastos.forEach(g => {
    const calc = calcularCuotas(g.monto, g.cuotas, g.cuota_mensual)
    detalleData.push([
      etiquetaPeriodo(obtenerPeriodo(g.periodo || g.mes, g.fecha)),
      g.lugar,
      g.categoria || 'Sin categoría',
      g.fecha,
      g.monto,
      g.cuotas,
      calc.cuotaMensual,
      calc.interes,
      g.cashback || 0,
      Math.max(0, calc.totalPagar - Number(g.cashback || 0)),
    ])
  })

  const wsDetalle = XLSX.utils.aoa_to_sheet(detalleData)
  wsDetalle['!cols'] = [
    { wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 10 },
    { wch: 8 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
  ]
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle')

  XLSX.writeFile(wb, `gastos-tarjeta-${new Date().toISOString().slice(0, 10)}.xlsx`)
}
