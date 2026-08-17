import { Loader } from '@googlemaps/js-api-loader'

// Carga perezosa y de una sola vez del SDK de Google Maps — solo la librería
// "geocoding" (expone Geocoder), no el mapa completo: el mapa de la app sigue
// siendo Leaflet + OpenStreetMap/Esri (ver MapaSeleccionUbicacion.jsx), esto es
// exclusivamente para geocodificacionService.js.
//
// `Loader` de @googlemaps/js-api-loader deduplica: si buscarDirecciones y
// obtenerDireccionAproximada piden la librería casi al mismo tiempo, solo se
// inserta un <script> y ambas esperan la misma promesa.
let cargaGeocoder = null

export function cargarGeocoder() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return Promise.reject(
      new Error('Falta VITE_GOOGLE_MAPS_API_KEY en el archivo .env — ver .env.example.')
    )
  }

  if (!cargaGeocoder) {
    const loader = new Loader({ apiKey, language: 'es', region: 'CL' })
    cargaGeocoder = loader.importLibrary('geocoding').then(({ Geocoder }) => new Geocoder())
  }

  return cargaGeocoder
}
