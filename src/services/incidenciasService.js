import {
  arrayUnion,
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, COLECCIONES } from '../firebase/firebase'
import { subirImagen } from './storageService'
import { generarNumeroTicket } from '../utils/ticket'
import { calcularGravedad } from '../utils/gravedad'
import { calcularDepartamento } from '../utils/departamento'
import {
  registrarTicketPublico,
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
  rutCiudadano,
  esAnonimo,
  idDocumento,
  numeroTicketExistente,
}) {
  if (!municipioId) {
    throw new Error('Falta el identificador de la municipalidad.')
  }

  const docRef = idDocumento ? doc(db, COLECCIONES.INCIDENCIAS, idDocumento) : doc(incidenciasRef)
  const { nivel_gravedad, color_pin } = calcularGravedad(categoria)
  const departamento = calcularDepartamento(categoria)

  // Registra (o confirma) el ticket público ANTES de escribir la incidencia: si
  // numeroTicketExistente choca con el ticket de otro reporte, hay que resolver
  // eso primero para no dejar la incidencia con un numero_ticket que en realidad
  // le pertenece a otra persona.
  let numeroTicket = numeroTicketExistente || generarNumeroTicket()
  const esRetry = Boolean(numeroTicketExistente)

  for (let intento = 1; ; intento++) {
    try {
      await registrarTicketPublico({
        numeroTicket,
        incidenciaId: docRef.id,
        municipioId,
        categoria,
        nivelGravedad: nivel_gravedad,
        coordenadas,
        esRetry,
      })
      break
    } catch (error) {
      // Un reintento offline nunca debe generar un ticket nuevo (el ciudadano ya
      // anotó el que se le mostró); si choca por otra razón que no sea colisión,
      // o si ya se agotaron los intentos, hay que dejar que el error suba.
      if (esRetry || error.code !== 'permission-denied' || intento >= MAX_INTENTOS_TICKET) {
        throw error
      }
      numeroTicket = generarNumeroTicket()
    }
  }

  await setDoc(docRef, {
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
    rut_ciudadano: rutCiudadano || '',
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
    // Las 3 banderas de notificado_whatsapp_* las pone en true el bot (whatsapp-bot/)
    // tras avisar al vecino por WhatsApp en cada momento del ciclo de vida —
    // creación, asignación de cuadrilla, y resuelto (ver ESTADO_PROYECTO.md §23).
    notificado_whatsapp_creacion: false,
    notificado_whatsapp_asignacion: false,
    notificado_whatsapp: false,
    fecha_creacion: serverTimestamp(),
    fecha_asignacion: null,
    fecha_cierre: null,
  })

  if (fotosAntes?.length) {
    // Sin "await": la incidencia ya quedó registrada, así que el ticket se muestra de
    // inmediato. Cada foto sube en segundo plano por separado (hasta 3, opcional) —
    // arrayUnion() porque pueden terminar en cualquier orden y no deben pisarse entre sí.
    // Si alguna falla (ej. Cloudinary no configurado, mala conexión) no debe dejar al
    // ciudadano esperando ni bloquear el ticket; las demás siguen su curso igual.
    fotosAntes.forEach((archivo, indice) => {
      subirImagen(archivo, `incidencias/${docRef.id}/antes`)
        .then((url) => {
          updateDoc(doc(db, COLECCIONES.INCIDENCIAS, docRef.id), { fotos_antes_urls: arrayUnion(url) })
          // Best-effort, igual que el resto de la sincronización con el ticket público:
          // así el mapa ciudadano también puede mostrar la foto en el pin.
          updateDoc(doc(db, COLECCIONES.TICKETS_PUBLICOS, numeroTicket), { fotos_antes_urls: arrayUnion(url) }).catch(() => {})
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
// directo): cierra la incidencia y, si se adjuntó, sube la foto de "después". La foto
// es opcional (igual que en el reporte del ciudadano) para no bloquear el cierre si
// Storage no está disponible; gastoReal SÍ es obligatorio (horas_reales/costo_final)
// — alimenta el KPI financiero del Alcalde (ResumenGastoMensual.jsx), así que ambas
// vistas de cierre validan estos campos en el formulario antes de llamar a esta función.
// Recibe la incidencia completa (no solo el id) por la misma razón que asignarCuadrilla.
export async function marcarResuelto(incidencia, fotoDespues, gastoReal) {
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
    subirImagen(fotoDespues, `incidencias/${incidencia.id}/despues`)
      .then((url) => updateDoc(doc(db, COLECCIONES.INCIDENCIAS, incidencia.id), { foto_despues_url: url }))
      .catch((error) => {
        console.error('[incidenciasService] Incidencia resuelta pero falló la subida de foto:', error)
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
