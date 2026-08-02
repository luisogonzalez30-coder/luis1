import { CATEGORIAS } from '../../utils/categorias'
import { COLOR_POR_GRAVEDAD } from '../../utils/gravedad'
import { tiempoRelativo } from '../../utils/tiempo'
import BadgeEstado from '../common/BadgeEstado'

const ETIQUETA_POR_VALOR = Object.fromEntries(CATEGORIAS.map((c) => [c.valor, c.etiqueta]))

// Lista de los últimos reportes de la municipalidad, debajo del mapa del Paso 1
// — le muestra al ciudadano que el municipio está activo recibiendo y
// resolviendo reportes (confianza), no solo el suyo. "reportes" viene de
// tickets_publicos, que ya se suscribe en tiempo real en FormularioCiudadano
// para el mapa y el chequeo de duplicados — se reusa esa misma suscripción,
// sin ninguna consulta nueva; por eso la lista se actualiza sola.
export default function UltimosReportes({ reportes }) {
  if (!reportes?.length) return null

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-700">Últimos reportes de la comuna</h3>
      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
        {reportes.map((r) => (
          <li key={r.id} className="flex items-center gap-2 px-3 py-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: COLOR_POR_GRAVEDAD[r.nivel_gravedad] || '#9CA3AF' }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-sm text-gray-700">
              {ETIQUETA_POR_VALOR[r.categoria] || r.categoria}
            </span>
            <span className="shrink-0 text-xs text-gray-400">{tiempoRelativo(r.fecha_creacion)}</span>
            <BadgeEstado estado={r.estado} />
          </li>
        ))}
      </ul>
    </div>
  )
}
