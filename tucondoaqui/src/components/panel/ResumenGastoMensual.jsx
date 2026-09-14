import { useMemo, useState } from 'react'
import { AREAS } from '../../utils/areas'
import { esDelMesActual } from '../../utils/tiempo'
import ModalDetalleGasto from './ModalDetalleGasto'

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })

// KPI de control financiero para el Administrador (Órdenes de Trabajo y Costeo, ver
// docs/ARQUITECTURA.md): suma gasto_real.costo_final de todas las solicitudes
// Resueltas dentro del mes actual (por fecha_cierre). Se calcula sobre el mismo
// array de solicitudes que ya suscribe PanelAdministracionPage — sin queries nuevas,
// mismo patrón que MetricasPorArea. El filtro de area (31-jul-2026)
// es propio de esta tarjeta — a propósito independiente del filtro de
// area del mapa/lista de abajo, mismo criterio que MetricasPorArea.
export default function ResumenGastoMensual({ solicitudes }) {
  const [area, setArea] = useState('Todos')
  const [mostrarDetalle, setMostrarDetalle] = useState(false)

  const totalMes = useMemo(
    () =>
      solicitudes
        .filter((inc) => inc.estado === 'Resuelto' && esDelMesActual(inc.fecha_cierre))
        .filter((inc) => area === 'Todos' || inc.area === area)
        .reduce((total, inc) => total + (inc.gasto_real?.costo_final || 0), 0),
    [solicitudes, area]
 )

  const nombreMes = new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })

  return (
    <div className="mx-4 rounded-2xl bg-white p-5 ring-1 ring-borde sm:mx-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-medium text-tinta-suave">
          Gasto ejecutado — {nombreMes}
        </p>
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="min-h-[36px] rounded-xl bg-tinta-fuerte/[0.04] px-2.5 py-1.5 text-xs text-tinta ring-1 ring-borde transition-colors hover:bg-tinta-fuerte/[0.07] focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="Todos">Todos las áreas</option>
          {AREAS.map((dep) => (
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
          solicitudes={solicitudes}
          area={area}
          onCerrar={() => setMostrarDetalle(false)}
        />
     )}
    </div>
 )
}
