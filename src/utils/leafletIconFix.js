import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

let aplicado = false

// Fix conocido de react-leaflet + Vite: los íconos por defecto de Leaflet no se
// resuelven bien con el bundler, hay que registrarlos manualmente. Se aplica una sola
// vez sin importar cuántos componentes de mapa lo importen.
export function aplicarFixIconosLeaflet() {
  if (aplicado) return
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  })
  aplicado = true
}
