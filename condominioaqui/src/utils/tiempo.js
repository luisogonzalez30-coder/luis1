// Formateo de fechas/duraciones compartido entre paneles de gestión (Órdenes
// de Trabajo y Costeo — tiempo de ingreso, tiempo de reacción).
export function formatearFecha(timestamp) {
  if (!timestamp?.toDate) return '—'
  return timestamp.toDate().toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
}

// Duración legible entre dos Timestamps de Firestore (ej. "2h 15min", "1d 4h").
// Usado para el "tiempo de reacción" (fecha_asignacion - fecha_creacion).
export function formatearDuracion(desde, hasta) {
  if (!desde?.toDate || !hasta?.toDate) return '—'

  const ms = hasta.toDate() - desde.toDate()
  if (ms < 0) return '—'

  const minutos = Math.floor(ms / 60000)
  const horas = Math.floor(minutos / 60)
  const dias = Math.floor(horas / 24)

  if (dias > 0) return `${dias}d ${horas % 24}h`
  if (horas > 0) return `${horas}h ${minutos % 60}min`
  return `${minutos}min`
}

// Horas entre dos Timestamps de Firestore, o null si el par no sirve para
// promediar. Devuelve null cuando falta alguna fecha Y TAMBIÉN cuando el
// intervalo sale negativo.
//
// Lo segundo pasa de verdad: hay solicitudes (sembradas o migradas) con
// fecha_asignacion anterior a fecha_creacion, y al promediarlas a ciegas la
// Cuenta Pública mostraba "tiempo de reacción: -7 horas". Un negativo en un
// documento público del Administrador destruye la credibilidad del resto del
// informe, así que esos registros se excluyen del promedio en vez de
// deformarlo.
export function horasEntre(desde, hasta) {
  if (!desde?.toDate || !hasta?.toDate) return null
  const horas = (hasta.toDate() - desde.toDate()) / 3_600_000
  return horas >= 0 ? horas : null
}

// Promedio en horas de un intervalo, ignorando los registros inservibles
// (ver horasEntre). Devuelve null si no queda ninguno válido.
export function promedioHoras(items, obtenerDesde, obtenerHasta) {
  const validos = items
    .map((i) => horasEntre(obtenerDesde(i), obtenerHasta(i)))
    .filter((h) => h !== null)

  if (validos.length === 0) return null
  return validos.reduce((a, h) => a + h, 0) / validos.length
}

// Horas transcurridas desde un Timestamp de Firestore hasta ahora. Usado para
// las alertas de SLA (MetricasPorArea.jsx) — cuánto lleva esperando
// una solicitud sin asignar.
export function horasDesde(timestamp) {
  if (!timestamp?.toDate) return 0
  return (Date.now() - timestamp.toDate().getTime()) / 3_600_000
}

// Tiempo relativo corto ("hace 5 min", "hace 2h", "hace 3d") — usado en la
// lista de últimos reportes del residente (ver PasoUbicacion.jsx). A
// diferencia de formatearFecha (fecha/hora absoluta, para paneles de
// usuario), acá interesa más "qué tan reciente" que la fecha exacta.
export function tiempoRelativo(timestamp) {
  if (!timestamp?.toDate) return ''
  const minutos = Math.floor((Date.now() - timestamp.toDate().getTime()) / 60000)
  if (minutos < 1) return 'recién'
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `hace ${horas}h`
  return `hace ${Math.floor(horas / 24)}d`
}

// Usado para el KPI de gasto mensual (ResumenGastoMensual.jsx, MetricasPorArea.jsx).
export function esDelMesActual(timestamp) {
  if (!timestamp?.toDate) return false
  const fecha = timestamp.toDate()
  const ahora = new Date()
  return fecha.getFullYear() === ahora.getFullYear() && fecha.getMonth() === ahora.getMonth()
}
