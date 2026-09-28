export const MESES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
  'JULIO','AGOSTO','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE']

const INDICE_MESES = new Map(MESES.map((mes, indice) => [mes, indice]))

export function periodoValido(periodo) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(periodo || '')
}

export function crearPeriodo(mes, year) {
  const indice = INDICE_MESES.get(String(mes || '').trim().toUpperCase())
  if (indice === undefined || !Number.isInteger(Number(year))) return null
  return `${Number(year)}-${String(indice + 1).padStart(2, '0')}`
}

export function obtenerPeriodo(mes, fecha) {
  if (periodoValido(mes)) return mes
  const indiceMes = INDICE_MESES.get(String(mes || '').trim().toUpperCase())
  if (indiceMes === undefined) return null

  const fechaBase = fecha ? new Date(`${fecha}T00:00:00`) : new Date()
  if (Number.isNaN(fechaBase.getTime())) return null
  const year = fechaBase.getFullYear() + (indiceMes < fechaBase.getMonth() ? 1 : 0)
  return `${year}-${String(indiceMes + 1).padStart(2, '0')}`
}

export function periodoDesdeFecha(fecha, diaCierre = 25) {
  if (!fecha) return null
  const fechaBase = new Date(`${fecha}T00:00:00`)
  if (Number.isNaN(fechaBase.getTime())) return null
  const periodo = `${fechaBase.getFullYear()}-${String(fechaBase.getMonth() + 1).padStart(2, '0')}`
  return fechaBase.getDate() >= Number(diaCierre || 25) ? desplazarPeriodo(periodo, 1) : periodo
}

export function desplazarPeriodo(periodo, desplazamiento) {
  if (!periodoValido(periodo)) return null
  const [year, month] = periodo.split('-').map(Number)
  const fecha = new Date(year, month - 1 + desplazamiento, 1)
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
}

export function fechaDePeriodo(periodo, dia) {
  if (!periodoValido(periodo)) return null
  const [year, month] = periodo.split('-').map(Number)
  const ultimoDia = new Date(year, month, 0).getDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(Math.min(Number(dia) || 1, ultimoDia)).padStart(2, '0')}`
}

export function indicePeriodo(periodo) {
  if (!periodoValido(periodo)) return -1
  const [year, month] = periodo.split('-').map(Number)
  return year * 12 + month - 1
}

export function etiquetaPeriodo(periodo) {
  if (!periodoValido(periodo)) return periodo || ''
  const [year, month] = periodo.split('-').map(Number)
  return `${MESES[month - 1]} ${year}`
}

export function mesDePeriodo(periodo) {
  if (!periodoValido(periodo)) return null
  return MESES[Number(periodo.slice(5, 7)) - 1]
}