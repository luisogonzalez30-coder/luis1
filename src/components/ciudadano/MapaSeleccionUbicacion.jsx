import { useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { Satellite, Map as MapIcon } from 'lucide-react'
import { aplicarFixIconosLeaflet } from '../../utils/leafletIconFix'

aplicarFixIconosLeaflet()

// Centro por defecto: Plaza de Armas de Santiago, Chile (se usa solo si la
// municipalidad no tiene centro_mapa configurado).
const CENTRO_DEFECTO = [-33.4372, -70.6506]

// Esri World Imagery: capa satelital gratuita, sin API key ni cuenta — a
// diferencia de Google Satellite/Street View, que requieren facturación y
// además tienen cobertura pobre en zonas rurales de Chile.
const CAPAS = {
  calle: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satelital: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
}

function ManejadorClicksMapa({ onSeleccionar }) {
  useMapEvents({
    click(e) {
      onSeleccionar({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

// Mapa interactivo para que el ciudadano fije su ubicación a mano: tocando en
// cualquier punto, o arrastrando el marcador una vez que ya hay uno puesto.
// Complementa (no reemplaza) el botón de GPS automático.
export default function MapaSeleccionUbicacion({ coordenadas, centroPorDefecto, onCambiar }) {
  const [capa, setCapa] = useState('calle')

  const centroInicial = coordenadas
    ? [coordenadas.lat, coordenadas.lng]
    : centroPorDefecto?.lat && centroPorDefecto?.lng
      ? [centroPorDefecto.lat, centroPorDefecto.lng]
      : CENTRO_DEFECTO

  return (
    <div className="relative h-56 w-full overflow-hidden rounded-xl border border-gray-300">
      {/* La key fuerza un remount SOLO al pasar de "sin ubicación" a "con ubicación",
          para centrar el mapa una vez ahí. Después no se vuelve a mover solo (evita
          pelear con el usuario mientras arrastra el pin o navega el mapa). */}
      <MapContainer key={coordenadas ? 'con-ubicacion' : 'sin-ubicacion'} center={centroInicial} zoom={coordenadas ? 16 : 13} className="h-full w-full">
        <TileLayer key={capa} attribution={CAPAS[capa].attribution} url={CAPAS[capa].url} />
        <ManejadorClicksMapa onSeleccionar={onCambiar} />
        {coordenadas && (
          <Marker
            position={[coordenadas.lat, coordenadas.lng]}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const { lat, lng } = e.target.getLatLng()
                onCambiar({ lat, lng })
              },
            }}
          />
        )}
      </MapContainer>

      <button
        type="button"
        onClick={() => setCapa((c) => (c === 'calle' ? 'satelital' : 'calle'))}
        className="absolute bottom-2 right-2 z-[1000] flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-md hover:bg-gray-50"
      >
        {capa === 'calle' ? <Satellite size={14} /> : <MapIcon size={14} />}
        {capa === 'calle' ? 'Ver satelital' : 'Ver calles'}
      </button>
    </div>
  )
}
