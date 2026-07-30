// Genera un número de ticket legible para el ciudadano, ej: "INC-20260729-4F2A"
// No es el ID del documento de Firestore (ese lo genera Firestore automáticamente),
// es solo un código amigable que el ciudadano puede anotar o mostrar.
export function generarNumeroTicket() {
  const fecha = new Date()
  const yyyy = fecha.getFullYear()
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const dd = String(fecha.getDate()).padStart(2, '0')
  const sufijo = Math.random().toString(16).slice(2, 6).toUpperCase()

  return `INC-${yyyy}${mm}${dd}-${sufijo}`
}
