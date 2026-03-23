import * as XLSX from 'xlsx'

export function exportarExcel(gastos, cierres, calcularCuotas) {
  const wb = XLSX.utils.book_new()

  const meses = [...new Set(gastos.map(g => g.mes))]

  // Hoja de resumen
  const resumenData = [
    ['MES', 'TOTAL GASTOS', 'FECHA CIERRE', 'FECHA PAGO', 'ESTADO'],
  ]

  meses.forEach(mes => {
    const total = gastos
      .filter(g => g.mes === mes)
      .reduce((sum, g) => sum + calcularCuotas(g.monto, g.cuotas).totalPagar, 0)
    const cierre = cierres[mes] || {}
    resumenData.push([
      mes,
      parseFloat(total.toFixed(2)),
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
    ['MES', 'LUGAR', 'FECHA', 'MONTO', 'CUOTAS', 'CUOTA MENSUAL', 'INTERÉS', 'TOTAL A PAGAR'],
  ]

  gastos.forEach(g => {
    const calc = calcularCuotas(g.monto, g.cuotas)
    detalleData.push([
      g.mes,
      g.lugar,
      g.fecha,
      g.monto,
      g.cuotas,
      calc.cuotaMensual,
      calc.interes,
      calc.totalPagar,
    ])
  })

  const wsDetalle = XLSX.utils.aoa_to_sheet(detalleData)
  wsDetalle['!cols'] = [
    { wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 10 },
    { wch: 8 }, { wch: 15 }, { wch: 12 }, { wch: 14 },
  ]
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle')

  XLSX.writeFile(wb, `gastos-tarjeta-${new Date().toISOString().slice(0, 10)}.xlsx`)
}
