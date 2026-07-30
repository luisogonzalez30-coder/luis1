import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db, COLECCIONES } from '../firebase/firebase'

// Registra el ticket público de una incidencia. Usa setDoc con el numero_ticket
// como ID de documento: si ese número ya lo usó OTRO reporte, Firestore clasifica
// la escritura como "update" (el doc ya existe) y las reglas la rechazan con
// permission-denied, porque no hay allow update para anónimos — así es como se
// fuerza unicidad real sin necesitar una transacción.
//
// esRetry indica que este numeroTicket ya se le mostró al ciudadano en un intento
// anterior (reintento desde la cola offline): si la escritura choca con
// permission-denied, se asume que fue el propio intento original el que lo creó,
// y se trata como éxito en vez de propagar el error.
export async function registrarTicketPublico({
  numeroTicket,
  incidenciaId,
  municipioId,
  categoria,
  nivelGravedad,
  esRetry = false,
}) {
  try {
    await setDoc(doc(db, COLECCIONES.TICKETS_PUBLICOS, numeroTicket), {
      incidencia_id: incidenciaId,
      municipio_id: municipioId,
      categoria,
      nivel_gravedad: nivelGravedad || null,
      estado: 'Pendiente',
      fecha_creacion: serverTimestamp(),
      fecha_cierre: null,
    })
  } catch (error) {
    if (esRetry && error.code === 'permission-denied') return
    throw error
  }
}

// Busca un ticket público por su número (normaliza mayúsculas/espacios porque el
// ciudadano lo escribe a mano). Devuelve null si no existe, no lanza error.
export async function buscarTicketPublico(numeroTicket) {
  const idNormalizado = numeroTicket.trim().toUpperCase()
  const snap = await getDoc(doc(db, COLECCIONES.TICKETS_PUBLICOS, idNormalizado))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// Refleja un cambio de estado (asignación / resolución) en el ticket público.
// Best-effort: si falla no debe bloquear la acción principal del funcionario
// (mismo criterio que la subida de fotos en incidenciasService.js).
export function actualizarEstadoTicketPublico(numeroTicket, cambios) {
  if (!numeroTicket) return

  updateDoc(doc(db, COLECCIONES.TICKETS_PUBLICOS, numeroTicket), cambios).catch((error) => {
    console.error('[ticketsPublicosService] No se pudo sincronizar el ticket público:', error)
  })
}
