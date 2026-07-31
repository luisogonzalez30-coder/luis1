import { useMemo, useState } from 'react'
import { DEPARTAMENTOS } from '../../utils/departamento'
import { esDelMesActual } from '../../utils/tiempo'
import ModalDetalleGasto from './ModalDetalleGasto'

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })

// KPI de control financiero para el Alcalde (Órdenes de Trabajo y Costeo, ver
// ESTADO_PROYECTO.md): suma gasto_real.costo_final de todas las incidencias
// Resueltas dentro del mes actual (por fecha_cierre). Se calcula sobre el mismo
// array de incidencias que ya suscribe DashboardGeneralPage — sin queries nuevas,
// mismo patrón que MetricasPorDepartamento. El filtro de departamento (31-jul-2026)
// es propio de esta tarjeta — a propósito independiente del filtro de
// departamento del mapa/lista de abajo, mismo criterio que MetricasPorDepartamento.
export default function ResumenGastoMensual({ incidencias }) {
  const [departamento, setDepartamento] = useState('Todos')
  const [mostrarDetalle, setMostrarDetalle] = useState(false)

  const totalMes = useMemo(
    () =>
      incidencias
        .filter((inc) => inc.estado === 'Resuelto' && esDelMesActual(inc.fecha_cierre))
        .filter((inc) => departamento === 'Todos' || inc.departamento === departamento)
        .reduce((total, inc) => total + (inc.gasto_real?.costo_final || 0), 0),
    [incidencias, departamento]
  )

  const nombreMes = new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })

  return (
    <div className="border-b border-gray-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase text-gray-400">Gasto ejecutado — {nombreMes}</p>
        <select
          value={departamento}
          onChange={(e) => setDepartamento(e.target.value)}
          className="rounded-lg border border-gray-300 px-2 py-1 text-xs"
        >
          <option value="Todos">Todos los departamentos</option>
          {DEPARTAMENTOS.map((dep) => (
            <option key={dep} value={dep}>{dep}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-baseline gap-3">
        <p className="mt-1 text-2xl font-bold text-gray-900">{formatoCLP.format(totalMes)}</p>
        <button onClick={() => setMostrarDetalle(true)} className="text-xs font-medium text-primary hover:underline">
          Ver detalle
        </button>
      </div>

      {mostrarDetalle && (
        <ModalDetalleGasto
          incidencias={incidencias}
          departamento={departamento}
          onCerrar={() => setMostrarDetalle(false)}
        />
      )}
    </div>
  )
}
