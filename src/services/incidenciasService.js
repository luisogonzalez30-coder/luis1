import {
  collection,
  doc,
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
import { registrarTicketPublico, actualizarEstadoTicketPublico } from './ticketsPublicosService'

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
  fotoAntes,
  municipioId,
  nombreCiudadano,
  contactoCiudadano,
  esAnonimo,
  idDocumento,
  numeroTicketExistente,
}) {
  if (!municipioId) {
    throw new Error('Falta el identificador de la municipalidad.')
  }

  const docRef = idDocumento ? doc(db, COLECCIONES.INCIDENCIAS, idDocumento) : doc(incidenciasRef)
  const { nivel_gravedad, color_pin } = calcularGravedad(categoria)

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
    nombre_ciudadano: nombreCiudadano || '',
    contacto_ciudadano: contactoCiudadano || '',
    es_anonimo: esAnonimo ?? true,
    foto_antes_url: '',
    foto_despues_url: '',
    estado: 'Pendiente',
    cuadrilla_asignada: '',
    fecha_creacion: serverTimestamp(),
    fecha_cierre: null,
  })

  if (fotoAntes) {
    // Sin "await": la incidencia ya quedó registrada, así que el ticket se muestra de
    // inmediato. La foto sube en segundo plano; si falla (ej. Storage no habilitado en
    // el proyecto, o mala conexión) no debe dejar al ciudadano esperando ni bloquear el ticket.
    subirImagen(fotoAntes, `incidencias/${docRef.id}/antes`)
      .then((url) => updateDoc(doc(db, COLECCIONES.INCIDENCIAS, docRef.id), { foto_antes_url: url }))
      .catch((error) => {
        console.error('[incidenciasService] Incidencia creada pero falló la subida de foto:', error)
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

// Usado por el Dashboard DOM: asigna una cuadrilla y cambia el estado a "Asignado".
// Recibe la incidencia completa (no solo el id) porque necesita numero_ticket para
// reflejar el cambio en el ticket público de consulta.
export async function asignarCuadrilla(incidencia, cuadrilla) {
  if (!cuadrilla) {
    throw new Error('Debes indicar el nombre de la cuadrilla.')
  }

  await updateDoc(doc(db, COLECCIONES.INCIDENCIAS, incidencia.id), {
    estado: 'Asignado',
    cuadrilla_asignada: cuadrilla,
  })

  actualizarEstadoTicketPublico(incidencia.numero_ticket, { estado: 'Asignado' })
}

// Usado por la Vista Cuadrilla Terreno: cierra la incidencia y, si se adjuntó, sube
// la foto de "después". La foto es opcional (igual que en el reporte del ciudadano)
// para no bloquear el cierre si Storage no está disponible en el proyecto.
// Recibe la incidencia completa (no solo el id) por la misma razón que asignarCuadrilla.
export async function marcarResuelto(incidencia, fotoDespues) {
  const fechaCierre = serverTimestamp()

  await updateDoc(doc(db, COLECCIONES.INCIDENCIAS, incidencia.id), {
    estado: 'Resuelto',
    fecha_cierre: fechaCierre,
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
