import { useState } from 'react'
import { useGastos, calcularCuotas } from './useGastos'
import { useAuth } from './useAuth'
import { exportarExcel } from './exportar'
import ModalGasto from './ModalGasto'
import { ChevronDown, ChevronRight, Download, Goal, LogOut, Pencil, Plus, Trash, TriangleAlert } from 'lucide-react'

import { AnimatePresence, motion } from 'framer-motion'

import { toast } from 'react-toastify'

const fmt = n => `S/.${parseFloat(n).toFixed(2)}`

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

// ── Tarjeta de mes ────────────────────────────────────────────────────────────
function TarjetaMes({ mes, gastos, cierre, totalPagarMes, cuotasPendientesEnMes, onMarcarPagado, onEditar, onEliminar, onAgregar }) {
  const [expandido, setExpandido] = useState(true)
  const total = totalPagarMes(mes)
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
          {cierre?.pago && <span className="text-xs text-muted">Pago: <span className="text-gray-600">{cierre.pago}</span></span>}
        </div>
        <div className="flex items-center gap-2.5">
          <span className={` text-[15px] ${esPagado ? 'text-success' : 'text-accent'}`}>{fmt(total)}</span>
          <span className="text-muted text-sm">{expandido ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expandido && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            {/* Cuotas arrastradas */}
            {cuotasExternas.length > 0 && (
              <div className="bg-white border border-gray-400 px-4 py-2.5">
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

            {/* Tabla */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]" style={{ minWidth: 560 }}>
                <thead>
                  <tr className="bg-white">
                    {['LUGAR', 'FECHA', 'MONTO', 'CUOTAS', 'CUOTA/MES', 'INTERÉS', 'TOTAL', ''].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-muted font-medium text-[11px] tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gastos.map(g => {
                    const calc = calcularCuotas(g.monto, g.cuotas)
                    return (
                      <tr key={g.id} className="border-t border-border hover:bg-gray-100 transition-colors">
                        <td className="px-3 py-2.5 font-medium text-gray-600 max-w-40 overflow-hidden text-ellipsis whitespace-nowrap">{g.lugar}</td>
                        <td className="px-3 py-2.5 text-muted text-xs whitespace-nowrap">{g.fecha}</td>
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
                        <td className="px-3 py-2.5 font-semibold text-accent whitespace-nowrap">{fmt(calc.totalPagar)}</td>
                        <td className="px-2 py-2.5">
                          {!esPagado ? (
                            <div className="flex gap-1.5">
                              <button onClick={() => onEditar(g)} className="px-2.5 py-1 text-muted cursor-pointer text-xs">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => onEliminar(g)} className="px-2.5 py-1 text-danger cursor-pointer text-xs">
                                <Trash size={14} />
                              </button>
                            </div>
                          ) : <span className="text-[11px] text-muted">—</span>}
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
                  onClick={() => { onMarcarPagado(mes); toast[!esPagado ? 'success' : 'default'](`Mes ${mes} ${!esPagado ? 'pagado' : 'pendiente'}`) }}
                  className={`px-3.5 py-1.5 rounded-lg text-sm border cursor-pointer font-sans transition-colors
              ${esPagado ? 'bg-success text-white' : 'bg-transparent border-border text-muted'}`}>
                  {esPagado ? 'Pagado' : 'Marcar pagado'}
                </button>
              </div>
              <span className="text-sm font-semibold text-accent whitespace-nowrap">Total: {fmt(total)}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App({ usuario }) {
  const { cerrarSesion } = useAuth()
  const {
    gastos, cierres, meses, cargando,
    lineaCredito, setLineaCredito,
    disponible, deudaPendiente,
    gastosPorMes, totalPagarMes, cuotasPendientesEnMes,
    alertas, agregarGasto, editarGasto, eliminarGasto, marcarPagado,
  } = useGastos(usuario.id)

  const [modal, setModal] = useState(null)
  const [modalLinea, setModalLinea] = useState(false)
  const [confirmar, setConfirmar] = useState(null)

  const handleGuardar = async (datos) => {
    if (datos.id) { await editarGasto(datos.id, datos); toast.success('Gasto actualizado') }
    else { await agregarGasto(datos); toast.success('Gasto agregado') }
  }

  const totalGeneral = meses.reduce((sum, mes) => sum + totalPagarMes(mes), 0)

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
            <h1 className="text-lg font-bold text-accent tracking-[3px] m-0">CONTROL DE GASTOS</h1>
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
            <button onClick={async () => { await cerrarSesion(); toast.success('Sesión cerrada') }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-transparent border border-border rounded-xl text-muted text-sm cursor-pointer whitespace-nowrap font-sans hover:opacity-90">
              <LogOut size={14} /> Salir
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
            <button onClick={() => { marcarPagado(a.mes); toast.success(`Mes ${a.mes} marcado como pagado`) }}
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
            totalPagarMes={totalPagarMes} cuotasPendientesEnMes={cuotasPendientesEnMes}
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
        <ModalConfirmar titulo="Eliminar gasto"
          mensaje={`¿Seguro que quieres eliminar "${confirmar.lugar}" (${fmt(confirmar.monto)})? Esta acción no se puede deshacer.`}
          labelConfirmar="Sí, eliminar"
          onConfirmar={async () => { await eliminarGasto(confirmar.id); toast.error('Gasto eliminado') }}
          onCerrar={() => setConfirmar(null)} />
      )}

      {/* Footer */}
      <div className="max-w-5xl mx-auto py-4 text-center">
        <p className="text-base text-muted">Desarrollado por Alex Linares</p>
      </div>

    </div>
  )
}
