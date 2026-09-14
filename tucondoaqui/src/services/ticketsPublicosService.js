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

const ticketsPublicosRef = collection(db, COLECCIONES.TICKETS)

// Techos de resultados para las suscripciones públicas. IMPORTANTE: ninguna
// consulta a tickets_publicos debe quedar sin limit().
//
// Motivo (bug real corregido el 02-ago-2026): antes existía una única
// suscripción `suscribirTicketsPublicos` SIN límite, que traía TODOS los
// tickets del condominio a cada residente que abría el formulario. Con ~70
// tickets de prueba no se notaba, pero crece sin techo: con miles de reportes
// acumulados le quema los datos móviles al residente (justo el público rural de
// gama baja que el resto de la app cuida) y agota la cuota gratis de lecturas
// de Firestore (plan Spark) — la app se caería
// justo cuando empiece a usarse en serio.
// Bajado de 200 a 60 el 21-ago-2026. El cálculo que lo motivó: cada residente que
// abre el formulario paga estas lecturas, y la cuota gratis de Firestore son
// 50.000 al día. Con 200 activos + 10 recientes son ~210 lecturas por visita,
// o sea la app se queda sin cuota alrededor de la visita 240 y el mapa aparece
// en blanco hasta la medianoche. Con 60 el techo sube a ~700 visitas diarias.
//
// Por qué 60 alcanza: un condominio de 150 unidades no tiene decenas de
// solicitudes activas a la vez, así que la ventana ni se llena. Si un día se
// llena, la solución NO es agrandarla —vuelve el problema de cuota— sino
// consultar por categoría, que es lo que de verdad mira el detector de
// duplicados (buscarActivosPorCategoria, más abajo). Eso necesita un índice
// compuesto en Firestore.
// Bajado otra vez, de 60 a 25, cuando la detección de duplicados dejó de
// depender de esta ventana (ver buscarActivosPorCategoria). Ahora estos tickets
// cumplen una sola función: los pines que el residente ve en el mapa como
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
// para que se creen en el MISMO commit atómico que la solicitud (ver
// crearSolicitud). Antes esto se escribía por separado y antes que la
// solicitud — si la solicitud después era rechazada, el ticket quedaba
// huérfano: visible para los residentes en el mapa y en "Últimos reportes", pero
// invisible para el condominio, sin número entregado y sin WhatsApp. Había 7 en
// producción.
export function agregarTicketPublicoAlLote(lote, {
  numeroTicket,
  solicitudId,
  condominioId,
  categoria,
  nivelGravedad,
  direccionTexto,
  ubicacionPublica,
}) {
  lote.set(doc(db, COLECCIONES.TICKETS, numeroTicket), datosTicketPublico({
    solicitudId,
    condominioId,
    categoria,
    nivelGravedad,
    direccionTexto,
    ubicacionPublica,
  }))
}

// Lectura pública (allow get: if true en firestore.rules). La usa crearSolicitud
// para dos cosas que no se pueden resolver de otra forma desde un cliente sin
// login:
//  - distinguir una colisión de número de ticket de cualquier otro rechazo (todos
//    llegan como permission-denied, sin motivo);
//  - saber si un reintento de la cola offline ya está registrado, mirando si el
//    ticket apunta a ese mismo documento de solicitud (la solicitud en sí no se
//    puede leer sin ser usuario).
// Devuelve null también si falla la red: quien llama debe tratar "no sé" como
// "no reintentar a ciegas".
export async function obtenerTicketPublico(numeroTicket) {
  try {
    const snap = await getDoc(doc(db, COLECCIONES.TICKETS, numeroTicket))
    return snap.exists() ? snap.data() : null
  } catch (error) {
    console.error('[ticketsPublicosService] No se pudo leer el ticket público:', error)
    return null
  }
}

function datosTicketPublico({ solicitudId, condominioId, categoria, nivelGravedad, direccionTexto, ubicacionPublica }) {
  return {
    solicitud_id: solicitudId,
    condominio_id: condominioId,
    categoria,
    nivel_gravedad: nivelGravedad || null,
    // ESTA COLECCIÓN ES DE LECTURA PÚBLICA. Lo que entre acá lo puede leer
    // cualquiera que abra el link del condominio, así que solo entra lo que no
    // identifica a nadie:
    //
    //  - `ubicacion_publica` es SOLO el espacio común ("Piscina", "Ascensor
    //    Torre A"). La torre y el número de departamento NO viajan, y no es un
    //    olvido: en un condominio la unidad identifica al hogar, y "Torre B ·
    //    402 reportó ruidos molestos" es publicar quién acusó a quién entre
    //    vecinos que comparten el ascensor todos los días.
    //  - `detalles_adicionales` tampoco entra: es texto libre y puede nombrar
    //    personas.
    ...(ubicacionPublica ? { ubicacion_publica: ubicacionPublica } : {}),
    direccion_texto: direccionTexto || '',
    upvotes: 1,
    fotos_antes_urls: [],
    estado: 'Pendiente',
    calificacion_residente: null,
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

// Reportes ACTIVOS (sin resolver) de un condominio: alimenta los pines del
// mapa residente (tipo Waze) y el chequeo de proximidad al crear un reporte
// nuevo (ver utils/distancia.js). Solo trae campos no sensibles (mismo criterio
// que buscarTicketPublico), nunca nombre/contacto del residente.
//
// Acotado a los MAX_TICKETS_ACTIVOS más recientes. Los resueltos se excluyen en
// el servidor (antes se filtraban en memoria, después de haberlos descargado):
// son los que crecen sin techo con el tiempo, mientras que los activos se
// mantienen acotados solos a medida que el condominio va cerrando casos.
// Limitación aceptada: si un condominio llegara a acumular más de 200 reportes
// sin resolver, la detección de duplicados podría no ver los más antiguos —
// preferible a romper la app entera por cuota.
export function suscribirTicketsActivos(callback, condominioId) {
  if (!condominioId) {
    console.error('[ticketsPublicosService] suscribirTicketsActivos requiere condominioId.')
    return () => {}
  }

  return suscribir(
    [where('condominio_id', '==', condominioId), where('estado', 'in', ['Pendiente', 'En Proceso'])],
    MAX_TICKETS_ACTIVOS,
    callback,
    'tickets activos'
 )
}

// Últimos reportes de un condominio, de cualquier estado, del más reciente
// al más antiguo. Lo usan el listado "Últimos reportes de el condominio" del
// formulario residente (con un puñado) y la página pública de transparencia
// (con una ventana más grande, para calcular sus estadísticas).
export function suscribirUltimosTickets(callback, condominioId, cuantos = 10) {
  if (!condominioId) {
    console.error('[ticketsPublicosService] suscribirUltimosTickets requiere condominioId.')
    return () => {}
  }

  return suscribir(
    [where('condominio_id', '==', condominioId)],
    Math.min(cuantos, MAX_TICKETS_RECIENTES),
    callback,
    'últimos tickets'
 )
}

// Techo de la consulta puntual de duplicados. No es una suscripción: se dispara
// UNA vez, cuando el residente ya eligió categoría y ubicación y aprieta
// "Siguiente". 15 alcanza de sobra porque un duplicado es un fenómeno reciente
// —dos residentes reportan el mismo bache con horas o días de diferencia, no con
// meses—, y porque acá ya viene filtrado por categoría: son los 15 activos más
// nuevos DE ESA categoría, no 15 de todo el condominio.
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
// (cada residente la paga al abrir el formulario, reporte o no). Preguntar por
// categoría rompe ese empate: la detección mejora y las lecturas del mapa
// pueden seguir bajas.
//
// Devuelve null —no una lista vacía— cuando la consulta no se pudo hacer. Esa
// distinción es la que permite al llamador saber que NO tiene una respuesta y
// recurrir al método anterior, en vez de creer que no hay duplicados y dejar
// pasar uno.
export async function buscarActivosPorCategoria(condominioId, categoria) {
  if (!condominioId || !categoria) return null

  try {
    const q = query(
      ticketsPublicosRef,
      where('condominio_id', '==', condominioId),
      where('estado', 'in', ['Pendiente', 'En Proceso']),
      where('categoria', '==', categoria),
      orderBy('fecha_creacion', 'desc'),
      limitar(MAX_CANDIDATOS_DUPLICADO)
   )

    // Firestore reintenta indefinidamente cuando no hay señal, así que sin
    // límite esta promesa puede no resolverse nunca. Y esto corre justo cuando
    // el residente aprieta "Siguiente": dejarlo con el botón girando para siempre
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
    // failed-precondition = falta el índice compuesto (condominio_id, estado,
    // categoria, fecha_creacion). Se contempla a propósito: el índice se
    // despliega a mano y el sitio se publica solo al hacer merge, así que las
    // dos cosas pueden llegar en cualquier orden. Sin este catch, publicar
    // antes de que el índice terminara de construirse dejaría el formulario
    // roto para los residentes — que es exactamente el accidente que la documentación documentó.
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
// solicitudes/{id} (ver votarSolicitud en solicitudesService.js), esto es
// solo para que el mapa muestre el conteo actualizado.
export function incrementarUpvotesTicketPublico(numeroTicket) {
  if (!numeroTicket) return

  updateDoc(doc(db, COLECCIONES.TICKETS, numeroTicket), { upvotes: increment(1) }).catch((error) => {
    console.error('[ticketsPublicosService] No se pudo sincronizar el voto en el ticket público:', error)
  })
}

// Refleja la calificación ciudadana (1-5) en el ticket público, para que la
// propia página /estado sepa que ya se calificó sin tener que releer
// solicitudes (a la que el residente no tiene acceso de lectura). Best-effort,
// mismo criterio que incrementarUpvotesTicketPublico: la calificación real ya
// quedó guardada en solicitudes/{id} (ver calificarSolicitud).
export function actualizarCalificacionTicketPublico(numeroTicket, calificacion) {
  if (!numeroTicket) return

  updateDoc(doc(db, COLECCIONES.TICKETS, numeroTicket), { calificacion_residente: calificacion }).catch((error) => {
    console.error('[ticketsPublicosService] No se pudo sincronizar la calificación en el ticket público:', error)
  })
}

// Busca un ticket público por su número. Normaliza lo que el residente escribe
// a mano (espacios, puntos, guiones) — ver normalizarNumeroTicket, que también
// sigue reconociendo los tickets del formato antiguo. Devuelve null si no
// existe, no lanza error.
export async function buscarTicketPublico(numeroTicket) {
  const snap = await getDoc(doc(db, COLECCIONES.TICKETS, normalizarNumeroTicket(numeroTicket)))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// Refleja un cambio de estado (asignación / resolución) en el ticket público.
// Best-effort: si falla no debe bloquear la acción principal del usuario
// (mismo criterio que la subida de fotos en solicitudesService.js).
export function actualizarEstadoTicketPublico(numeroTicket, cambios) {
  if (!numeroTicket) return

  updateDoc(doc(db, COLECCIONES.TICKETS, numeroTicket), cambios).catch((error) => {
    console.error('[ticketsPublicosService] No se pudo sincronizar el ticket público:', error)
  })
}
