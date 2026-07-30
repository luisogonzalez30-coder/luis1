import { useState, useCallback } from 'react'

// Encapsula el uso de la Geolocation API del navegador con manejo de los
// errores más comunes en terreno: permiso denegado, GPS no disponible, timeout.
export function useGeolocation() {
  const [coordenadas, setCoordenadas] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  const obtenerUbicacion = useCallback(() => {
    setError(null)

    if (!('geolocation' in navigator)) {
      setError('Este dispositivo/navegador no soporta geolocalización. Ingresa la dirección manualmente.')
      return
    }

    setCargando(true)

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        setCoordenadas({
          lat: posicion.coords.latitude,
          lng: posicion.coords.longitude,
        })
        setCargando(false)
      },
      (err) => {
        // Mapeamos los códigos de error del navegador a mensajes entendibles
        const mensajes = {
          1: 'Permiso de ubicación denegado. Actívalo en la configuración del navegador para continuar.',
          2: 'No se pudo determinar tu ubicación (GPS/señal no disponible). Intenta nuevamente en un lugar abierto.',
          3: 'La búsqueda de ubicación tardó demasiado. Intenta nuevamente.',
        }
        setError(mensajes[err.code] || 'No se pudo obtener la ubicación.')
        setCargando(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }, [])

  return { coordenadas, cargando, error, obtenerUbicacion }
}
