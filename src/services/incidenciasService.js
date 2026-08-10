import {
  Timestamp,
  arrayUnion,
  collection,
  doc,
  getDocs,
  increment,
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
import { calcularDepartamento } from '../utils/departamento'
import {
  agregarTicketPublicoAlLote,
  obtenerTicketPublico,
  actualizarEstadoTicketPublico,
  incrementarUpvotesTicketPublico,
  actualizarCalificacionTicketPublico,
} from './ticketsPublicosService'

const incidenciasRef = collection(db, COLECCIONES.INCIDENCIAS)

// generarNumeroTicket() solo tiene ~65 536 combinaciones/día, así que puede
// colisionar con el ticket de OTRO reporte. Un puñado de reintentos alcanza y
// sobra para eso: si se agotan es que algo más (no una colisión) está fallando.
const MAX_INTENTOS_TICKET = 5

// Genera un ID de documento nuevo sin escribir nada todavía. Lo usa el
// formulario ciudadano ANTES de intentar enviar, para poder reutilizar el
// mismo ID si el envío falla y hay que reintentar desde la cola offline
// (ver comentario de crearIncidencia sobre por qué esto importa).
export function generarIdIncidencia() {
  return doc(incidenciasRef).id
}

// Crea una nueva incidencia reportada por un ciudadano.
// Estrategia: 1) generar el ID del documento del lado del cliente y hacer
// setDoc (en vez de addDoc con ID aleatorio del servidor) — esto hace la
// escritura IDEMPOTENTE: si un intento anterior quedó abandonado por un
// conTimeout (Firestore nunca cancela esa promesa, puede completarse solo
// minutos después) y en paralelo se reintenta desde la cola offline con el
// mismo idDocumento, el segundo simplemente sobrescribe el mismo documento
// en vez de crear uno duplicado.
// 2) subir la foto usando ese ID como carpeta en Storage,
// 3) actualizar el documento con la URL de la foto.
export async function crearIncidencia({
  categoria,
  coordenadas,
  direccionTexto,
  detallesAdicionales,
  fotosAntes,
  municipioId,
  nombreCiudadano,
  contactoCiudadano,
  esAnonimo,
  idDocumento,
  numeroTicketExistente,
  dispositivoId,
}) {
  if (!municipioId) {
    throw new Error('Falta el identificador de la municipalidad.')
  }
  if (!dispositivoId) {
    throw new Error('Falta el identificador de dispositivo.')
  }

  const docRef = idDocumento ? doc(db, COLECCIONES.INCIDENCIAS, idDocumento) : doc(incidenciasRef)
  const { nivel_gravedad, color_pin } = calcularGravedad(categoria)
  const departamento = calcularDepartamento(categoria)

  let numeroTicket = numeroTicketExistente || generarNumeroTicket()
  const esRetry = Boolean(numeroTicketExistente)

  const datosIncidencia = (numeroTicket) => ({
    categoria,
    coordenadas,
    direccion_texto: direccionTexto || '',
    detalles_adicionales: detallesAdicionales || '',
    numero_ticket: numeroTicket,
    municipio_id: municipioId,
    nivel_gravedad,
    color_pin,
    departamento,
    nombre_ciudadano: nombreCiudadano || '',
    contacto_ciudadano: contactoCiudadano || '',
    // rut_ciudadano se dejó de pedir el 02-ago-2026 para no manejar datos
    // personales sensibles sin necesidad (ver §29). Los reportes antiguos que
    // ya lo tienen conservan el campo; los nuevos simplemente no lo escriben.
    es_anonimo: esAnonimo ?? true,
    fotos_antes_urls: [],
    foto_despues_url: '',
    estado: 'Pendiente',
    cuadrilla_asignada: '',
    upvotes: 1,
    usuarios_afectados: [],
    presupuesto_estimado: null,
    gasto_real: null,
    calificacion_ciudadano: null, // 1-5, la pone el ciudadano desde /estado una vez Resuelto (ver calificarIncidencia)
    // Las banderas notificado_whatsapp_* las pone en true el bot al avisarle al
    // vecino (ver §39). OJO: hoy solo se usan dos, creación y resuelto —
    // notificado_whatsapp_asignacion y alertado_alcalde se escriben pero NADIE
    // las consume, esas dos funciones se perdieron en la migración a la API
    // oficial de Meta (ver §39.3).
    notificado_whatsapp_creacion: false,
    notificado_whatsapp_asignacion: false,
    notificado_whatsapp: false,
    alertado_alcalde: false,
    // UUID aleatorio del navegador (utils/dispositivo.js), NO un dato personal:
    // es lo que permite aplicar el límite anti-spam del lado servidor. El mismo
    // valor ya se guardaba en usuarios_afectados al votar (§16), así que no
    // expone nada nuevo — la app sigue siendo anónima salvo que el vecino
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
  // incidencia ya creada— así que se devuelve como éxito para que la cola lo dé
  // por sincronizado en vez de reintentarlo para siempre.
  if (esRetry) {
    const yaRegistrado = await obtenerTicketPublico(numeroTicket)
    if (yaRegistrado?.incidencia_id === docRef.id) {
      console.info(`[incidenciasService] El reporte ${numeroTicket} ya estaba registrado desde el intento original.`)
      return { id: docRef.id, numeroTicket }
    }
  }

  // TODO se escribe en UN SOLO lote atómico: la incidencia, su ticket público y
  // la marca anti-spam del dispositivo. O quedan las tres, o no queda ninguna.
  //
  // Antes el ticket público se escribía aparte y ANTES que la incidencia. Cuando
  // la incidencia era rechazada —el caso real: el enfriamiento anti-spam
  // responde permission-denied— el ticket quedaba **huérfano**: aparecía en el
  // mapa y en "Últimos reportes de la comuna", hacía saltar el aviso de "posible
  // duplicado" al vecino siguiente, y sin embargo el municipio no lo veía, el
  // vecino no recibía su número y el bot no mandaba nada. Había 7 en producción
  // cuando se detectó (ver §40).
  //
  // El lote también es lo que hace cumplible el anti-spam: firestore.rules exige
  // con getAfter() que dispositivos/{id} se selle en este mismo commit, así no
  // se puede saltar el límite simplemente no escribiendo la marca (§28).
  for (let intento = 1; ; intento++) {
    const lote = writeBatch(db)
    agregarTicketPublicoAlLote(lote, {
      numeroTicket,
      incidenciaId: docRef.id,
      municipioId,
      categoria,
      nivelGravedad: nivel_gravedad,
      coordenadas,
      direccionTexto,
    })
    lote.set(docRef, datosIncidencia(numeroTicket))
    lote.set(doc(db, COLECCIONES.DISPOSITIVOS, dispositivoId), { ultimo_reporte: serverTimestamp() })

    try {
      await lote.commit()
      break
    } catch (error) {
      // Todo rechazo llega como permission-denied, sin decir por qué. La única
      // causa que se puede resolver reintentando es la colisión de número de
      // ticket, y se distingue mirando si ese ticket ya existe (lectura
      // pública). Cualquier otra —el enfriamiento anti-spam, un dato inválido—
      // sube tal cual: reintentar con otro número sería esconderla.
      const esColision =
        !esRetry &&
        error.code === 'permission-denied' &&
        intento < MAX_INTENTOS_TICKET &&
        Boolean(await obtenerTicketPublico(numeroTicket))

      if (!esColision) throw error

      console.warn(`[incidenciasService] El ticket ${numeroTicket} ya estaba tomado, generando otro (intento ${intento}).`)
      numeroTicket = generarNumeroTicket()
    }
  }

  if (fotosAntes?.length) {
    // Sin "await": la incidencia ya quedó registrada, así que el ticket se muestra de
    // inmediato. Cada foto sube en segundo plano por separado (hasta 3, opcional) —
    // arrayUnion() porque pueden terminar en cualquier orden y no deben pisarse entre sí.
    // Si alguna falla (ej. Cloudinary no configurado, mala conexión) no debe dejar al
    // ciudadano esperando ni bloquear el ticket; las demás siguen su curso igual.
    fotosAntes.forEach((archivo, indice) => {
      subirImagen(archivo, `incidencias/${docRef.id}/antes`)
        .then((url) => {
          // Los dos updates llevan su propio .catch() a propósito. Este es el
          // que importa (es la foto que ve el funcionario), y ANTES no tenía
          // ninguno: firestore.rules rechazaba el update anónimo con
          // permission-denied, la promesa quedaba rechazada sin manejar, y la
          // foto simplemente no aparecía en el Dashboard sin que nada lo dijera.
          // La regla ya lo permite (ver esFotoCiudadanoValida en
          // firestore.rules), y si alguna vez vuelve a fallar ahora se ve.
          updateDoc(doc(db, COLECCIONES.INCIDENCIAS, docRef.id), { fotos_antes_urls: arrayUnion(url) }).catch((error) => {
            console.error(
              `[incidenciasService] La foto ${indice + 1} se subió pero no se pudo guardar en la incidencia ${docRef.id}:`,
              error
            )
          })
          // El ticket público es best-effort (así el pin del mapa ciudadano
          // también muestra la foto), pero el error se registra igual: un
          // catch vacío fue justamente lo que ocultó este mismo problema.
          updateDoc(doc(db, COLECCIONES.TICKETS_PUBLICOS, numeroTicket), { fotos_antes_urls: arrayUnion(url) }).catch((error) => {
            console.warn(`[incidenciasService] La foto ${indice + 1} no se reflejó en el ticket público ${numeroTicket}:`, error)
          })
        })
        .catch((error) => {
          console.error(`[incidenciasService] Incidencia creada pero falló la subida de la foto ${indice + 1}:`, error)
        })
    })
  }

  return { id: docRef.id, numeroTicket }
}

// Suscripción en tiempo real a incidencias de UNA municipalidad, opcionalmente
// filtradas por estado. Devuelve la función de "unsubscribe" para el cleanup de un
// useEffect. Si no se indica municipioId, no se corre ninguna query (evita que un bug
// de llamada filtre datos de todas las municipalidades a la vez).
export function suscribirIncidencias(callback, estado = null, municipioId = null) {
  if (!municipioId) {
    console.error('[incidenciasService] suscribirIncidencias requiere municipioId.')
    return () => {}
  }

  const condiciones = estado
    ? [where('municipio_id', '==', municipioId), where('estado', '==', estado)]
    : [where('municipio_id', '==', municipioId)]

  const q = query(incidenciasRef, ...condiciones, orderBy('fecha_creacion', 'desc'))

  return onSnapshot(
    q,
    (snapshot) => {
      const incidencias = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      callback(incidencias)
    },
    (error) => {
      console.error('[incidenciasService] Error al escuchar incidencias:', error)
    }
  )
}

// Lectura de UNA vez (no suscripción) de las incidencias de un período, para
// generar la Cuenta Pública (ver CuentaPublicaPage.jsx). Un informe es una foto
// de un momento, no algo que deba actualizarse en vivo mientras se imprime —
// por eso getDocs y no onSnapshot.
// Acotada por fechas, así el peso de la consulta no crece con el histórico
// completo del municipio (mismo criterio que §26).
export async function obtenerIncidenciasPorPeriodo(municipioId, desde, hasta) {
  if (!municipioId) {
    console.error('[incidenciasService] obtenerIncidenciasPorPeriodo requiere municipioId.')
    return []
  }

  const q = query(
    incidenciasRef,
    where('municipio_id', '==', municipioId),
    where('fecha_creacion', '>=', Timestamp.fromDate(desde)),
    where('fecha_creacion', '<=', Timestamp.fromDate(hasta)),
    orderBy('fecha_creacion', 'desc')
  )

  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// Asigna una cuadrilla y cambia el estado a "En Proceso" (antes "Asignado").
// Recibe la incidencia completa (no solo el id) porque necesita numero_ticket para
// reflejar el cambio en el ticket público de consulta.
// presupuestoEstimado es opcional: solo lo llena el Jefe de Departamento vía
// ModalPresupuesto (ver PanelGestionDepartamento.jsx) — cuando asigna el Alcalde
// desde el Dashboard General (PanelAsignacion.jsx) se omite, y presupuesto_estimado
// queda en null (ver Órdenes de Trabajo y Costeo en ESTADO_PROYECTO.md).
// fecha_asignacion se guarda siempre (la asigne quien la asigne) — es lo que
// permite calcular el "tiempo de reacción" (fecha_asignacion - fecha_creacion).
export async function asignarCuadrilla(incidencia, cuadrilla, presupuestoEstimado = null) {
  if (!cuadrilla) {
    throw new Error('Debes indicar el nombre de la cuadrilla.')
  }

  const cambios = {
    estado: 'En Proceso',
    cuadrilla_asignada: cuadrilla,
    fecha_asignacion: serverTimestamp(),
  }
  if (presupuestoEstimado) {
    cambios.presupuesto_estimado = presupuestoEstimado
  }

  await updateDoc(doc(db, COLECCIONES.INCIDENCIAS, incidencia.id), cambios)

  actualizarEstadoTicketPublico(incidencia.numero_ticket, { estado: 'En Proceso' })
}

// Usado por la Vista Cuadrilla Terreno y por el Jefe de Departamento (cuando resuelve
// directo): cierra la incidencia y, si se adjuntaron, sube la foto de "después" y el
// comprobante de materiales. Ambas fotos son opcionales (igual que en el reporte del
// ciudadano) para no bloquear el cierre si Storage no está disponible; gastoReal SÍ es
// obligatorio (horas_reales/costo_final/materiales_usados, ver FormularioCierreGasto.jsx)
// — alimenta el KPI financiero del Alcalde (ResumenGastoMensual.jsx), así que ambas
// vistas de cierre validan estos campos en el formulario antes de llamar a esta función,
// y firestore.rules los vuelve a validar del lado del servidor (gastoRealValido).
// Recibe la incidencia completa (no solo el id) por la misma razón que asignarCuadrilla.
export async function marcarResuelto(incidencia, fotoDespues, comprobante, gastoReal) {
  const fechaCierre = serverTimestamp()

  await updateDoc(doc(db, COLECCIONES.INCIDENCIAS, incidencia.id), {
    estado: 'Resuelto',
    fecha_cierre: fechaCierre,
    gasto_real: gastoReal,
  })

  actualizarEstadoTicketPublico(incidencia.numero_ticket, { estado: 'Resuelto', fecha_cierre: fechaCierre })

  if (fotoDespues) {
    // Sin "await": la incidencia ya quedó marcada como resuelta. Si Storage no está
    // disponible o la conexión falla, no debe dejar a la cuadrilla esperando.
    // También se copia a tickets_publicos (mismo criterio que fotos_antes_urls en
    // crearIncidencia): es lo único que el ciudadano puede leer sin login, así que
    // sin esto la foto de término nunca le llega, ni por WhatsApp (que enlaza a
    // /estado) ni entrando directo a consultar su ticket.
    subirImagen(fotoDespues, `incidencias/${incidencia.id}/despues`)
      .then((url) => {
        updateDoc(doc(db, COLECCIONES.INCIDENCIAS, incidencia.id), { foto_despues_url: url })
        actualizarEstadoTicketPublico(incidencia.numero_ticket, { foto_despues_url: url })
      })
      .catch((error) => {
        console.error('[incidenciasService] Incidencia resuelta pero falló la subida de foto:', error)
      })
  }

  if (comprobante) {
    subirImagen(comprobante, `incidencias/${incidencia.id}/comprobante`)
      .then((url) => updateDoc(doc(db, COLECCIONES.INCIDENCIAS, incidencia.id), { 'gasto_real.comprobante_url': url }))
      .catch((error) => {
        console.error('[incidenciasService] Incidencia resuelta pero falló la subida del comprobante:', error)
      })
  }
}

// Voto ciudadano tipo "+1 / a mí también me afecta" (ver §RBAC... no, ver
// AvisoPosibleDuplicado.jsx / MapaSeleccionUbicacion.jsx). Sin login, así que
// dispositivoId es un ID generado en el navegador (utils/dispositivo.js), no
// un usuario real — evita el doble-click y el doble voto desde el mismo
// dispositivo, no es una garantía a prueba de abuso (ver ese archivo).
// Usa increment()/arrayUnion() (atómico) en vez de leer-sumar-escribir, que se
// rompe con votos simultáneos. firestore.rules exige que este update SOLO
// toque upvotes/usuarios_afectados y que ambos avancen en exactamente 1 — así
// un voto no puede además alterar categoria, estado, etc.
export async function votarIncidencia({ incidenciaId, numeroTicket, dispositivoId }) {
  await updateDoc(doc(db, COLECCIONES.INCIDENCIAS, incidenciaId), {
    upvotes: increment(1),
    usuarios_afectados: arrayUnion(dispositivoId),
  })

  incrementarUpvotesTicketPublico(numeroTicket)
}

// Calificación ciudadana post-resolución (1-5 estrellas), desde /estado, sin
// login. Mismo mecanismo que votarIncidencia: el ciudadano nunca leyó
// incidencias/{id} directamente (no tiene permiso), pero SÍ conoce su id
// porque tickets_publicos.{numeroTicket}.incidencia_id es público — construye
// el update a ciegas contra ese id. firestore.rules (esCalificacionValida)
// exige que la incidencia ya esté Resuelto, que no tuviera calificación previa,
// y que el update toque solo este campo con un valor entre 1 y 5.
export async function calificarIncidencia({ incidenciaId, numeroTicket, calificacion }) {
  await updateDoc(doc(db, COLECCIONES.INCIDENCIAS, incidenciaId), {
    calificacion_ciudadano: calificacion,
  })

  actualizarCalificacionTicketPublico(numeroTicket, calificacion)
}
