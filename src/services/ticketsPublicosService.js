import {
  collection,
  doc,
  getDoc,
  increment,
  limit as limitar,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, COLECCIONES } from '../firebase/firebase'

const ticketsPublicosRef = collection(db, COLECCIONES.TICKETS_PUBLICOS)

// Techos de resultados para las suscripciones públicas. IMPORTANTE: ninguna
// consulta a tickets_publicos debe quedar sin limit().
//
// Motivo (bug real corregido el 02-ago-2026): antes existía una única
// suscripción `suscribirTicketsPublicos` SIN límite, que traía TODOS los
// tickets del municipio a cada ciudadano que abría el formulario. Con ~70
// tickets de prueba no se notaba, pero crece sin techo: con miles de reportes
// acumulados le quema los datos móviles al vecino (justo el público rural de
// gama baja que el resto de la app cuida) y agota la cuota gratis de lecturas
// de Firestore (plan Spark, ver ESTADO_PROYECTO.md §19) — la app se caería
// justo cuando empiece a usarse en serio.
const MAX_TICKETS_ACTIVOS = 200
const MAX_TICKETS_RECIENTES = 500

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
      calificacion_ciudadano: null,
      fecha_creacion: serverTimestamp(),
      fecha_cierre: null,
    })
  } catch (error) {
    if (esRetry && error.code === 'permission-denied') return
    throw error
  }
}

// Helper interno: toda suscripción a tickets_publicos pasa por acá, así ninguna
// puede quedarse sin limit() por descuido (ver MAX_TICKETS_* arriba).
function suscribir(condiciones, cuantos, callback, etiqueta) {
  const q = query(ticketsPublicosRef, ...condiciones, orderBy('fecha_creacion', 'desc'), limitar(cuantos))

  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (error) => console.error(`[ticketsPublicosService] Error al escuchar ${etiqueta}:`, error)
  )
}

// Reportes ACTIVOS (sin resolver) de una municipalidad: alimenta los pines del
// mapa ciudadano (tipo Waze) y el chequeo de proximidad al crear un reporte
// nuevo (ver utils/distancia.js). Solo trae campos no sensibles (mismo criterio
// que buscarTicketPublico), nunca nombre/contacto del ciudadano.
//
// Acotado a los MAX_TICKETS_ACTIVOS más recientes. Los resueltos se excluyen en
// el servidor (antes se filtraban en memoria, después de haberlos descargado):
// son los que crecen sin techo con el tiempo, mientras que los activos se
// mantienen acotados solos a medida que el municipio va cerrando casos.
// Limitación aceptada: si un municipio llegara a acumular más de 200 reportes
// sin resolver, la detección de duplicados podría no ver los más antiguos —
// preferible a romper la app entera por cuota.
export function suscribirTicketsActivos(callback, municipioId) {
  if (!municipioId) {
    console.error('[ticketsPublicosService] suscribirTicketsActivos requiere municipioId.')
    return () => {}
  }

  return suscribir(
    [where('municipio_id', '==', municipioId), where('estado', 'in', ['Pendiente', 'En Proceso'])],
    MAX_TICKETS_ACTIVOS,
    callback,
    'tickets activos'
  )
}

// Últimos reportes de una municipalidad, de cualquier estado, del más reciente
// al más antiguo. Lo usan el listado "Últimos reportes de la comuna" del
// formulario ciudadano (con un puñado) y la página pública de transparencia
// (con una ventana más grande, para calcular sus estadísticas).
export function suscribirUltimosTickets(callback, municipioId, cuantos = 10) {
  if (!municipioId) {
    console.error('[ticketsPublicosService] suscribirUltimosTickets requiere municipioId.')
    return () => {}
  }

  return suscribir(
    [where('municipio_id', '==', municipioId)],
    Math.min(cuantos, MAX_TICKETS_RECIENTES),
    callback,
    'últimos tickets'
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

// Refleja la calificación ciudadana (1-5) en el ticket público, para que la
// propia página /estado sepa que ya se calificó sin tener que releer
// incidencias (a la que el ciudadano no tiene acceso de lectura). Best-effort,
// mismo criterio que incrementarUpvotesTicketPublico: la calificación real ya
// quedó guardada en incidencias/{id} (ver calificarIncidencia).
export function actualizarCalificacionTicketPublico(numeroTicket, calificacion) {
  if (!numeroTicket) return

  updateDoc(doc(db, COLECCIONES.TICKETS_PUBLICOS, numeroTicket), { calificacion_ciudadano: calificacion }).catch((error) => {
    console.error('[ticketsPublicosService] No se pudo sincronizar la calificación en el ticket público:', error)
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
