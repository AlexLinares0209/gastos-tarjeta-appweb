import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

const DIAS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do']
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function formatFecha(fechaISO) {
  if (!fechaISO) return ''
  const [a, m, d] = fechaISO.split('-')
  return `${d}/${m}/${a}`
}

function parseFecha(value) {
  if (!value) {
    const hoy = new Date()
    return { anio: hoy.getFullYear(), mes: hoy.getMonth(), dia: null }
  }
  const f = new Date(value + 'T00:00:00')
  return { anio: f.getFullYear(), mes: f.getMonth(), dia: f.getDate() }
}

function getDiasDelMes(anio, mes) {
  return new Date(anio, mes + 1, 0).getDate()
}

function getPrimerDiaDelMes(anio, mes) {
  const dia = new Date(anio, mes, 1).getDay()
  return dia === 0 ? 6 : dia - 1
}

export default function InputFecha({ value, onChange, placeholder = 'DD/MM/AAAA' }) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef(null)
  const pickerRef = useRef(null)
  const [posicion, setPosicion] = useState(null)

  const { anio: anioInit, mes: mesInit } = parseFecha(value)
  const [anio, setAnio] = useState(anioInit)
  const [mes, setMes] = useState(mesInit)

  useEffect(() => {
    function handleClickOutside(e) {
      const dentroDelComponente = ref.current?.contains(e.target)
      const dentroDelPicker = pickerRef.current?.contains(e.target)
      if (!dentroDelComponente && !dentroDelPicker) {
        setAbierto(false)
      }
    }
    if (abierto) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [abierto])

  const calcularPosicion = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      const espacioAbajo = window.innerHeight - rect.bottom
      const pickerAltura = 320
      const abrirArriba = espacioAbajo < pickerAltura
      setPosicion({
        position: 'fixed',
        top: abrirArriba ? rect.top - pickerAltura - 4 : rect.bottom + 4,
        left: rect.left,
        zIndex: 9999,
      })
    }
  }

  const togglePicker = () => {
    if (!abierto) calcularPosicion()
    setAbierto(p => !p)
  }

  const seleccionar = (dia) => {
    const iso = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    onChange(iso)
    setAbierto(false)
  }

  const { dia: diaSeleccionado, mes: mesSeleccionado, anio: anioSeleccionado } = parseFecha(value)
  const diasDelMes = getDiasDelMes(anio, mes)
  const primerDia = getPrimerDiaDelMes(anio, mes)

  const mesesAnteriores = Array.from({ length: primerDia }, (_, i) => {
    const diasMesAnterior = getDiasDelMes(anio, mes === 0 ? 11 : mes - 1)
    return diasMesAnterior - primerDia + i + 1
  })

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={togglePicker}
        className="w-full mt-1.5 px-3.5 py-2.5 bg-white border border-border rounded-lg text-left text-sm outline-none focus:border-accent transition-colors flex items-center justify-between cursor-pointer">
        <span className={value ? 'text-gray-800' : 'text-gray-400'}>
          {value ? formatFecha(value) : placeholder}
        </span>
        <Calendar size={16} className="text-gray-400" />
      </button>

      {abierto && posicion && createPortal(
        <div ref={pickerRef} style={posicion}
          className="bg-white border border-gray-300 rounded-xl shadow-lg p-3 w-[280px]">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => setMes(m => m === 0 ? (setAnio(a => a - 1), 11) : m - 1)}
              className="p-1 rounded-lg hover:bg-gray-100 cursor-pointer text-gray-600">
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold text-gray-800">
              {MESES_CORTOS[mes]} {anio}
            </span>
            <button type="button" onClick={() => setMes(m => m === 11 ? (setAnio(a => a + 1), 0) : m + 1)}
              className="p-1 rounded-lg hover:bg-gray-100 cursor-pointer text-gray-600">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0 mb-1">
            {DIAS.map(d => (
              <div key={d} className="text-center text-[11px] text-gray-400 font-medium py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0">
            {mesesAnteriores.map((d, i) => (
              <div key={`prev-${i}`} className="text-center text-sm py-1.5 text-gray-300">
                {d}
              </div>
            ))}

            {Array.from({ length: diasDelMes }, (_, i) => {
              const dia = i + 1
              const esSeleccionado = dia === diaSeleccionado && mes === mesSeleccionado && anio === anioSeleccionado
              const esHoy = dia === new Date().getDate() && mes === new Date().getMonth() && anio === new Date().getFullYear()
              return (
                <button key={dia} type="button" onClick={() => seleccionar(dia)}
                  className={`text-center text-sm py-1.5 rounded-lg cursor-pointer transition-colors
                    ${esSeleccionado ? 'bg-accent text-white font-semibold' : esHoy ? 'bg-gray-100 text-accent font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}>
                  {dia}
                </button>
              )
            })}

            {Array.from({ length: 42 - (primerDia + diasDelMes) }, (_, i) => (
              <div key={`next-${i}`} className="text-center text-sm py-1.5 text-gray-300">
                {i + 1}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
