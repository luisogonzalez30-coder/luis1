import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import { Satellite, Map as MapIcon, LocateFixed } from 'lucide-react'
import { aplicarFixIconosLeaflet } from '../../utils/leafletIconFix'
import { crearIconoPin } from '../../utils/iconoPin'
import { COLOR_POR_GRAVEDAD } from '../../utils/gravedad'
import PopupVotoIncidencia from './PopupVotoIncidencia'

aplicarFixIconosLeaflet()

const COLOR_SIN_GRAVEDAD = '#6B7280'

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

// Mueve el mapa cuando la ubicación la fijó algo que NO es el mapa mismo: el
// botón de GPS o el buscador de direcciones. Sin esto, buscar una dirección
// dejaba el pin fuera de la vista (el mapa solo se centra solo la primera vez,
// ver el comentario de la `key` más abajo) y el vecino no tenía forma de saber
// que la búsqueda había funcionado.
//
// Depende de `enfoque.id`, no de las coordenadas: así un toque en el mapa —que
// también cambia las coordenadas— no arrastra la vista debajo del dedo.
function CentradorMapa({ enfoque }) {
  const mapa = useMap()

  useEffect(() => {
    if (typeof enfoque?.lat !== 'number' || typeof enfoque?.lng !== 'number') return
    mapa.setView([enfoque.lat, enfoque.lng], enfoque.zoom || 17)
  }, [enfoque?.id])

  return null
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
// `incidenciasCercanas` (opcional) pinta además los reportes activos de la
// municipalidad — estilo Waze: tocar uno abre un popup con la opción de votar
// "+1" en vez de crear un reporte duplicado (ver PopupVotoIncidencia.jsx).
// El botón de GPS vive ACÁ y no en PasoUbicacion, aunque la acción la ejecute el
// formulario. Dos razones: es una acción sobre el mapa y tiene que verse encima
// del mapa (antes era un botón primario a ancho completo, arriba de todo, que
// competía con "Siguiente" y estaba lejos de lo que modifica); y porque el mapa
// ya tenía su propio flotante —el cambio de capa— así que los dos tienen que
// repartirse las esquinas en un solo lugar, o se enciman.
export default function MapaSeleccionUbicacion({
  coordenadas,
  centroPorDefecto,
  enfoque,
  onCambiar,
  incidenciasCercanas = [],
  onUbicarme,
  ubicando = false,
}) {
  const [capa, setCapa] = useState('calle')

  const centroInicial = coordenadas
    ? [coordenadas.lat, coordenadas.lng]
    : centroPorDefecto?.lat && centroPorDefecto?.lng
      ? [centroPorDefecto.lat, centroPorDefecto.lng]
      : CENTRO_DEFECTO

  return (
    <div className="relative h-64 w-full overflow-hidden rounded-2xl shadow-tarjeta ring-1 ring-borde">
      {/* La key fuerza un remount SOLO al pasar de "sin ubicación" a "con ubicación",
          para centrar el mapa una vez ahí. Después no se vuelve a mover solo (evita
          pelear con el usuario mientras arrastra el pin o navega el mapa). */}
      <MapContainer key={coordenadas ? 'con-ubicacion' : 'sin-ubicacion'} center={centroInicial} zoom={coordenadas ? 16 : 13} className="h-full w-full">
        <TileLayer key={capa} attribution={CAPAS[capa].attribution} url={CAPAS[capa].url} />
        <ManejadorClicksMapa onSeleccionar={onCambiar} />
        <CentradorMapa enfoque={enfoque} />

        {incidenciasCercanas
          .filter((t) => t.coordenadas?.lat && t.coordenadas?.lng)
          .map((t) => (
            <Marker
              key={t.id}
              position={[t.coordenadas.lat, t.coordenadas.lng]}
              icon={crearIconoPin(COLOR_POR_GRAVEDAD[t.nivel_gravedad] || COLOR_SIN_GRAVEDAD)}
            >
              <Popup>
                <PopupVotoIncidencia ticket={t} />
              </Popup>
            </Marker>
          ))}

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

      {/* Los dos flotantes usan el mismo cristal: blanco al 85-90% con
          desenfoque, para leerse igual sobre la capa de calles (clara) que
          sobre la satelital (oscura y llena de detalle). Un botón blanco opaco
          sobre una foto aérea se ve pegado encima; con el desenfoque se ve
          apoyado.

          z-[1000] los pone sobre los controles propios de Leaflet, que ocupan
          el rango 400-1000 de su stacking. Van en esquinas OPUESTAS a
          propósito: el de capa es una preferencia de vista y el de GPS es la
          acción, así que el pulgar derecho tiene que encontrar el segundo sin
          riesgo de tocar el primero. */}
      <button
        type="button"
        onClick={() => setCapa((c) => (c === 'calle' ? 'satelital' : 'calle'))}
        className="absolute bottom-3 left-3 z-[1000] flex min-h-[36px] items-center gap-1.5 rounded-xl bg-white/85 px-2.5 py-1.5 text-xs font-semibold text-tinta shadow-cristal ring-1 ring-white/60 backdrop-blur-md transition-transform active:scale-95"
      >
        {capa === 'calle' ? <Satellite size={14} /> : <MapIcon size={14} />}
        {capa === 'calle' ? 'Ver satelital' : 'Ver calles'}
      </button>

      {onUbicarme && (
        <button
          type="button"
          onClick={onUbicarme}
          disabled={ubicando}
          className="absolute bottom-3 right-3 z-[1000] flex min-h-[44px] items-center gap-2 rounded-xl bg-white/90 px-3.5 py-2.5 text-sm font-semibold text-tinta-fuerte shadow-cristal ring-1 ring-white/60 backdrop-blur-md transition-transform active:scale-95 disabled:opacity-70"
        >
          <LocateFixed
            size={18}
            className={`shrink-0 text-primary ${ubicando ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          {ubicando ? 'Buscando...' : coordenadas ? 'Mi GPS' : 'Usar mi GPS'}
        </button>
      )}
    </div>
  )
}
