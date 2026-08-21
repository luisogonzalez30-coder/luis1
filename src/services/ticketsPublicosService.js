import {
  collection,
  doc,
  getDoc,
  getDocsFromServer,
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
import { conTimeout } from '../utils/timeout'

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
// Bajado otra vez, de 60 a 25, cuando la detección de duplicados dejó de
// depender de esta ventana (ver buscarActivosPorCategoria). Ahora estos tickets
// cumplen una sola función: los pines que el vecino ve en el mapa como
// contexto. Para eso 25 sobra —y de paso el mapa queda más legible que con 200
// pines encimados—, mientras que la comparación fina la hace una consulta
// puntual y filtrada por categoría, mucho más precisa que cualquier ventana.
const MAX_TICKETS_ACTIVOS = 25
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

// Techo de la consulta puntual de duplicados. No es una suscripción: se dispara
// UNA vez, cuando el vecino ya eligió categoría y ubicación y aprieta
// "Siguiente". 15 alcanza de sobra porque un duplicado es un fenómeno reciente
// —dos vecinos reportan el mismo bache con horas o días de diferencia, no con
// meses—, y porque acá ya viene filtrado por categoría: son los 15 activos más
// nuevos DE ESA categoría, no 15 de todo el municipio.
const MAX_CANDIDATOS_DUPLICADO = 15

// Tope de espera de esa consulta. Corto a propósito: es una mejora de
// precisión, no un requisito para reportar.
const ESPERA_MAXIMA_MS = 6000

// Busca candidatos a duplicado acotando por categoría en el SERVIDOR.
//
// Antes esto se resolvía filtrando en memoria los tickets que ya tenía cargados
// el mapa. El problema no era el costo sino la ceguera: esa ventana mezcla
// todas las categorías, así que de 60 tickets quizá 7 eran de la categoría que
// importaba. Subir la ventana para compensar devuelve el problema de cuota
// (cada vecino la paga al abrir el formulario, reporte o no). Preguntar por
// categoría rompe ese empate: la detección mejora y las lecturas del mapa
// pueden seguir bajas.
//
// Devuelve null —no una lista vacía— cuando la consulta no se pudo hacer. Esa
// distinción es la que permite al llamador saber que NO tiene una respuesta y
// recurrir al método anterior, en vez de creer que no hay duplicados y dejar
// pasar uno.
export async function buscarActivosPorCategoria(municipioId, categoria) {
  if (!municipioId || !categoria) return null

  try {
    const q = query(
      ticketsPublicosRef,
      where('municipio_id', '==', municipioId),
      where('estado', 'in', ['Pendiente', 'En Proceso']),
      where('categoria', '==', categoria),
      orderBy('fecha_creacion', 'desc'),
      limitar(MAX_CANDIDATOS_DUPLICADO)
    )

    // Firestore reintenta indefinidamente cuando no hay señal, así que sin
    // límite esta promesa puede no resolverse nunca. Y esto corre justo cuando
    // el vecino aprieta "Siguiente": dejarlo con el botón girando para siempre
    // en una zona con mala cobertura —el público de esta app— es peor que
    // perder la comprobación de duplicado. A los 6 segundos se abandona y se
    // sigue con la ventana del mapa.
    // getDocsFromServer y NO getDocs, por una razón que costó encontrar y que
    // no se ve compilando ni leyendo el código:
    //
    // getDocs, cuando el dispositivo no alcanza a Firestore, NO falla. Sirve lo
    // que tenga en la caché local y, si está vacía, devuelve cero documentos en
    // milisegundos, sin lanzar nada. O sea que este catch nunca se ejecutaría y
    // la función devolvería una lista vacía: el llamador la leería como "no hay
    // ningún duplicado" y dejaría pasar el reporte repetido, en vez de darse
    // cuenta de que no tiene respuesta y recurrir a la ventana del mapa.
    // Comprobado contra el emulador apagado: 0 documentos en 0,1 s.
    //
    // getDocsFromServer exige respuesta del servidor y lanza 'unavailable' si
    // no la hay, que es justo lo que necesitamos: acá una respuesta vacía y una
    // respuesta ausente significan cosas opuestas.
    const snap = await conTimeout(getDocsFromServer(q), ESPERA_MAXIMA_MS, 'Tiempo agotado buscando duplicados')
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch (error) {
    // failed-precondition = falta el índice compuesto (municipio_id, estado,
    // categoria, fecha_creacion). Se contempla a propósito: el índice se
    // despliega a mano y el sitio se publica solo al hacer merge, así que las
    // dos cosas pueden llegar en cualquier orden. Sin este catch, publicar
    // antes de que el índice terminara de construirse dejaría el formulario
    // roto para los vecinos — que es exactamente el accidente que §26 documentó.
    // Con él, la app simplemente sigue usando el método anterior y empieza a
    // usar el nuevo sola en cuanto el índice existe.
    if (error?.code === 'failed-precondition') {
      console.warn('[ticketsPublicosService] Índice de duplicados aún no disponible; se usa la ventana del mapa.')
    } else if (error?.esTimeout || error?.code === 'unavailable') {
      console.warn('[ticketsPublicosService] Sin respuesta del servidor al buscar duplicados; se usa la ventana del mapa.')
    } else {
      console.error('[ticketsPublicosService] Error al buscar candidatos a duplicado:', error)
    }
    return null
  }
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
