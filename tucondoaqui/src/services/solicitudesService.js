import {
  Timestamp,
  arrayUnion,
  collection,
  doc,
  getDocs,
  increment,
  limit as limitar,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db, COLECCIONES } from '../firebase/firebase'
import { subirImagen } from './storageService'
import { generarNumeroTicket } from '../utils/ticket'
import { calcularGravedad } from '../utils/gravedad'
import { calcularArea } from '../utils/areas'
import {
  agregarTicketPublicoAlLote,
  obtenerTicketPublico,
  actualizarEstadoTicketPublico,
  incrementarUpvotesTicketPublico,
  actualizarCalificacionTicketPublico,
} from './ticketsPublicosService'

const solicitudesRef = collection(db, COLECCIONES.SOLICITUDES)

// generarNumeroTicket() solo tiene ~65 536 combinaciones/día, así que puede
// colisionar con el ticket de OTRO reporte. Un puñado de reintentos alcanza y
// sobra para eso: si se agotan es que algo más (no una colisión) está fallando.
const MAX_INTENTOS_TICKET = 5

// Genera un ID de documento nuevo sin escribir nada todavía. Lo usa el
// formulario residente ANTES de intentar enviar, para poder reutilizar el
// mismo ID si el envío falla y hay que reintentar desde la cola offline
// (ver comentario de crearSolicitud sobre por qué esto importa).
export function generarIdSolicitud() {
  return doc(solicitudesRef).id
}

// Crea una nueva solicitud reportada por un residente.
// Estrategia: 1) generar el ID del documento del lado del cliente y hacer
// setDoc (en vez de addDoc con ID aleatorio del servidor) — esto hace la
// escritura IDEMPOTENTE: si un intento anterior quedó abandonado por un
// conTimeout (Firestore nunca cancela esa promesa, puede completarse solo
// minutos después) y en paralelo se reintenta desde la cola offline con el
// mismo idDocumento, el segundo simplemente sobrescribe el mismo documento
// en vez de crear uno duplicado.
// 2) subir la foto usando ese ID como carpeta en Storage,
// 3) actualizar el documento con la URL de la foto.
export async function crearSolicitud({
  categoria,
  // { tipo, torre, unidad, espacio_comun, etiqueta } — ver utils/unidades.js.
  // No hay coordenadas en este producto: todas las solicitudes de un condominio
  // comparten dirección, y el GPS no distingue el piso 3 del 12.
  ubicacion,
  direccionTexto,
  detallesAdicionales,
  fotosAntes,
  condominioId,
  nombreResidente,
  contactoResidente,
  esAnonimo,
  idDocumento,
  numeroTicketExistente,
  dispositivoId,
}) {
  if (!condominioId) {
    throw new Error('Falta el identificador del condominio.')
  }
  if (!dispositivoId) {
    throw new Error('Falta el identificador de dispositivo.')
  }

  const docRef = idDocumento ? doc(db, COLECCIONES.SOLICITUDES, idDocumento) : doc(solicitudesRef)
  const { nivel_gravedad, color_pin } = calcularGravedad(categoria)
  const area = calcularArea(categoria)

  let numeroTicket = numeroTicketExistente || generarNumeroTicket()
  const esRetry = Boolean(numeroTicketExistente)

  const datosSolicitud = (numeroTicket) => ({
    categoria,
    ubicacion: ubicacion || null,
    direccion_texto: direccionTexto || '',
    detalles_adicionales: detallesAdicionales || '',
    numero_ticket: numeroTicket,
    condominio_id: condominioId,
    nivel_gravedad,
    color_pin,
    area,
    nombre_residente: nombreResidente || '',
    contacto_residente: contactoResidente || '',
    // rut_residente se dejó de pedir el 02-ago-2026 para no manejar datos
    // personales sensibles sin necesidad. Los reportes antiguos que
    // ya lo tienen conservan el campo; los nuevos simplemente no lo escriben.
    es_anonimo: esAnonimo ?? true,
    fotos_antes_urls: [],
    foto_despues_url: '',
    estado: 'Pendiente',
    equipo_asignado: '',
    upvotes: 1,
    usuarios_afectados: [],
    presupuesto_estimado: null,
    gasto_real: null,
    calificacion_residente: null, // 1-5, la pone el residente desde /estado una vez Resuelto (ver calificarSolicitud)
    // Las banderas notificado_whatsapp_* las pone en true el bot al avisarle al
    // residente. OJO: hoy solo se usan dos, creación y resuelto —
    // notificado_whatsapp_asignacion y alertado_administracion se escriben pero NADIE
    // las consume, esas dos funciones se perdieron en la migración a la API
    // oficial de Meta.
    notificado_whatsapp_creacion: false,
    notificado_whatsapp_asignacion: false,
    notificado_whatsapp: false,
    alertado_administracion: false,
    // UUID aleatorio del navegador (utils/dispositivo.js), NO un dato personal:
    // es lo que permite aplicar el límite anti-spam del lado servidor. El mismo
    // valor ya se guardaba en usuarios_afectados al votar, así que no
    // expone nada nuevo — la app sigue siendo anónima salvo que el residente
    // decida dejar sus datos a propósito.
    dispositivo_id: dispositivoId,
    fecha_creacion: serverTimestamp(),
    fecha_asignacion: null,
    fecha_cierre: null,
  })

  // Reintento desde la cola offline: si el intento original sí alcanzó a
  // escribir (conTimeout se rindió a los 15 s, pero Firestore terminó después),
  // el ticket público ya existe y apunta a ESTE mismo documento. No hay nada que
  // reescribir —y no se podría: las reglas no dejan que un anónimo actualice una
  // solicitud ya creada— así que se devuelve como éxito para que la cola lo dé
  // por sincronizado en vez de reintentarlo para siempre.
  if (esRetry) {
    const yaRegistrado = await obtenerTicketPublico(numeroTicket)
    if (yaRegistrado?.solicitud_id === docRef.id) {
      console.info(`[solicitudesService] El reporte ${numeroTicket} ya estaba registrado desde el intento original.`)
      return { id: docRef.id, numeroTicket }
    }
  }

  // TODO se escribe en UN SOLO lote atómico: la solicitud, su ticket público y
  // la marca anti-spam del dispositivo. O quedan las tres, o no queda ninguna.
  //
  // Antes el ticket público se escribía aparte y ANTES que la solicitud. Cuando
  // la solicitud era rechazada —el caso real: el enfriamiento anti-spam
  // responde permission-denied— el ticket quedaba **huérfano**: aparecía en el
  // mapa y en "Últimos reportes de el condominio", hacía saltar el aviso de "posible
  // duplicado" al residente siguiente, y sin embargo el condominio no lo veía, el
  // residente no recibía su número y el bot no mandaba nada. Había 7 en producción
  // cuando se detectó.
  //
  // El lote también es lo que hace cumplible el anti-spam: firestore.rules exige
  // con getAfter() que dispositivos/{id} se selle en este mismo commit, así no
  // se puede saltar el límite simplemente no escribiendo la marca.
  // El techo del reintento va en el ENCABEZADO del for, no escondido dentro del
  // catch. Antes el límite existía igual (era una condición más del booleano que
  // decide si reintentar), pero ahí es frágil: basta que alguien reordene esa
  // condición o le agregue un `||` para que el techo desaparezca sin que nada lo
  // advierta, y esto corre en el celular del residente contra una base que se paga
  // por escritura. Un límite tiene que poder leerse de una.
  let creada = false

  for (let intento = 1; intento <= MAX_INTENTOS_TICKET && !creada; intento++) {
    const lote = writeBatch(db)
    agregarTicketPublicoAlLote(lote, {
      numeroTicket,
      solicitudId: docRef.id,
      condominioId,
      categoria,
      nivelGravedad: nivel_gravedad,
      direccionTexto,
      // Al ticket público SOLO viaja el espacio común. La torre y el número se
      // quedan en la solicitud, que únicamente ve la administración: en un
      // condominio la unidad identifica al hogar, y tickets_condominio es de
      // lectura pública.
      ubicacionPublica: ubicacion?.tipo === 'espacio_comun' ? ubicacion.espacio_comun : '',
    })
    lote.set(docRef, datosSolicitud(numeroTicket))
    lote.set(doc(db, COLECCIONES.DISPOSITIVOS, dispositivoId), { ultimo_reporte: serverTimestamp() })

    try {
      await lote.commit()
      creada = true
    } catch (error) {
      // Todo rechazo llega como permission-denied, sin decir por qué. La única
      // causa que se puede resolver reintentando es la colisión de número de
      // ticket, y se distingue mirando si ese ticket ya existe (lectura
      // pública). Cualquier otra —el enfriamiento anti-spam, un dato inválido—
      // sube tal cual: reintentar con otro número sería esconderla.
      const esColision =
        !esRetry &&
        error.code === 'permission-denied' &&
        Boolean(await obtenerTicketPublico(numeroTicket))

      if (!esColision) throw error

      console.warn(`[solicitudesService] El ticket ${numeroTicket} ya estaba tomado, generando otro (intento ${intento} de ${MAX_INTENTOS_TICKET}).`)
      numeroTicket = generarNumeroTicket()
    }
  }

  // Se agotaron los intentos y todos fueron colisiones. Con un millón de
  // números y ~90 tickets en uso esto es prácticamente imposible, así que si
  // ocurre no es mala suerte: es una señal de que algo más está mal (por
  // ejemplo, generarNumeroTicket devolviendo siempre lo mismo). El mensaje va
  // en español porque FormularioResidente lo muestra tal cual al residente.
  if (!creada) {
    const error = new Error('No pudimos asignarle un número a tu reporte. Intenta nuevamente en un momento.')
    error.esColisionRepetida = true
    throw error
  }

  if (fotosAntes?.length) {
    // Sin "await": la solicitud ya quedó registrada, así que el ticket se muestra de
    // inmediato. Cada foto sube en segundo plano por separado (hasta 3, opcional) —
    // arrayUnion() porque pueden terminar en cualquier orden y no deben pisarse entre sí.
    // Si alguna falla (ej. Cloudinary no configurado, mala conexión) no debe dejar al
    // residente esperando ni bloquear el ticket; las demás siguen su curso igual.
    fotosAntes.forEach((archivo, indice) => {
      subirImagen(archivo, `solicitudes/${docRef.id}/antes`)
        .then((url) => {
          // Los dos updates llevan su propio .catch() a propósito. Este es el
          // que importa (es la foto que ve el usuario), y ANTES no tenía
          // ninguno: firestore.rules rechazaba el update anónimo con
          // permission-denied, la promesa quedaba rechazada sin manejar, y la
          // foto simplemente no aparecía en el Dashboard sin que nada lo dijera.
          // La regla ya lo permite (ver esFotoResidenteValida en
          // firestore.rules), y si alguna vez vuelve a fallar ahora se ve.
          updateDoc(doc(db, COLECCIONES.SOLICITUDES, docRef.id), { fotos_antes_urls: arrayUnion(url) }).catch((error) => {
            console.error(
              `[solicitudesService] La foto ${indice + 1} se subió pero no se pudo guardar en la solicitud ${docRef.id}:`,
              error
           )
          })
          // El ticket público es best-effort (así el pin del mapa residente
          // también muestra la foto), pero el error se registra igual: un
          // catch vacío fue justamente lo que ocultó este mismo problema.
          updateDoc(doc(db, COLECCIONES.TICKETS, numeroTicket), { fotos_antes_urls: arrayUnion(url) }).catch((error) => {
            console.warn(`[solicitudesService] La foto ${indice + 1} no se reflejó en el ticket público ${numeroTicket}:`, error)
          })
        })
        .catch((error) => {
          console.error(`[solicitudesService] Solicitud creada pero falló la subida de la foto ${indice + 1}:`, error)
        })
    })
  }

  return { id: docRef.id, numeroTicket }
}

// Suscripción en tiempo real a solicitudes de UNA condominio, opcionalmente
// filtradas por estado. Devuelve la función de "unsubscribe" para el cleanup de un
// Techo de la ventana que cargan los paneles del condominio.
//
// Bug real, mismo patrón que el corregido el 02-ago-2026 en tickets_publicos
// (la documentación del proyecto) pero que quedó sin arreglar en esta colección: esta
// suscripción no tenía limit(), así que cada vez que un usuario abría su
// panel se descargaba el histórico COMPLETO del condominio. Con 1.000
// solicitudes acumuladas son 1.000 lecturas por apertura: cuatro usuarios
// abriendo el panel ocho veces al día se comen 32.000 de las 50.000 lecturas
// diarias del plan Spark, antes de que entre un solo residente.
//
// 500 es holgado para operar —lo que un condominio chico acumula en meses— y
// deja margen de sobra bajo la cuota. Cuando la ventana se llena, lo que deja
// de ser cierto son los totales "de siempre": por eso se exporta la constante y
// quien muestre un acumulado tiene que decir que está acotado (ver
// reporteGerencial.js y PanelIndicadores.jsx), en vez de presentar una cifra
// parcial como si fuera el histórico completo. Mismo criterio que la documentación aplicó en
// la página de transparencia.
//
// Los dos índices que esto necesita YA existen en firestore.indexes.json
// —(condominio_id, fecha_creacion DESC) y (condominio_id, estado, fecha_creacion
// DESC)—, así que este cambio no requiere desplegar índices.
export const MAX_SOLICITUDES_PANEL = 500

// useEffect. Si no se indica condominioId, no se corre ninguna query (evita que un bug
// de llamada filtre datos de todas los condominios a la vez).
export function suscribirSolicitudes(callback, estado = null, condominioId = null) {
  if (!condominioId) {
    console.error('[solicitudesService] suscribirSolicitudes requiere condominioId.')
    return () => {}
  }

  const condiciones = estado
    ? [where('condominio_id', '==', condominioId), where('estado', '==', estado)]
    : [where('condominio_id', '==', condominioId)]

  const q = query(
    solicitudesRef,
    ...condiciones,
    orderBy('fecha_creacion', 'desc'),
    limitar(MAX_SOLICITUDES_PANEL)
 )

  return onSnapshot(
    q,
    (snapshot) => {
      const solicitudes = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      callback(solicitudes)
    },
    (error) => {
      console.error('[solicitudesService] Error al escuchar solicitudes:', error)
    }
 )
}

// Lectura de UNA vez (no suscripción) de las solicitudes de un período, para
// generar la Cuenta Pública (ver CuentaPublicaPage.jsx). Un informe es una foto
// de un momento, no algo que deba actualizarse en vivo mientras se imprime —
// por eso getDocs y no onSnapshot.
// Acotada por fechas, así el peso de la consulta no crece con el histórico
// completo del condominio (mismo criterio que la documentación).
export async function obtenerSolicitudesPorPeriodo(condominioId, desde, hasta) {
  if (!condominioId) {
    console.error('[solicitudesService] obtenerSolicitudesPorPeriodo requiere condominioId.')
    return []
  }

  const q = query(
    solicitudesRef,
    where('condominio_id', '==', condominioId),
    where('fecha_creacion', '>=', Timestamp.fromDate(desde)),
    where('fecha_creacion', '<=', Timestamp.fromDate(hasta)),
    orderBy('fecha_creacion', 'desc')
 )

  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// Asigna un equipo y cambia el estado a "En Proceso" (antes "Asignado").
// Recibe la solicitud completa (no solo el id) porque necesita numero_ticket para
// reflejar el cambio en el ticket público de consulta.
// presupuestoEstimado es opcional: solo lo llena el Jefe de Area vía
// ModalPresupuesto (ver PanelGestionArea.jsx) — cuando asigna el Administrador
// desde el Dashboard General (PanelAsignacion.jsx) se omite, y presupuesto_estimado
// queda en null (ver Órdenes de Trabajo y Costeo).
// fecha_asignacion se guarda la PRIMERA vez, la asigne quien la asigne — es lo
// que permite calcular el "tiempo de reacción" (fecha_asignacion -
// fecha_creacion). Una reasignación posterior NO la reescribe (ver abajo).
export async function asignarEquipo(solicitud, equipo, presupuestoEstimado = null) {
  if (!equipo) {
    throw new Error('Debes indicar el nombre de el equipo.')
  }

  const cambios = {
    estado: 'En Proceso',
    equipo_asignado: equipo,
  }

  // La fecha de asignación se escribe SOLO la primera vez. Es lo que mide el
  // tiempo de reacción del condominio (fecha_asignacion - fecha_creacion) y lo
  // que alimenta la tarjeta de "atrasados" del panel del Administrador, así que
  // reescribirla al reasignar dejaba un caso de hace dos semanas pareciendo
  // recién tomado — el indicador mejoraba solo por apretar un botón. Cambiar de
  // equipo es un hecho posterior y se guarda aparte, sin tocar el reloj.
  if (!solicitud.fecha_asignacion) {
    cambios.fecha_asignacion = serverTimestamp()
  } else {
    cambios.fecha_reasignacion = serverTimestamp()
  }

  if (presupuestoEstimado) {
    cambios.presupuesto_estimado = presupuestoEstimado
  }

  await updateDoc(doc(db, COLECCIONES.SOLICITUDES, solicitud.id), cambios)

  actualizarEstadoTicketPublico(solicitud.numero_ticket, { estado: 'En Proceso' })
}

// Usado por la Vista Equipo Terreno y por el Jefe de Area (cuando resuelve
// directo): cierra la solicitud y, si se adjuntaron, sube la foto de "después" y el
// comprobante de materiales. Ambas fotos son opcionales (igual que en el reporte del
// residente) para no bloquear el cierre si Storage no está disponible; gastoReal SÍ es
// obligatorio (horas_reales/costo_final/materiales_usados, ver FormularioCierreGasto.jsx)
// — alimenta el KPI financiero del Administrador (ResumenGastoMensual.jsx), así que ambas
// vistas de cierre validan estos campos en el formulario antes de llamar a esta función,
// y firestore.rules los vuelve a validar del lado del servidor (gastoRealValido).
// Recibe la solicitud completa (no solo el id) por la misma razón que asignarEquipo.
export async function marcarResuelto(solicitud, fotoDespues, comprobante, gastoReal) {
  const fechaCierre = serverTimestamp()

  await updateDoc(doc(db, COLECCIONES.SOLICITUDES, solicitud.id), {
    estado: 'Resuelto',
    fecha_cierre: fechaCierre,
    gasto_real: gastoReal,
  })

  actualizarEstadoTicketPublico(solicitud.numero_ticket, { estado: 'Resuelto', fecha_cierre: fechaCierre })

  if (fotoDespues) {
    // Sin "await": la solicitud ya quedó marcada como resuelta. Si Storage no está
    // disponible o la conexión falla, no debe dejar a el equipo esperando.
    // También se copia a tickets_publicos (mismo criterio que fotos_antes_urls en
    // crearSolicitud): es lo único que el residente puede leer sin login, así que
    // sin esto la foto de término nunca le llega, ni por WhatsApp (que enlaza a
    // /estado) ni entrando directo a consultar su ticket.
    subirImagen(fotoDespues, `solicitudes/${solicitud.id}/despues`)
      .then((url) => {
        updateDoc(doc(db, COLECCIONES.SOLICITUDES, solicitud.id), { foto_despues_url: url })
        actualizarEstadoTicketPublico(solicitud.numero_ticket, { foto_despues_url: url })
      })
      .catch((error) => {
        console.error('[solicitudesService] Solicitud resuelta pero falló la subida de foto:', error)
      })
  }

  if (comprobante) {
    subirImagen(comprobante, `solicitudes/${solicitud.id}/comprobante`)
      .then((url) => updateDoc(doc(db, COLECCIONES.SOLICITUDES, solicitud.id), { 'gasto_real.comprobante_url': url }))
      .catch((error) => {
        console.error('[solicitudesService] Solicitud resuelta pero falló la subida del comprobante:', error)
      })
  }
}

// Voto del residente, tipo "+1 / a mí también me afecta" (ver
// AvisoPosibleDuplicado.jsx). Sin login, así que
// dispositivoId es un ID generado en el navegador (utils/dispositivo.js), no
// un usuario real — evita el doble-click y el doble voto desde el mismo
// dispositivo, no es una garantía a prueba de abuso (ver ese archivo).
// Usa increment()/arrayUnion() (atómico) en vez de leer-sumar-escribir, que se
// rompe con votos simultáneos. firestore.rules exige que este update SOLO
// toque upvotes/usuarios_afectados y que ambos avancen en exactamente 1 — así
// un voto no puede además alterar categoria, estado, etc.
export async function votarSolicitud({ solicitudId, numeroTicket, dispositivoId }) {
  await updateDoc(doc(db, COLECCIONES.SOLICITUDES, solicitudId), {
    upvotes: increment(1),
    usuarios_afectados: arrayUnion(dispositivoId),
  })

  incrementarUpvotesTicketPublico(numeroTicket)
}

// Calificación ciudadana post-resolución (1-5 estrellas), desde /estado, sin
// login. Mismo mecanismo que votarSolicitud: el residente nunca leyó
// solicitudes/{id} directamente (no tiene permiso), pero SÍ conoce su id
// porque tickets_publicos.{numeroTicket}.solicitud_id es público — construye
// el update a ciegas contra ese id. firestore.rules (esCalificacionValida)
// exige que la solicitud ya esté Resuelto, que no tuviera calificación previa,
// y que el update toque solo este campo con un valor entre 1 y 5.
export async function calificarSolicitud({ solicitudId, numeroTicket, calificacion }) {
  await updateDoc(doc(db, COLECCIONES.SOLICITUDES, solicitudId), {
    calificacion_residente: calificacion,
  })

  actualizarCalificacionTicketPublico(numeroTicket, calificacion)
}
