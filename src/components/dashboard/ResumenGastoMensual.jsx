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
// `areas` son las áreas responsables de la vertical del tenant (departamentos
// municipales o áreas del condominio). Por defecto, las municipales: es lo que
// había antes de que existieran las verticales.
export default function ResumenGastoMensual({ incidencias, areas = DEPARTAMENTOS }) {
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
    <div className="mx-4 rounded-2xl bg-white p-5 ring-1 ring-borde sm:mx-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-medium text-tinta-suave">
          Gasto ejecutado — {nombreMes}
        </p>
        <select
          value={departamento}
          onChange={(e) => setDepartamento(e.target.value)}
          className="min-h-[36px] rounded-xl bg-tinta-fuerte/[0.04] px-2.5 py-1.5 text-xs text-tinta ring-1 ring-borde transition-colors hover:bg-tinta-fuerte/[0.07] focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="Todos">Todos los departamentos</option>
          {areas.map((dep) => (
            <option key={dep} value={dep}>{dep}</option>
          ))}
        </select>
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-3">
        <p className="text-3xl font-semibold leading-none tracking-tight text-tinta-fuerte">
          {formatoCLP.format(totalMes)}
        </p>
        <button
          onClick={() => setMostrarDetalle(true)}
          className="text-xs font-medium text-primary hover:underline"
        >
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
