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

// Usado para el KPI de gasto mensual (ResumenGastoMensual.jsx, MetricasPorDepartamento.jsx).
export function esDelMesActual(timestamp) {
  if (!timestamp?.toDate) return false
  const fecha = timestamp.toDate()
  const ahora = new Date()
  return fecha.getFullYear() === ahora.getFullYear() && fecha.getMonth() === ahora.getMonth()
}
