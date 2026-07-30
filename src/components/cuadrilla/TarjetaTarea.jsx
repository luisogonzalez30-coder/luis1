import { MapPin } from 'lucide-react'
import BadgeEstado from '../common/BadgeEstado'

export default function TarjetaTarea({ incidencia, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm active:bg-gray-50"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-gray-900">{incidencia.categoria}</span>
        <BadgeEstado estado={incidencia.estado} />
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
        <MapPin size={14} />
        <span className="truncate">{incidencia.direccion_texto || 'Sin dirección de referencia'}</span>
      </div>
    </button>
  )
}
