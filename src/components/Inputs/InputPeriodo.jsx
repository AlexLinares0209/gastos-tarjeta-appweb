import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function formatPeriodo(periodoISO) {
  if (!periodoISO) return ''
  const [a, m] = periodoISO.split('-')
  return `${MESES_LARGOS[parseInt(m) - 1]} ${a}`
}

function parsePeriodo(value) {
  if (!value) return { anio: new Date().getFullYear(), mesIdx: null }
  const [a, m] = value.split('-')
  return { anio: parseInt(a), mesIdx: m ? parseInt(m) - 1 : null }
}

export default function InputPeriodo({ value, onChange, placeholder = 'MM/AAAA', anioMinimo, anioMaximo }) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef(null)
  const pickerRef = useRef(null)
  const [posicion, setPosicion] = useState(null)

  const yearMin = anioMinimo || 2020
  const yearMax = anioMaximo || 2030

  const { anio: anioInit } = parsePeriodo(value)
  const [anioPicker, setAnioPicker] = useState(anioInit)

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
      const pickerAltura = 220
      const abrirArriba = espacioAbajo < pickerAltura
      setPosicion({
        position: 'fixed',
        top: abrirArriba ? rect.top - pickerAltura - 4 : rect.bottom + 4,
        right: window.innerWidth - rect.right,
        zIndex: 9999,
      })
    }
  }

  const togglePicker = () => {
    if (!abierto) calcularPosicion()
    setAbierto(p => !p)
  }

  const seleccionar = (mesIdx) => {
    const iso = `${anioPicker}-${String(mesIdx + 1).padStart(2, '0')}`
    onChange(iso)
    setAbierto(false)
  }

  const { anio: anioActual, mesIdx: mesActual } = parsePeriodo(value)

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={togglePicker}
        className="w-full mt-1.5 px-3.5 py-2.5 bg-white border border-border rounded-lg text-left text-sm outline-none focus:border-accent transition-colors flex items-center justify-between cursor-pointer">
        <span className={value ? 'text-gray-800' : 'text-gray-400'}>
          {value ? formatPeriodo(value) : placeholder}
        </span>
        <CalendarDays size={16} className="text-gray-400" />
      </button>

      {abierto && posicion && createPortal(
        <div ref={pickerRef} style={posicion}
          className="bg-white border border-gray-300 rounded-xl shadow-lg p-3 w-[260px]">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => setAnioPicker(a => Math.max(yearMin, a - 1))}
              disabled={anioPicker <= yearMin}
              className="p-1 rounded-lg hover:bg-gray-100 cursor-pointer text-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed">
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold text-gray-800">{anioPicker}</span>
            <button type="button" onClick={() => setAnioPicker(a => Math.min(yearMax, a + 1))}
              disabled={anioPicker >= yearMax}
              className="p-1 rounded-lg hover:bg-gray-100 cursor-pointer text-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {MESES_CORTOS.map((nombre, idx) => {
              const esSeleccionado = anioPicker === anioActual && idx === mesActual
              return (
                <button key={idx} type="button" onClick={() => seleccionar(idx)}
                  className={`text-center text-sm py-2 rounded-lg cursor-pointer transition-colors
                    ${esSeleccionado ? 'bg-accent text-white font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}>
                  {nombre}
                </button>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
