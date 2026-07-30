import { MapPin, CheckCircle2, AlertTriangle } from 'lucide-react'
import Boton from '../common/Boton'
import MapaSeleccionUbicacion from './MapaSeleccionUbicacion'

export default function PasoUbicacion({ coordenadas, cargando, error, onObtenerUbicacion, onCambiarCoordenadas, centroPorDefecto }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">1. Ubicación</h2>
        <p className="text-sm text-gray-500">
          Usa tu GPS, o toca directamente el mapa para marcar el lugar exacto.
        </p>
      </div>

      <Boton onClick={onObtenerUbicacion} cargando={cargando} className="w-full">
        <MapPin size={18} />
        {coordenadas ? 'Actualizar con mi GPS' : 'Obtener mi ubicación GPS'}
      </Boton>

      <MapaSeleccionUbicacion
        coordenadas={coordenadas}
        centroPorDefecto={centroPorDefecto}
        onCambiar={onCambiarCoordenadas}
      />

      {coordenadas ? (
        <div className="flex items-start gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-800">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <span>
            Ubicación: {coordenadas.lat.toFixed(5)}, {coordenadas.lng.toFixed(5)}
          </span>
        </div>
      ) : (
        <p className="text-xs text-gray-400">Toca el mapa para fijar la ubicación a mano.</p>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
