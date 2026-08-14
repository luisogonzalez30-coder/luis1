import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip, useMap } from 'react-leaflet'
import { Satellite, Map as MapIcon } from 'lucide-react'
import { aplicarFixIconosLeaflet } from '../../utils/leafletIconFix'
import { crearIconoPin } from '../../utils/iconoPin'
import CapaMapaCalor, { LeyendaMapaCalor } from './CapaMapaCalor'
import { etiquetaCategoria } from '../../utils/categorias'

aplicarFixIconosLeaflet()

// Color de respaldo para incidencias antiguas creadas antes del triage automático
// (sin campo color_pin todavía).
const COLOR_SIN_GRAVEDAD = '#6B7280'

// Centro por defecto: Plaza de Armas de Santiago, Chile (ajustar según comuna real).
const CENTRO_DEFECTO = [-33.4372, -70.6506]

// Las dos capas base, iguales a las del mapa del vecino
// (components/ciudadano/MapaSeleccionUbicacion.jsx). Si se cambia una, cambiar
// la otra: el funcionario y el vecino tienen que estar mirando el mismo mapa.
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

// Cuando se selecciona una incidencia (desde la lista o el pin), lleva el mapa
// hasta su ubicación real. Sin esto, seleccionar una tarjeta de la lista no movía
// el mapa — solo atenuaba los demás pines.
function CentradorMapa({ incidencias, seleccionadaId }) {
  const mapa = useMap()

  useEffect(() => {
    if (!seleccionadaId) return
    const incidencia = incidencias.find((inc) => inc.id === seleccionadaId)
    if (incidencia?.coordenadas?.lat && incidencia?.coordenadas?.lng) {
      mapa.flyTo([incidencia.coordenadas.lat, incidencia.coordenadas.lng], 17, { duration: 0.8 })
    }
    // Solo debe reaccionar al cambio de selección, no a cada actualización de "incidencias"
    // (que llegan en tiempo real y remontarían el vuelo constantemente).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionadaId])

  return null
}

// Lleva el mapa a un sector cuando el Alcalde lo elige desde PanelSectores.
function EncuadradorSector({ sector }) {
  const mapa = useMap()

  useEffect(() => {
    if (typeof sector?.lat !== 'number') return
    // fitBounds sobre el círculo del sector: encuadra el territorio completo en
    // vez de un zoom fijo, que en un sector grande dejaría la mitad fuera.
    const radio = sector.radio_metros || 500
    const grados = radio / 111_320 // metros → grados de latitud, aproximado
    mapa.fitBounds(
      [[sector.lat - grados, sector.lng - grados], [sector.lat + grados, sector.lng + grados]],
      { padding: [24, 24], duration: 0.8 }
    )
  }, [sector, mapa])

  return null
}

export default function MapaIncidencias({ incidencias, incidenciaSeleccionadaId, onSeleccionar, centro, sectores, sectorEnfocado }) {
  // react-leaflet solo lee "center" al montar el mapa (no re-centra si cambia después),
  // así que el llamador debe esperar a tener el centro real antes de montar este componente.
  const centroInicial = centro?.lat && centro?.lng ? [centro.lat, centro.lng] : CENTRO_DEFECTO

  const [modo, setModo] = useState('pines')
  const esCalor = modo === 'calor'

  // Capa base. La satelital la pidió el usuario el 12-ago-2026 con un motivo
  // concreto: en zona rural la vista de calles no muestra nada útil —caminos sin
  // nombre, potreros, sin veredas— y el funcionario necesita reconocer el lugar
  // antes de mandar una cuadrilla. Es la misma capa que ya usaba el mapa del
  // vecino (MapaSeleccionUbicacion.jsx): Esri World Imagery, gratis y sin API
  // key, a diferencia de Google Satellite, que exige facturación y además tiene
  // mala cobertura en el Chile rural.
  const [capa, setCapa] = useState('calle')

  return (
    <div className="relative h-full w-full">
      {/* Alternador de vista. Va sobre el mapa (z sobre los tiles de Leaflet,
          que usan z-index bajo) y no dentro de la barra de filtros: cambia CÓMO
          se dibuja este mapa, no qué datos entran — esos ya los acota el filtro
          único de arriba. */}
      <div className="absolute right-3 top-3 z-[400] flex gap-1 rounded-xl bg-white/90 p-1 shadow-tarjeta ring-1 ring-borde backdrop-blur-sm">
        {[
          { id: 'pines', etiqueta: 'Pines' },
          { id: 'calor', etiqueta: 'Mapa de calor' },
        ].map((opcion) => (
          <button
            key={opcion.id}
            onClick={() => setModo(opcion.id)}
            className={`min-h-[32px] rounded-lg px-2.5 text-xs font-medium transition-colors
              ${modo === opcion.id ? 'bg-primary text-white' : 'text-tinta-suave hover:bg-tinta-fuerte/5'}`}
          >
            {opcion.etiqueta}
          </button>
        ))}
      </div>

      {/* Va abajo a la derecha, igual que en el mapa del vecino, para que quien
          usa las dos vistas no tenga que buscarlo en otro lado. */}
      <button
        type="button"
        onClick={() => setCapa((c) => (c === 'calle' ? 'satelital' : 'calle'))}
        className="absolute bottom-3 right-3 z-[400] flex min-h-[32px] items-center gap-1.5 rounded-lg bg-white/90 px-2.5 text-xs font-medium text-tinta shadow-tarjeta ring-1 ring-borde backdrop-blur-sm transition-colors hover:bg-white"
      >
        {capa === 'calle' ? <Satellite size={14} /> : <MapIcon size={14} />}
        {capa === 'calle' ? 'Ver satelital' : 'Ver calles'}
      </button>

      {esCalor && <LeyendaMapaCalor total={incidencias.length} />}

      <MapContainer center={centroInicial} zoom={13} className="h-full w-full">
      {/* La key fuerza el cambio de tiles: sin ella Leaflet se queda con la capa
          que montó primero. Mismo patrón que en el mapa del vecino. */}
      <TileLayer key={capa} attribution={CAPAS[capa].attribution} url={CAPAS[capa].url} />

      <CentradorMapa incidencias={incidencias} seleccionadaId={incidenciaSeleccionadaId} />
      <EncuadradorSector sector={sectorEnfocado} />

      {esCalor && <CapaMapaCalor incidencias={incidencias} />}

      {/* Sectores de la comuna: se dibujan DEBAJO de los pines (van antes en el
          árbol) y con relleno muy tenue, para dar contexto territorial sin
          competir visualmente con las incidencias, que son el dato principal. */}
      {sectores?.filter((s) => typeof s.lat === 'number' && typeof s.lng === 'number').map((s) => (
        <Circle
          key={s.nombre}
          center={[s.lat, s.lng]}
          radius={s.radio_metros || 500}
          pathOptions={{ color: '#6B7280', weight: 1, fillColor: '#6B7280', fillOpacity: 0.05 }}
        >
          <Tooltip direction="center" permanent className="!border-0 !bg-transparent !shadow-none">
            <span className="text-[11px] font-medium text-gray-600">{s.nombre}</span>
          </Tooltip>
        </Circle>
      ))}

      {/* En modo calor no se dibujan los pines: superponerlos anula la lectura
          de densidad, que es justo para lo que se cambió de vista. */}
      {!esCalor && incidencias
        .filter((inc) => inc.coordenadas?.lat && inc.coordenadas?.lng)
        .map((inc) => {
          // Color = gravedad (mapa de calor de urgencia). Las resueltas se atenúan
          // para que salten a la vista las que siguen pendientes/asignadas.
          const noEsLaSeleccionada = incidenciaSeleccionadaId && incidenciaSeleccionadaId !== inc.id
          const opacidad = inc.estado === 'Resuelto' ? 0.4 : noEsLaSeleccionada ? 0.6 : 1

          return (
            <Marker
              key={inc.id}
              position={[inc.coordenadas.lat, inc.coordenadas.lng]}
              icon={crearIconoPin(inc.color_pin || COLOR_SIN_GRAVEDAD)}
              eventHandlers={{ click: () => onSeleccionar(inc.id) }}
              opacity={opacidad}
            >
              <Popup>
                <strong>{etiquetaCategoria(inc.categoria)}</strong>
                {inc.nivel_gravedad && <> · Gravedad {inc.nivel_gravedad}</>}
                <br />
                {inc.direccion_texto || 'Sin dirección de referencia'}
                <br />
                Estado: {inc.estado}
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
