// Distancia entre dos coordenadas GPS, en metros — fórmula de Haversine.
// Se usa para el aviso de "posible duplicado" al crear un reporte (ver
// components/ciudadano/AvisoPosibleDuplicado.jsx): suficientemente preciso
// para comparar contra un radio de ~50m, no hace falta nada más exacto
// (geodesia elipsoidal, etc.) para ese caso de uso.
const RADIO_TIERRA_METROS = 6371000

function gradosARadianes(grados) {
  return (grados * Math.PI) / 180
}

export function distanciaMetros(a, b) {
  const dLat = gradosARadianes(b.lat - a.lat)
  const dLng = gradosARadianes(b.lng - a.lng)
  const lat1 = gradosARadianes(a.lat)
  const lat2 = gradosARadianes(b.lat)

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * RADIO_TIERRA_METROS * Math.asin(Math.sqrt(h))
}
