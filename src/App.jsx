import { useState } from 'react'
import { useGastos, calcularCuotas } from './useGastos'
import { useAuth } from './useAuth'
import { exportarExcel } from './exportar'
import ModalGasto from './ModalGasto'
import { CalendarClock, ChevronDown, ChevronRight, Clock, Download, Eye, Goal, LogOut, Pencil, Plus, RotateCcw, Trash, TriangleAlert, ArrowLeft, X } from 'lucide-react'

import { AnimatePresence, motion } from 'framer-motion'

import { toast } from 'react-toastify'

const fmt = n => `S/.${parseFloat(n).toFixed(2)}`
const fmtFecha = f => { const [a, m, d] = f.split('-'); return `${d}/${m}/${a}` }
const MotionDiv = motion.div
const MESES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE']

function calcularDiasRestantes(cierres) {
  const hoy = new Date()
  const dia = hoy.getDate()
  const mes = hoy.getMonth()
  const year = hoy.getFullYear()

  const fechaHoy = new Date(year, mes, dia)
  const cierreCalendario = dia < 25 ? new Date(year, mes, 25) : new Date(year, mes + 1, 25)
  let pagoCalendario
  if (dia < 12) {
    pagoCalendario = new Date(year, mes, 12)
  } else if (dia < 25) {
    pagoCalendario = new Date(year, mes + 1, 12)
  } else {
    pagoCalendario = new Date(year, mes + 2, 12)
  }

  const pendientes = Object.values(cierres).filter(c => !c.pagado)
  const proximaFecha = (campo, respaldo) => {
    const fecha = pendientes
      .map(c => c[campo])
      .filter(f => f && new Date(`${f}T00:00:00`) >= fechaHoy)
      .sort()[0]
    return fecha ? new Date(`${fecha}T00:00:00`) : respaldo
  }
  const fechaCierre = proximaFecha('cierre', cierreCalendario)
  const fechaPago = proximaFecha('pago', pagoCalendario)

  return {
    cierre: Math.ceil((fechaCierre - hoy) / (1000 * 60 * 60 * 24)),
    pago: Math.ceil((fechaPago - hoy) / (1000 * 60 * 60 * 24)),
    fechaCierre: fechaCierre.toLocaleDateString('es-PE'),
    fechaPago: fechaPago.toLocaleDateString('es-PE'),
  }
}

// ── Modal Confirmar ───────────────────────────────────────────────────────────
function ModalConfirmar({ titulo, mensaje, labelConfirmar = 'Confirmar', onConfirmar, onCerrar }) {
  return (
    <div onClick={e => e.target === e.currentTarget && onCerrar()}
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-sm">
        <p className="font-semibold text-base text-gray-800 mb-1">{titulo}</p>
        <p className="text-sm text-gray-600 leading-relaxed mb-5">{mensaje}</p>
        <div className="flex gap-3">
          <button onClick={onCerrar}
            className="flex-1 py-2.5 bg-transparent border border-gray-300 rounded-xl text-gray-600 cursor-pointer text-sm font-sans">
            Cancelar
          </button>
          <button onClick={() => { onConfirmar(); onCerrar() }}
            className="flex-1 py-2.5 bg-danger border-0 rounded-xl text-white cursor-pointer text-sm font-semibold font-sans">
            {labelConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ pagado }) {
  return pagado
    ? <span className="px-2.5 py-0.5 rounded-full text-[11px]  bg-success text-white whitespace-nowrap">PAGADO</span>
    : <span className="px-2.5 py-0.5 rounded-full text-[11px]  bg-warning text-white whitespace-nowrap">PENDIENTE</span>
}

// ── Barra de crédito ──────────────────────────────────────────────────────────
function BarraCredito({ lineaCredito, deudaPendiente, disponible, onEditar }) {
  const pct = Math.min(100, (deudaPendiente / lineaCredito) * 100)
  const barColor = pct > 85 ? 'bg-danger' : pct > 60 ? 'bg-warning' : 'bg-success'
  const textColor = pct > 85 ? 'text-danger' : pct > 60 ? 'text-warning' : 'text-success'
  return (
    <div className="bg-white border border-gray-400 rounded-2xl p-5 mb-5">
      <div className="flex justify-between flex-wrap gap-2 mb-4">
        <div>
          <p className="text-[11px] text-muted uppercase tracking-wider mb-0.5">Línea de crédito</p>
          <span className=" text-gray-800 text-2xl font-medium">{fmt(lineaCredito)}</span>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-muted uppercase tracking-wider mb-0.5">Disponible</p>
          <span className={` text-2xl font-medium ${disponible < 0 ? 'text-danger' : 'text-success'}`}>{fmt(disponible)}</span>
        </div>
      </div>
      <div className="bg-gray-300 rounded-full h-2.5 overflow-hidden mb-2.5">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between flex-wrap gap-1 text-xs text-muted">
        <span>Deuda: <strong className={textColor}>{fmt(deudaPendiente)}</strong></span>
        <span className={textColor}>{pct.toFixed(1)}% usado</span>
      </div>
      <button onClick={onEditar}
        className="flex items-center gap-1.5 mt-3.5 bg-transparent border border-border rounded-lg px-3.5 py-1.5 text-muted cursor-pointer text-xs font-sans hover:opacity-90 transition-colors">
        <Pencil size={14} /> Editar línea de crédito
      </button>
    </div>
  )
}

// ── Modal línea de crédito ────────────────────────────────────────────────────
function ModalLineaCredito({ valor, onGuardar, onCerrar }) {
  const [val, setVal] = useState(valor)
  return (
    <div onClick={e => e.target === e.currentTarget && onCerrar()}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-white border border-gray-400 rounded-2xl p-6 w-full max-w-xs">
        <p className=" text-xs text-accent tracking-[2px] mb-4">LÍNEA DE CRÉDITO</p>
        <input type="number" min="0" step="50" value={val} onChange={e => setVal(e.target.value)}
          className="w-full px-3.5 py-3 bg-white border border-gray-300 rounded-xl text-gray-600 text-lg  outline-none mb-4 focus:border-accent transition-colors" />
        <div className="flex gap-3">
          <button onClick={onCerrar}
            className="flex-1 py-2.5 bg-transparent border border-gray-300 rounded-xl text-gray-600 cursor-pointer font-sans">Cancelar</button>
          <button onClick={() => { onGuardar(parseFloat(val)); onCerrar(); toast.success('Línea de crédito actualizada') }}
            className="flex-1 py-2.5 bg-accent border-0 rounded-xl text-white cursor-pointer font-semibold font-sans">Guardar</button>
        </div>
      </div>
    </div>
  )
}

function ModalDetalleGasto({ gasto, onCerrar }) {
  return (
    <div onClick={e => e.target === e.currentTarget && onCerrar()}
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-3xl">
        <div className="flex justify-between items-start gap-4 mb-4">
          <div>
            <p className="text-[11px] text-muted uppercase tracking-wider mb-1">Detalle del gasto</p>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar detalle" className="text-muted bg-transparent border-0 cursor-pointer">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-sm">
            <thead>
              <tr className="border-y border-border">
                {['Lugar', 'Fecha', 'Monto', 'Descripción'].map(titulo => (
                  <th key={titulo} scope="col" className="px-3 py-2.5 text-left text-[11px] font-medium text-muted uppercase tracking-wider">{titulo}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-3 text-gray-600 align-top">{gasto.lugar}</td>
                <td className="px-3 py-3 text-gray-600 whitespace-nowrap align-top">{fmtFecha(gasto.fecha)}</td>
                <td className="px-3 py-3 font-semibold text-accent whitespace-nowrap align-top">{fmt(gasto.monto)}</td>
                <td className="px-3 py-3 text-gray-600 whitespace-pre-wrap break-words align-top">{gasto.descripcion?.trim() || 'Sin descripción'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ModalCronogramaGasto({ gasto, onCerrar }) {
  const cantidadCuotas = Number(gasto.cuotas) || 0
  const calculo = calcularCuotas(gasto.monto, cantidadCuotas, gasto.cuota_mensual)
  const fechaCompra = new Date(`${gasto.fecha}T00:00:00`)
  const indiceMesInicio = MESES.indexOf(gasto.mes)
  const mesInicio = indiceMesInicio >= 0 ? indiceMesInicio : fechaCompra.getMonth()
  const anioInicio = fechaCompra.getFullYear() + (mesInicio < fechaCompra.getMonth() ? 1 : 0)
  const cronograma = Array.from({ length: cantidadCuotas }, (_, indice) => {
    const indiceMes = mesInicio + indice
    const mes = indiceMes % 12
    const anio = anioInicio + Math.floor(indiceMes / 12)
    const fechaPago = new Date(anio, mes + 1, 12)
    const monto = calculo.cuotaMensual > 0
      ? Math.max(0, calculo.cuotaMensual - (indice === 0 ? Number(gasto.cashback) || 0 : 0))
      : null
    return { numero: indice + 1, periodo: `${MESES[mes]} ${anio}`, fechaPago, monto }
  })

  return (
    <div onClick={e => e.target === e.currentTarget && onCerrar()}
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-2xl">
        <div className="flex justify-between items-start gap-4 mb-4">
          <div>
            <p className="text-[11px] text-muted uppercase tracking-wider mb-1">Cronograma de cuotas</p>
            <h2 className="m-0 text-lg font-semibold text-gray-800">{gasto.lugar}</h2>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar cronograma" className="text-muted bg-transparent border-0 cursor-pointer">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-y border-border">
                {['Cuota', 'Periodo', 'Fecha de pago', 'Monto'].map(titulo => (
                  <th key={titulo} scope="col" className="px-3 py-2.5 text-left text-[11px] font-medium text-muted uppercase tracking-wider">{titulo}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cronograma.map(cuota => (
                <tr key={cuota.numero} className="border-b border-border">
                  <td className="px-3 py-2.5 text-gray-600">{cuota.numero}/{cantidadCuotas}</td>
                  <td className="px-3 py-2.5 text-gray-600">{cuota.periodo}</td>
                  <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{cuota.fechaPago.toLocaleDateString('es-PE')}</td>
                  <td className="px-3 py-2.5 font-medium text-accent whitespace-nowrap">{cuota.monto === null ? 'Por definir' : fmt(cuota.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Tarjeta de mes ────────────────────────────────────────────────────────────
function TarjetaMes({ mes, gastos, cierre, totalPagarMes, resumenCategoriasMes, cuotasPendientesEnMes, onMarcarPagado, onEditar, onEliminar, onAgregar }) {
  const [expandido, setExpandido] = useState(false)
  const [detalle, setDetalle] = useState(null)
  const [cronograma, setCronograma] = useState(null)
  const total = totalPagarMes(mes)
  const resumenCategorias = resumenCategoriasMes(mes)
  const mayorCategoria = Math.max(...resumenCategorias.map(item => item.total), 0)
  const esPagado = cierre?.pagado
  const cuotasExternas = cuotasPendientesEnMes(mes)

  return (
    <div className="bg-white border border-gray-400 rounded-2xl overflow-hidden mb-4">

      {/* Header */}
      <div onClick={() => setExpandido(p => !p)}
        className={`flex items-center justify-between flex-wrap gap-2 px-4 py-3.5 cursor-pointer ${expandido ? 'border-b border-border' : ''}`}>
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className=" text-[13px] text-accent tracking-[2px]">{mes}</span>
          <Badge pagado={esPagado} />
          {cierre?.pago && <span className="text-xs text-muted">Pago: <span className="text-gray-600">{fmtFecha(cierre.pago)}</span></span>}
        </div>
        <div className="flex items-center gap-2.5">
          <span className={` text-[15px] ${esPagado ? 'text-success' : 'text-accent'}`}>{fmt(total)}</span>
          <span className="text-muted text-sm">{expandido ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expandido && (
          <MotionDiv
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            {/* Cuotas arrastradas */}
            {cuotasExternas.length > 0 && (
              <div className="bg-white border-b border-gray-400 px-4 py-2.5">
                <p className="text-[11px] text-muted uppercase tracking-wider mb-2">Cuotas de meses anteriores</p>
                {cuotasExternas.map(g => (
                  <div key={g.id} className="flex justify-between items-center text-sm py-1 text-muted flex-wrap gap-1">
                    <span className="flex items-center gap-1.5 flex-wrap">
                      {g.lugar}
                      <span className="text-[11px] bg-accent text-white px-1.5 py-0.5 rounded">cuota {g.cuotaActual}/{g.cuotas}</span>
                    </span>
                    <span className="text-gray-500">{fmt(g.cuotaMensual)}</span>
                  </div>
                ))}
              </div>
            )}

            {resumenCategorias.length > 0 && (
              <div className="px-4 py-3 border-b border-border">
                <div className="mb-2">
                  <h3 className="m-0 text-sm font-semibold text-gray-800">Gastos por categoría</h3>
                  <p className="m-0 mt-0.5 text-xs text-muted">Cuotas correspondientes a este mes; no incluye abonos.</p>
                </div>
                <div className="flex flex-col gap-2">
                  {resumenCategorias.map(item => (
                    <div key={item.categoria} className="grid grid-cols-[minmax(6rem,1fr)_minmax(4rem,2fr)_auto] items-center gap-3 text-xs">
                      <span className="truncate text-gray-600">{item.categoria}</span>
                      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${mayorCategoria ? item.total / mayorCategoria * 100 : 0}%` }} />
                      </div>
                      <span className="font-medium text-gray-700 whitespace-nowrap">{fmt(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabla */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]" style={{ minWidth: 560 }}>
                <thead>
                  <tr className="bg-white">
                    {['LUGAR', 'CATEGORÍA', 'FECHA', 'MONTO', 'CUOTAS', 'CUOTA/MES', 'INTERÉS', 'CASHBACK', 'TOTAL', ''].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-muted font-medium text-[11px] tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gastos.map(g => {
                    const calc = calcularCuotas(g.monto, g.cuotas, g.cuota_mensual)
                    if (g.es_abono) {
                      return (
                        <tr key={g.id} className="border-t border-border hover:bg-gray-100 transition-colors">
                          <td className="px-3 py-2.5 font-medium text-gray-600 max-w-40 overflow-hidden text-ellipsis whitespace-nowrap">
                            <span className="flex items-center gap-1.5">{g.lugar}</span>
                          </td>
                          <td className="px-3 py-2.5 text-muted">—</td>
                          <td className="px-3 py-2.5 text-muted text-xs whitespace-nowrap">{fmtFecha(g.fecha)}</td>
                          <td className="px-3 py-2.5 text-success font-semibold whitespace-nowrap">-{fmt(g.monto)}</td>
                          <td className="px-3 py-2.5 text-center"><span className="bg-success text-white px-2 py-0.5 rounded text-xs">ABONO</span></td>
                          <td className="px-3 py-2.5 text-muted">—</td>
                          <td className="px-3 py-2.5 text-muted">—</td>
                          <td className="px-3 py-2.5 text-muted">—</td>
                          <td className="px-3 py-2.5 font-semibold text-success whitespace-nowrap">-{fmt(g.monto)}</td>
                          <td className="px-2 py-2.5">
                            <div className="flex gap-1.5">
                              <button onClick={() => setDetalle(g)} aria-label={`Ver detalle de ${g.lugar}`} title="Ver detalle" className="px-2.5 py-1 text-muted cursor-pointer text-xs">
                                <Eye size={14} />
                              </button>
                              {!esPagado && <>
                                <button onClick={() => onEditar(g)} className="px-2.5 py-1 text-muted cursor-pointer text-xs">
                                  <Pencil size={14} />
                                </button>
                                <button onClick={() => onEliminar(g)} className="px-2.5 py-1 text-danger cursor-pointer text-xs">
                                  <Trash size={14} />
                                </button>
                              </>}
                            </div>
                          </td>
                        </tr>
                      )
                    }
                    return (
                      <tr key={g.id} className="border-t border-border hover:bg-gray-100 transition-colors">
                        <td className="px-3 py-2.5 font-medium text-gray-600 max-w-40 overflow-hidden text-ellipsis whitespace-nowrap">{g.lugar}</td>
                        <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{g.categoria || 'Sin categoría'}</td>
                        <td className="px-3 py-2.5 text-muted text-xs whitespace-nowrap">{fmtFecha(g.fecha)}</td>
                        <td className="px-3 py-2.5 text-black whitespace-nowrap">{fmt(g.monto)}</td>
                        <td className="px-3 py-2.5 text-center">
                          {g.cuotas > 0
                            ? <span className="bg-accent text-white px-2 py-0.5 rounded text-xs">{g.cuotas}x</span>
                            : <span className="text-muted">—</span>}
                        </td>
                        <td className={`px-3 py-2.5 whitespace-nowrap ${g.cuotas > 0 ? 'text-gray-500' : 'text-muted'}`}>
                          {g.cuotas > 0 ? fmt(calc.cuotaMensual) : '—'}
                        </td>
                        <td className={`px-3 py-2.5 whitespace-nowrap ${calc.interes > 0 ? 'text-warning' : 'text-muted'}`}>
                          {calc.interes > 0 ? fmt(calc.interes) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-success whitespace-nowrap">
                          {Number(g.cashback) > 0 ? `-${fmt(g.cashback)}` : '—'}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-accent whitespace-nowrap">{fmt(Math.max(0, calc.totalPagar - Number(g.cashback || 0)))}</td>
                        <td className="px-2 py-2.5">
                          <div className="flex gap-1.5">
                            <button onClick={() => setDetalle(g)} aria-label={`Ver detalle de ${g.lugar}`} title="Ver detalle" className="px-2.5 py-1 text-muted cursor-pointer text-xs">
                              <Eye size={14} />
                            </button>
                            {Number(g.cuotas) > 0 && <button onClick={() => setCronograma(g)} aria-label={`Ver cronograma de cuotas de ${g.lugar}`} title="Ver cronograma de cuotas" className="px-2.5 py-1 text-muted cursor-pointer text-xs">
                              <CalendarClock size={14} />
                            </button>}
                            {!esPagado && <>
                              <button onClick={() => onEditar(g)} className="px-2.5 py-1 text-muted cursor-pointer text-xs">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => onEliminar(g)} className="px-2.5 py-1 text-danger cursor-pointer text-xs">
                                <Trash size={14} />
                              </button>
                            </>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center flex-wrap gap-2.5 px-4 py-3 border-t border-border bg-white">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => { if (esPagado) return toast.error(`El mes ${mes} ya fue pagado`); onAgregar(mes) }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm border bg-transparent cursor-pointer font-sans transition-opacity
              ${esPagado ? 'border-border text-muted opacity-50 cursor-not-allowed' : 'border-accent text-accent'}`}>
                  <Plus size={14} /> Agregar
                </button>
                <button
                  onClick={async () => { const { error } = await onMarcarPagado(mes); if (error) return toast.error('No se pudo actualizar'); toast[!esPagado ? 'success' : 'default'](`Mes ${mes} ${!esPagado ? 'pagado' : 'pendiente'}`) }}
                  className={`px-3.5 py-1.5 rounded-lg text-sm border cursor-pointer font-sans transition-colors
              ${esPagado ? 'bg-success text-white' : 'bg-transparent border-border text-muted'}`}>
                  {esPagado ? 'Pagado' : 'Marcar pagado'}
                </button>
              </div>
              <span className="text-sm font-semibold text-accent whitespace-nowrap">Total: {fmt(total)}</span>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>

      {detalle && <ModalDetalleGasto gasto={detalle} onCerrar={() => setDetalle(null)} />}
      {cronograma && <ModalCronogramaGasto gasto={cronograma} onCerrar={() => setCronograma(null)} />}

    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App({ usuario, lineaActiva, onVolver }) {
  const { cerrarSesion } = useAuth()
  const {
    gastos, cierres, meses, cargando,
    lineaCredito, setLineaCredito,
    disponible, deudaPendiente,
    gastosPorMes, totalPagarMes, resumenCategoriasMes, cuotasPendientesEnMes,
    alertas, agregarGasto, editarGasto, eliminarGasto,
    marcarPagado, resetearTodo,
  } = useGastos(usuario.id, lineaActiva.id)

  const [modal, setModal] = useState(null)
  const [modalLinea, setModalLinea] = useState(false)
  const [confirmar, setConfirmar] = useState(null)

  const handleGuardar = async (datos) => {
    const resultado = datos.id
      ? await editarGasto(datos.id, datos)
      : await agregarGasto(datos)

    if (resultado?.error) {
      toast.error(`No se pudo guardar el gasto: ${resultado.error.message}`)
      return false
    }

    toast.success(datos.id ? 'Gasto actualizado' : 'Gasto agregado')
    return true
  }


  const totalGeneral = meses.reduce((sum, mes) => sum + totalPagarMes(mes), 0)
  const dias = calcularDiasRestantes(cierres)

  if (cargando) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600 text-lg tracking-[2px]">CARGANDO DATOS...</p>
      </div>
    )
  }

  const nombreDeEmail = (email) => {
    const nombre = email.split('@')[0].split(/[._-]/)[0]
    return nombre.charAt(0).toUpperCase() + nombre.slice(1)
  }

  return (
    <div className="min-h-screen bg-white p-6">

      {/* Header */}
      <div className=" bg-white px-4">
        <div className="max-w-5xl mx-auto py-3.5 flex justify-between items-center gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-bold text-accent tracking-[3px] m-0">{lineaActiva.nombre}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 hidden sm:block">{usuario.email}</span>

            <button
              onClick={() => exportarExcel(gastos, cierres, calcularCuotas)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-success rounded-xl text-white text-sm font-medium cursor-pointer whitespace-nowrap font-sans hover:opacity-90">
              <Download size={14} /> Excel
            </button>
            <button onClick={() => setModal({ gasto: null, mesDefault: meses[meses.length - 1] || 'ENERO' })}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent rounded-xl text-white text-sm font-semibold cursor-pointer whitespace-nowrap font-sans hover:opacity-90">
              <Plus size={14} /> Nuevo gasto
            </button>
            <button onClick={onVolver}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-transparent border border-border rounded-xl text-muted text-sm cursor-pointer whitespace-nowrap font-sans hover:opacity-90">
              <ArrowLeft size={14} /> Volver
            </button>
            <button onClick={async () => { await cerrarSesion(); toast.success('Sesión cerrada') }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-transparent border border-border rounded-xl text-muted text-sm cursor-pointer whitespace-nowrap font-sans hover:opacity-90">
              <LogOut size={14} /> Salir
            </button>
            <button onClick={() => setConfirmar({ tipo: 'reset' })}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-transparent border border-danger rounded-xl text-danger text-sm cursor-pointer whitespace-nowrap font-sans hover:bg-danger hover:text-white transition-colors">
              <RotateCcw size={14} /> Resetear todo
            </button>
          </div>
        </div>

      </div>

      <div className="max-w-5xl mx-auto mt-4">
        <span className="text-lg md:text-2xl font-regular text-gray-600">
          Hola, <span className='text-accent'>{nombreDeEmail(usuario.email)}</span> ¡bienvenido nuevamente!
        </span>
      </div>

      {/* Contenido */}
      <div className="max-w-5xl mx-auto py-5">

        <BarraCredito lineaCredito={lineaCredito} deudaPendiente={deudaPendiente} disponible={disponible} onEditar={() => setModalLinea(true)} />

        {/* Días restantes */}
        {deudaPendiente > 0 && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3 mb-5">
          <div className="bg-white border border-gray-400 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className={dias.cierre <= 5 ? 'text-danger' : dias.cierre <= 15 ? 'text-warning' : 'text-success'} />
              <span className="text-[11px] text-muted uppercase tracking-wider">Próximo cierre</span>
            </div>
            <span className={`text-2xl font-medium ${dias.cierre <= 5 ? 'text-danger' : dias.cierre <= 15 ? 'text-warning' : 'text-success'}`}>
              {dias.cierre} día{dias.cierre !== 1 ? 's' : ''}
            </span>
            <p className="text-xs text-muted m-0 mt-1">Fecha: {dias.fechaCierre}</p>
          </div>
          <div className="bg-white border border-gray-400 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className={dias.pago <= 5 ? 'text-danger' : dias.pago <= 15 ? 'text-accent' : 'text-success'} />
              <span className="text-[11px] text-muted uppercase tracking-wider">Próximo pago</span>
            </div>
            <span className={`text-2xl font-medium ${dias.pago <= 5 ? 'text-danger' : dias.pago <= 15 ? 'text-accent' : 'text-success'}`}>
              {dias.pago} día{dias.pago !== 1 ? 's' : ''}
            </span>
            <p className="text-xs text-muted m-0 mt-1">Fecha: {dias.fechaPago}</p>
          </div>
        </div>
        )}

        {/* Alertas */}
        {alertas.map(a => (
          <div key={a.mes} className="flex items-center justify-between flex-wrap gap-2.5 bg-warning rounded-xl px-4 py-3 mb-2.5">
            <div className="flex items-center gap-2.5">
              <TriangleAlert size={14} />
              <div>
                <p className="m-0 text-white font-semibold text-sm">Pago pendiente — {a.mes}</p>
                <p className="m-0 mt-0.5 text-white text-xs">Fecha: <strong>{a.pago}</strong> · <strong>{fmt(totalPagarMes(a.mes))}</strong></p>
              </div>
            </div>
            <button onClick={async () => { const { error } = await marcarPagado(a.mes); if (error) return toast.error('No se pudo actualizar'); toast.success(`Mes ${a.mes} marcado como pagado`) }}
              className="bg-success border border-success rounded-lg px-3.5 py-1.5 text-white cursor-pointer text-xs whitespace-nowrap font-sans">
              Marcar pagado
            </button>
          </div>
        ))}
        {alertas.length > 0 && <div className="mb-4" />}

        {/* Métricas */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5 mb-5">
          {[
            { label: 'Total acumulado', val: fmt(totalGeneral), cls: 'text-gray-600' },
            { label: 'Pendiente de pago', val: fmt(deudaPendiente), cls: deudaPendiente > 0 ? 'text-warning' : 'text-success' },
            { label: 'Meses registrados', val: meses.length, cls: 'text-gray-600' },
          ].map(m => (
            <div key={m.label} className="bg-white border border-gray-400 rounded-xl p-4">
              <p className="m-0 mb-1.5 text-[11px] text-gray-600 uppercase tracking-wider">{m.label}</p>
              <p className={`m-0 text-xl font-medium ${m.cls}`}>{m.val}</p>
            </div>
          ))}
        </div>

        {/* Meses */}
        {meses.length === 0 ? (
          <div className="flex flex-col justify-center items-center text-center py-20 text-gray-600">
            <p className="text-4xl mb-3">
              <Goal size={32} />
            </p>
            <p className="mb-4">No hay gastos aún</p>
            <button onClick={() => setModal({ gasto: null, mesDefault: 'ENERO' })}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-accent border-0 rounded-xl text-white text-sm font-semibold cursor-pointer font-sans">
              <Plus size={14} /> Agregar primer gasto
            </button>
          </div>
        ) : meses.map(mes => (
          <TarjetaMes key={mes} mes={mes}
            gastos={gastosPorMes(mes)} cierre={cierres[mes]}
            totalPagarMes={totalPagarMes} resumenCategoriasMes={resumenCategoriasMes} cuotasPendientesEnMes={cuotasPendientesEnMes}
            onMarcarPagado={marcarPagado}
            onEditar={g => setModal({ gasto: g, mesDefault: g.mes })}
            onEliminar={g => setConfirmar(g)}
            onAgregar={mes => setModal({ gasto: null, mesDefault: mes })}
          />
        ))}
      </div>

      {/* Modales */}
      {modal !== null && (
        <ModalGasto gasto={modal.gasto ?? { mes: modal.mesDefault }} mesDefault={modal.mesDefault}
          onGuardar={handleGuardar} onCerrar={() => setModal(null)} calcularCuotas={calcularCuotas} />
      )}
      {modalLinea && (
        <ModalLineaCredito valor={lineaCredito} onGuardar={setLineaCredito} onCerrar={() => setModalLinea(false)} />
      )}
      {confirmar && (
        <ModalConfirmar
          titulo={confirmar.tipo === 'reset' ? `Resetear datos de ${lineaActiva.nombre}` : 'Eliminar gasto'}
          mensaje={confirmar.tipo === 'reset'
            ? `Se eliminarán todos los gastos y cierres de "${lineaActiva.nombre}", y el límite volverá a S/.1200. Esta acción no se puede deshacer.`
            : `¿Seguro que quieres eliminar "${confirmar.lugar}" (${fmt(confirmar.monto)})? Esta acción no se puede deshacer.`}
          labelConfirmar={confirmar.tipo === 'reset' ? 'Sí, resetear todo' : 'Sí, eliminar'}
          onConfirmar={async () => {
            if (confirmar.tipo === 'reset') {
              const { error } = await resetearTodo()
              if (error) toast.error('No se pudieron resetear todos los datos')
              else toast.success('Todos los datos fueron eliminados')
            } else {
              await eliminarGasto(confirmar.id)
              toast.error('Gasto eliminado')
            }
          }}
          onCerrar={() => setConfirmar(null)} />
      )}

      {/* Footer */}
      <div className="max-w-5xl mx-auto py-4 text-center">
        <p className="text-base text-muted">Desarrollado por Alex Linares</p>
      </div>

    </div>
  )
}
