import { MapPin, Clock } from 'lucide-react'
import BadgeEstado from '../common/BadgeEstado'
import BadgeGravedad from '../common/BadgeGravedad'

function formatearFecha(timestamp) {
  if (!timestamp?.toDate) return '—'
  return timestamp.toDate().toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
}

export default function TarjetaIncidencia({ incidencia, seleccionada, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border p-3 text-left transition-colors
        ${seleccionada ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-gray-900">{incidencia.categoria}</span>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <BadgeEstado estado={incidencia.estado} />
          <BadgeGravedad nivel={incidencia.nivel_gravedad} />
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
        <MapPin size={14} />
        <span className="truncate">{incidencia.direccion_texto || 'Sin dirección de referencia'}</span>
      </div>

      <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
        <Clock size={12} />
        <span>{formatearFecha(incidencia.fecha_creacion)}</span>
        {incidencia.cuadrilla_asignada && <span>· Cuadrilla: {incidencia.cuadrilla_asignada}</span>}
      </div>

      {incidencia.fotos_antes_urls?.[0] && (
        <div className="relative mt-2">
          <img
            src={incidencia.fotos_antes_urls[0]}
            alt="Foto de la incidencia"
            className="h-24 w-full rounded-lg object-cover"
          />
          {incidencia.fotos_antes_urls.length > 1 && (
            <span className="absolute bottom-1 right-1 rounded-full bg-black/60 px-1.5 py-0.5 text-xs text-white">
              +{incidencia.fotos_antes_urls.length - 1}
            </span>
          )}
        </div>
      )}
    </button>
  )
}
