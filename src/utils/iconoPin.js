import L from 'leaflet'

// Ícono de pin coloreado para Leaflet, compartido entre el mapa del Dashboard
// (MapaIncidencias.jsx) y el mapa ciudadano (MapaSeleccionUbicacion.jsx) — antes
// vivía duplicado dentro de MapaIncidencias.jsx.
export function crearIconoPin(color) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.5">
      <path d="M12 22s8-7.58 8-13a8 8 0 1 0-16 0c0 5.42 8 13 8 13z"/>
      <circle cx="12" cy="9" r="2.7" fill="white" />
    </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -26],
  })
}
