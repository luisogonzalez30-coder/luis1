// Cola de reportes ciudadanos pendientes de sincronizar, persistida en localStorage
// para sobrevivir a que el usuario cierre la app mientras está sin conexión.
// Todo acceso va envuelto en try/catch: en Safari en modo privado, o en
// dispositivos con almacenamiento lleno, localStorage puede lanzar
// QuotaExceededError incluso para unos pocos KB — no debe tumbar la app.
const CLAVE = 'reportes_pendientes'

function leerCola() {
  try {
    const crudo = localStorage.getItem(CLAVE)
    return crudo ? JSON.parse(crudo) : []
  } catch (error) {
    console.error('[colaOffline] No se pudo leer la cola local:', error)
    return []
  }
}

function escribirCola(cola) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(cola))
    return true
  } catch (error) {
    console.error('[colaOffline] No se pudo guardar en almacenamiento local:', error)
    return false
  }
}

function generarIdLocal() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// Guarda un reporte para reintentar más tarde. Devuelve el idLocal si se guardó
// bien, o null si el dispositivo no pudo persistirlo (el llamador debe avisarle
// al ciudadano que anote su ticket, ya que no hay garantía de reintento automático).
export function guardarReportePendiente(datos) {
  const idLocal = generarIdLocal()
  const cola = leerCola()
  cola.push({ idLocal, datos, creadoEn: Date.now() })
  return escribirCola(cola) ? idLocal : null
}

export function obtenerReportesPendientes() {
  return leerCola()
}

export function eliminarReportePendiente(idLocal) {
  const cola = leerCola().filter((item) => item.idLocal !== idLocal)
  escribirCola(cola)
}
