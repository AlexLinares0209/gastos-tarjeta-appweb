import { X } from 'lucide-react'
import { useState } from 'react'

import { toast } from 'react-toastify'
import { mesDePeriodo, obtenerPeriodo, periodoDesdeFecha } from './periodos'

const CATEGORIAS = ['Comida','Transporte','Hogar','Salud','Entretenimiento','Servicios','Educación','Ropa','S. desgravamen','Otros']

const inputCls = "w-full mt-1.5 px-3.5 py-2.5 bg-white border border-border rounded-lg text-gray-800 text-sm outline-none focus:border-accent transition-colors"

export default function ModalGasto({ gasto, onGuardar, onCerrar, calcularCuotas, periodoDefault, diaCierre = 25 }) {
  const hoy = new Date()
  const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
  const periodoInicial = periodoDefault || gasto?.periodo || obtenerPeriodo(gasto?.mes, gasto?.fecha) || periodoDesdeFecha(hoyISO, diaCierre)
  const mesInicial = gasto?.mes || mesDePeriodo(periodoInicial)
  const [form, setForm] = useState({
    lugar: '', descripcion: '', categoria: 'Otros', fecha: '', monto: '', cuotas: '0', cuota_mensual: '', cashback: '',
    es_abono: false,
    ...gasto,
    mes: mesInicial,
    periodo: periodoInicial,
  })

  const esAbono = form.es_abono
  const cuotas = parseInt(form.cuotas) || 0
  const cuotaMensual = parseFloat(form.cuota_mensual) || 0
  const cashback = parseFloat(form.cashback) || 0
  const calc = calcularCuotas(parseFloat(form.monto) || 0, cuotas, cuotaMensual)

  const handleSubmit = async () => {
    if (!form.lugar.trim()) return toast.error('Ingresa el nombre del establecimiento')
    if (!form.fecha) return toast.error('Selecciona una fecha')
    if (!form.monto || parseFloat(form.monto) <= 0) return toast.error('Ingresa un monto válido')
    if (!esAbono) {
      if (cuotas > 0 && cuotaMensual < 0) return toast.error('Ingresa una cuota válida')
    }
    const guardado = await onGuardar({ ...form, mes: mesDePeriodo(form.periodo), periodo: form.periodo, categoria: esAbono ? null : form.categoria || 'Otros', monto: parseFloat(form.monto), cuotas, cuota_mensual: cuotaMensual || null, cashback, es_abono: esAbono })
    if (guardado !== false) onCerrar()
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onCerrar()}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-white border border-gray-200 rounded-2xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto">

        <div className="flex justify-between items-center mb-5">
          <span className="font-mono text-lg text-accent tracking-[2px]">
            {gasto?.id ? 'EDITAR GASTO' : 'NUEVO GASTO'}
          </span>
          <button onClick={onCerrar} className="text-muted bg-transparent border-0 text-2xl leading-none cursor-pointer">
            <X />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Es abono */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={esAbono}
              onChange={e => setForm(p => ({ ...p, es_abono: e.target.checked }))}
              className="w-4 h-4 accent-accent cursor-pointer" />
            <span className="text-sm text-gray-600">Es un abono (reduce la deuda del mes)</span>
          </label>

          {/* Lugar */}
          <div>
            <label className="text-[11px] text-muted uppercase tracking-wider">Lugar</label>
            <input value={form.lugar}
              onChange={e => setForm(p => ({ ...p, lugar: e.target.value.toUpperCase() }))}
              placeholder={esAbono ? 'Banco, efectivo, etc.' : 'TAMBO, METRO, etc.'} className={inputCls} />
          </div>

          <div>
            <label className="text-[11px] text-muted uppercase tracking-wider">Descripción (opcional)</label>
            <textarea value={form.descripcion || ''}
              onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
              rows={3} maxLength={500} placeholder="Agrega detalles del gasto"
              className={`${inputCls} resize-y`} />
          </div>

          {!esAbono && (
            <div>
              <label className="text-[11px] text-muted uppercase tracking-wider">Categoría</label>
              <select value={form.categoria || 'Otros'}
                onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
                className={inputCls}>
                {CATEGORIAS.map(categoria => <option key={categoria} value={categoria}>{categoria}</option>)}
              </select>
            </div>
          )}

          {/* Fecha + periodo */}
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-muted uppercase tracking-wider">Fecha</label>
              <input type="date" value={form.fecha}
                onChange={e => {
                  const fecha = e.target.value
                  const periodoAuto = periodoDesdeFecha(fecha, diaCierre)
                  setForm(p => ({ ...p, fecha, mes: mesDePeriodo(periodoAuto) || p.mes, periodo: periodoAuto || p.periodo }))
                }}
                className={inputCls} />
            </div>
            <div>
              <label className="text-[11px] text-muted uppercase tracking-wider">Periodo de facturación</label>
              <input type="month" value={form.periodo || ''}
                onChange={e => setForm(p => ({ ...p, periodo: e.target.value, mes: mesDePeriodo(e.target.value) || p.mes }))}
                className={inputCls} />
            </div>
          </div>

          {!esAbono && (
            <>
              {cuotas > 0 && (
                <div>
                  <label className="text-[11px] text-muted uppercase tracking-wider">Valor de cada cuota</label>
                  <input type="number" step="0.01" min="0" value={form.cuota_mensual}
                    onChange={e => setForm(p => ({ ...p, cuota_mensual: e.target.value }))}
                    placeholder="0.00" className={inputCls} />
                  <p className="mt-1 text-xs text-muted">Ingresa el valor de cada cuota para calcular el interés.</p>
                </div>
              )}
            </>
          )}

          {/* Monto + Cuotas */}
          <div className={esAbono ? '' : 'grid grid-cols-2 gap-3'}>
            <div>
              <label className="text-[11px] text-muted uppercase tracking-wider">Monto (S/.)</label>
              <input type="number" step="0.01" min="0" value={form.monto}
                onChange={e => setForm(p => ({ ...p, monto: e.target.value }))}
                placeholder="0.00" className={inputCls} />
            </div>
            {!esAbono && (
              <div>
                <label className="text-[11px] text-muted uppercase tracking-wider">Cuotas (0 = contado)</label>
                <input type="number" min="0" max="48" value={form.cuotas}
                  onChange={e => setForm(p => ({ ...p, cuotas: e.target.value }))}
                  className={inputCls} />
              </div>
            )}
          </div>

          {/* Preview */}
          {parseFloat(form.monto) > 0 && (
            <div className="bg-white border border-accent rounded-xl px-4 py-3">
              <p className="text-[11px] text-accent uppercase tracking-wider mb-2">Cálculo</p>
              <div className="flex gap-4 text-sm flex-wrap">
                {esAbono ? (
                  <span className="text-gray-600">Abono: <strong className="text-success">-S/.{parseFloat(form.monto).toFixed(2)}</strong></span>
                ) : (
                  <>
                    {parseInt(form.cuotas) > 0 && (
                      <span className="text-gray-600">Cuota/mes: <strong>S/.{calc.cuotaMensual.toFixed(2)}</strong></span>
                    )}
                    <span className="text-gray-600">Interés: <strong className={calc.interes > 0 ? 'text-warning' : 'text-muted'}>S/.{calc.interes.toFixed(2)}</strong></span>
                    {cashback > 0 && <span className="text-gray-600">Cashback: <strong className="text-success">-S/.{cashback.toFixed(2)}</strong></span>}
                    <span className="text-gray-600">Total: <strong className="text-accent">S/.{Math.max(0, calc.totalPagar - cashback).toFixed(2)}</strong></span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 mt-1">
            <button onClick={onCerrar}
              className="flex-1 py-3 bg-transparent border border-border rounded-xl text-muted cursor-pointer text-sm font-sans">
              Cancelar
            </button>
            <button onClick={handleSubmit}
              className="flex-1 py-3 bg-accent border-0 rounded-xl text-white cursor-pointer text-sm font-semibold font-sans hover:opacity-90 transition-opacity">
              {gasto?.id ? 'Guardar' : 'Agregar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
