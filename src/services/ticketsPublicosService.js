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
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, COLECCIONES } from '../firebase/firebase'
import { normalizarNumeroTicket } from '../utils/ticket'

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
// Bajado de 200 a 60 el 21-ago-2026. El cálculo que lo motivó: cada vecino que
// abre el formulario paga estas lecturas, y la cuota gratis de Firestore son
// 50.000 al día. Con 200 activos + 10 recientes son ~210 lecturas por visita,
// o sea la app se queda sin cuota alrededor de la visita 240 y el mapa aparece
// en blanco hasta la medianoche. Con 60 el techo sube a ~700 visitas diarias.
//
// Por qué 60 no rompe la detección de duplicados HOY: Licantén promedia ~1,5
// reportes al día y rara vez pasa de unas decenas sin resolver a la vez, así
// que la ventana ni se llena. El riesgo aparece en un municipio grande, y ahí
// la solución no es agrandar la ventana —vuelve el problema de cuota— sino
// consultar por categoría, que es lo que de verdad mira el detector de
// duplicados. Eso necesita un índice nuevo y va en un segundo paso, para no
// publicar la consulta antes de que el índice exista (ESTADO_PROYECTO.md §26).
const MAX_TICKETS_ACTIVOS = 60
const MAX_TICKETS_RECIENTES = 500

// El ticket público usa el numero_ticket como ID de documento: si ese número ya
// lo usó OTRO reporte, Firestore clasifica la escritura como "update" (el doc ya
// existe) y las reglas la rechazan con permission-denied, porque no hay allow
// update para anónimos — así es como se fuerza unicidad real sin necesitar una
// transacción.
//
// Datos del ticket público, sin escribirlos: los agrega al lote que se le pasa,
// para que se creen en el MISMO commit atómico que la incidencia (ver
// crearIncidencia). Antes esto se escribía por separado y antes que la
// incidencia — si la incidencia después era rechazada, el ticket quedaba
// huérfano: visible para los vecinos en el mapa y en "Últimos reportes", pero
// invisible para el municipio, sin número entregado y sin WhatsApp. Había 7 en
// producción (ver §40).
export function agregarTicketPublicoAlLote(lote, {
  numeroTicket,
  incidenciaId,
  municipioId,
  categoria,
  nivelGravedad,
  coordenadas,
  direccionTexto,
}) {
  lote.set(doc(db, COLECCIONES.TICKETS_PUBLICOS, numeroTicket), datosTicketPublico({
    incidenciaId,
    municipioId,
    categoria,
    nivelGravedad,
    coordenadas,
    direccionTexto,
  }))
}

// Lectura pública (allow get: if true en firestore.rules). La usa crearIncidencia
// para dos cosas que no se pueden resolver de otra forma desde un cliente sin
// login:
//  - distinguir una colisión de número de ticket de cualquier otro rechazo (todos
//    llegan como permission-denied, sin motivo);
//  - saber si un reintento de la cola offline ya está registrado, mirando si el
//    ticket apunta a ese mismo documento de incidencia (la incidencia en sí no se
//    puede leer sin ser funcionario).
// Devuelve null también si falla la red: quien llama debe tratar "no sé" como
// "no reintentar a ciegas".
export async function obtenerTicketPublico(numeroTicket) {
  try {
    const snap = await getDoc(doc(db, COLECCIONES.TICKETS_PUBLICOS, numeroTicket))
    return snap.exists() ? snap.data() : null
  } catch (error) {
    console.error('[ticketsPublicosService] No se pudo leer el ticket público:', error)
    return null
  }
}

function datosTicketPublico({ incidenciaId, municipioId, categoria, nivelGravedad, coordenadas, direccionTexto }) {
  return {
    incidencia_id: incidenciaId,
    municipio_id: municipioId,
    categoria,
    nivel_gravedad: nivelGravedad || null,
    coordenadas,
    // Referencia de ubicación ("frente a la escuela"). Se agregó el
    // 02-ago-2026 para que el vecino vea DÓNDE fue al tocar un reporte de la
    // lista (§29). No agrega exposición real: las coordenadas exactas ya
    // eran públicas acá desde el mapa tipo Waze. Los "detalles adicionales"
    // siguen FUERA a propósito — ese campo es texto libre y puede contener
    // referencias a personas; este solo describe un lugar.
    direccion_texto: direccionTexto || '',
    upvotes: 1,
    fotos_antes_urls: [],
    estado: 'Pendiente',
    calificacion_ciudadano: null,
    fecha_creacion: serverTimestamp(),
    fecha_cierre: null,
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

// Busca un ticket público por su número. Normaliza lo que el ciudadano escribe
// a mano (espacios, puntos, guiones) — ver normalizarNumeroTicket, que también
// sigue reconociendo los tickets del formato antiguo. Devuelve null si no
// existe, no lanza error.
export async function buscarTicketPublico(numeroTicket) {
  const snap = await getDoc(doc(db, COLECCIONES.TICKETS_PUBLICOS, normalizarNumeroTicket(numeroTicket)))
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
