import { useEffect, useRef } from 'react'
import { obtenerReportesPendientes, eliminarReportePendiente } from '../utils/colaOffline'
import { crearIncidencia } from '../services/incidenciasService'
import { conTimeout } from '../utils/timeout'

// Sincroniza en segundo plano los reportes guardados offline. Se monta UNA vez
// a nivel raíz de la app (no depende de la ruta) para que funcione sin importar
// en qué pantalla esté el ciudadano cuando vuelva la señal.
export function useSincronizacionOffline() {
  const sincronizandoRef = useRef(false)

  useEffect(() => {
    async function sincronizar() {
      if (sincronizandoRef.current) return
      if (typeof navigator !== 'undefined' && !navigator.onLine) return

      sincronizandoRef.current = true
      try {
        const pendientes = await obtenerReportesPendientes()
        // Secuencial (no Promise.all): un ítem con conexión aún mala no debe
        // abortar los demás, y evita saturar la red con varios envíos a la vez
        // justo cuando la señal recién está volviendo.
        for (const item of pendientes) {
          try {
            await conTimeout(
              crearIncidencia(item.datos),
              15000,
              'timeout al sincronizar reporte offline'
            )
            await eliminarReportePendiente(item.idLocal)
          } catch (error) {
            console.error('[useSincronizacionOffline] No se pudo sincronizar un reporte, se reintentará después:', error)
          }
        }
      } finally {
        sincronizandoRef.current = false
      }
    }

    sincronizar()

    // Cubre apps móviles suspendidas en segundo plano: al volver a primer plano
    // no siempre se dispara 'online' de forma confiable aunque la señal ya esté ahí.
    function alCambiarVisibilidad() {
      if (document.visibilityState === 'visible') sincronizar()
    }

    window.addEventListener('online', sincronizar)
    document.addEventListener('visibilitychange', alCambiarVisibilidad)

    return () => {
      window.removeEventListener('online', sincronizar)
      document.removeEventListener('visibilitychange', alCambiarVisibilidad)
    }
  }, [])
}
