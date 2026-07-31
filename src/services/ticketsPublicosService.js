import {
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, COLECCIONES } from '../firebase/firebase'

const ticketsPublicosRef = collection(db, COLECCIONES.TICKETS_PUBLICOS)

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
  coordenadas,
  esRetry = false,
}) {
  try {
    await setDoc(doc(db, COLECCIONES.TICKETS_PUBLICOS, numeroTicket), {
      incidencia_id: incidenciaId,
      municipio_id: municipioId,
      categoria,
      nivel_gravedad: nivelGravedad || null,
      coordenadas,
      upvotes: 1,
      fotos_antes_urls: [],
      estado: 'Pendiente',
      fecha_creacion: serverTimestamp(),
      fecha_cierre: null,
    })
  } catch (error) {
    if (esRetry && error.code === 'permission-denied') return
    throw error
  }
}

// Suscripción en tiempo real a los tickets públicos de UNA municipalidad —
// alimenta el mapa ciudadano (pines de reportes activos, tipo Waze) y el
// chequeo de proximidad al crear un reporte nuevo (ver utils/distancia.js).
// Solo trae campos no sensibles (mismo criterio que buscarTicketPublico),
// nunca nombre/contacto del ciudadano.
export function suscribirTicketsPublicos(callback, municipioId) {
  if (!municipioId) {
    console.error('[ticketsPublicosService] suscribirTicketsPublicos requiere municipioId.')
    return () => {}
  }

  const q = query(ticketsPublicosRef, where('municipio_id', '==', municipioId))

  return onSnapshot(
    q,
    (snapshot) => {
      const tickets = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      callback(tickets)
    },
    (error) => {
      console.error('[ticketsPublicosService] Error al escuchar tickets públicos:', error)
    }
  )
}

// Refleja un voto ("+1") en el ticket público. Best-effort, igual que
// actualizarEstadoTicketPublico: el voto real ya quedó guardado en
// incidencias/{id} (ver votarIncidencia en incidenciasService.js), esto es
// solo para que el mapa muestre el conteo actualizado.
export function incrementarUpvotesTicketPublico(numeroTicket) {
  if (!numeroTicket) return

  updateDoc(doc(db, COLECCIONES.TICKETS_PUBLICOS, numeroTicket), { upvotes: increment(1) }).catch((error) => {
    console.error('[ticketsPublicosService] No se pudo sincronizar el voto en el ticket público:', error)
  })
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
