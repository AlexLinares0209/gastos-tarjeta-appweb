import { X } from 'lucide-react'
import { useState } from 'react'

import { toast } from 'react-toastify'

const MESES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
  'JULIO','AGOSTO','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE']

const inputCls = "w-full mt-1.5 px-3.5 py-2.5 bg-white border border-border rounded-lg text-gray-800 text-sm outline-none focus:border-accent transition-colors"

export default function ModalGasto({ gasto, onGuardar, onCerrar, calcularCuotas, mesDefault }) {
  const [form, setForm] = useState({
    lugar: '', fecha: '', monto: '', cuotas: '0',
    mes: mesDefault || 'ENERO', ...gasto
  })

  const calc = calcularCuotas(parseFloat(form.monto) || 0, parseInt(form.cuotas) || 0)

  const handleSubmit = () => {
    if (!form.lugar.trim()) return toast.error('Ingresa el nombre del establecimiento')
    if (!form.fecha) return toast.error('Selecciona una fecha')
    if (!form.monto || parseFloat(form.monto) <= 0) return toast.error('Ingresa un monto válido')
    onGuardar({ ...form, monto: parseFloat(form.monto), cuotas: parseInt(form.cuotas) })
    //toast.success(gasto?.id ? 'Gasto actualizado' : 'Gasto agregado')
    onCerrar()
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
          {/* Lugar */}
          <div>
            <label className="text-[11px] text-muted uppercase tracking-wider">Lugar</label>
            <input value={form.lugar}
              onChange={e => setForm(p => ({ ...p, lugar: e.target.value.toUpperCase() }))}
              placeholder="TAMBO, METRO, etc." className={inputCls} />
          </div>

          {/* Fecha + Mes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-muted uppercase tracking-wider">Fecha</label>
              <input type="date" value={form.fecha}
                onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
                className={inputCls} />
            </div>
            <div>
              <label className="text-[11px] text-muted uppercase tracking-wider">Mes facturación</label>
              <select value={form.mes}
                onChange={e => setForm(p => ({ ...p, mes: e.target.value }))}
                className={inputCls}>
                {MESES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Monto + Cuotas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-muted uppercase tracking-wider">Monto (S/.)</label>
              <input type="number" step="0.01" min="0" value={form.monto}
                onChange={e => setForm(p => ({ ...p, monto: e.target.value }))}
                placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className="text-[11px] text-muted uppercase tracking-wider">Cuotas (0 = contado)</label>
              <input type="number" min="0" max="48" value={form.cuotas}
                onChange={e => setForm(p => ({ ...p, cuotas: e.target.value }))}
                className={inputCls} />
            </div>
          </div>

          {/* Preview */}
          {parseFloat(form.monto) > 0 && (
            <div className="bg-white border border-accent rounded-xl px-4 py-3">
              <p className="text-[11px] text-accent uppercase tracking-wider mb-2">Cálculo</p>
              <div className="flex gap-4 text-sm flex-wrap">
                {parseInt(form.cuotas) > 0 && (
                  <span className="text-gray-600">Cuota/mes: <strong>S/.{calc.cuotaMensual.toFixed(2)}</strong></span>
                )}
                <span className="text-gray-600">Interés: <strong className={calc.interes > 0 ? 'text-warning' : 'text-muted'}>S/.{calc.interes.toFixed(2)}</strong></span>
                <span className="text-gray-600">Total: <strong className="text-accent">S/.{calc.totalPagar.toFixed(2)}</strong></span>
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
