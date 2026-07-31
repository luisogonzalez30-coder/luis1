import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { aplicarFixIconosLeaflet } from '../../utils/leafletIconFix'
import { crearIconoPin } from '../../utils/iconoPin'

aplicarFixIconosLeaflet()

// Color de respaldo para incidencias antiguas creadas antes del triage automático
// (sin campo color_pin todavía).
const COLOR_SIN_GRAVEDAD = '#6B7280'

// Centro por defecto: Plaza de Armas de Santiago, Chile (ajustar según comuna real).
const CENTRO_DEFECTO = [-33.4372, -70.6506]

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

export default function MapaIncidencias({ incidencias, incidenciaSeleccionadaId, onSeleccionar, centro }) {
  // react-leaflet solo lee "center" al montar el mapa (no re-centra si cambia después),
  // así que el llamador debe esperar a tener el centro real antes de montar este componente.
  const centroInicial = centro?.lat && centro?.lng ? [centro.lat, centro.lng] : CENTRO_DEFECTO

  return (
    <MapContainer center={centroInicial} zoom={13} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <CentradorMapa incidencias={incidencias} seleccionadaId={incidenciaSeleccionadaId} />

      {incidencias
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
                <strong>{inc.categoria}</strong>
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
  )
}
