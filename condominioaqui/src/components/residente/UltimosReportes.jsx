import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { CATEGORIA_POR_VALOR } from '../../utils/categorias'
import { colorDeGrupo } from '../../utils/coloresGrupo'
import { tiempoRelativo } from '../../utils/tiempo'
import BadgeEstado from '../common/BadgeEstado'
import DetalleReporte from './DetalleReporte'

// Lista de los últimos reportes de la administración, debajo del mapa del Paso 1
// — le muestra al residente que el condominio está activo recibiendo y
// resolviendo reportes (confianza), no solo el suyo. "reportes" viene de
// tickets_publicos, que ya se suscribe en tiempo real en FormularioResidente
// para el mapa y el chequeo de duplicados — se reusa esa misma suscripción,
// sin ninguna consulta nueva; por eso la lista se actualiza sola.
//
// Cada fila abre la ficha completa del reporte (DetalleReporte): dónde fue
// exactamente, a qué hora, en qué va y cuántos residentes se sumaron.
export default function UltimosReportes({ reportes }) {
  const [abierto, setAbierto] = useState(null)

  if (!reportes?.length) return null

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-700">Últimos reportes de la administración</h3>
      <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {reportes.map((r) => {
          const info = CATEGORIA_POR_VALOR[r.categoria]
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setAbierto(r)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: colorDeGrupo(info?.grupo) }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-sm text-gray-700">
                  {info?.etiqueta || r.categoria}
                </span>
                <span className="shrink-0 text-xs text-gray-400">{tiempoRelativo(r.fecha_creacion)}</span>
                <BadgeEstado estado={r.estado} />
                <ChevronRight size={16} className="shrink-0 text-gray-300" />
              </button>
            </li>
         )
        })}
      </ul>

      {abierto && <DetalleReporte ticket={abierto} onCerrar={() => setAbierto(null)} />}
    </div>
 )
}
