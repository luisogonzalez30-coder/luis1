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
import { VERTICALES, VERTICAL_POR_DEFECTO } from '../verticales'
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
  // Vertical del tenant, como STRING y no como objeto: este mismo payload se
  // guarda en localStorage cuando el reporte se encola sin señal (§10), y un
  // objeto con funciones no sobrevive a JSON.stringify. Si falta —reportes
  // encolados antes de que existiera la vertical de condominios— cae a
  // municipio, que es lo que esos reportes eran.
  verticalId,
  // Solo en la vertical de condominios: { tipo, torre, unidad, espacio_comun }
  // (ver utils/unidades.js). En la municipal va undefined y no se escribe.
  ubicacionCondominio,
}) {
  if (!municipioId) {
    throw new Error('Falta el identificador de la municipalidad.')
  }
  if (!dispositivoId) {
    throw new Error('Falta el identificador de dispositivo.')
  }

  const docRef = idDocumento ? doc(db, COLECCIONES.INCIDENCIAS, idDocumento) : doc(incidenciasRef)

  // El triage y la derivación los define la vertical: la misma palabra
  // "Filtracion_..." significa un departamento municipal en una comuna y un
  // área de mantención en un condominio, con plazos distintos.
  const vertical = VERTICALES[verticalId] || VERTICAL_POR_DEFECTO
  const { nivel_gravedad, color_pin } = vertical.calcularGravedad(categoria)
  const departamento = vertical.calcularArea(categoria)

  let numeroTicket = numeroTicketExistente || generarNumeroTicket()
  const esRetry = Boolean(numeroTicketExistente)

  const datosIncidencia = (numeroTicket) => ({
    categoria,
    coordenadas,
    direccion_texto: direccionTexto || '',
    detalles_adicionales: detallesAdicionales || '',
    // El campo se llama `departamento` en las dos verticales y guarda el área
    // responsable. No se renombró a propósito: está escrito en firestore.rules,
    // en el RBAC y en los 6 reportes de Licantén que ya existen — cambiarlo
    // obligaba a migrar datos y reglas en producción a cambio de una palabra.
    vertical: vertical.id,
    ...(ubicacionCondominio ? { ubicacion_condominio: ubicacionCondominio } : {}),
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
  // El techo del reintento va en el ENCABEZADO del for, no escondido dentro del
  // catch. Antes el límite existía igual (era una condición más del booleano que
  // decide si reintentar), pero ahí es frágil: basta que alguien reordene esa
  // condición o le agregue un `||` para que el techo desaparezca sin que nada lo
  // advierta, y esto corre en el celular del vecino contra una base que se paga
  // por escritura. Un límite tiene que poder leerse de una.
  let creada = false

  for (let intento = 1; intento <= MAX_INTENTOS_TICKET && !creada; intento++) {
    const lote = writeBatch(db)
    agregarTicketPublicoAlLote(lote, {
      numeroTicket,
      incidenciaId: docRef.id,
      municipioId,
      categoria,
      nivelGravedad: nivel_gravedad,
      coordenadas,
      direccionTexto,
      // Solo el espacio común viaja al ticket público; la torre y el número de
      // departamento se quedan en la incidencia, que solo ve la administración
      // (ver datosTicketPublico en ticketsPublicosService.js).
      ubicacionPublica:
        ubicacionCondominio?.tipo === 'espacio_comun' ? ubicacionCondominio.espacio_comun : '',
    })
    lote.set(docRef, datosIncidencia(numeroTicket))
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

      console.warn(`[incidenciasService] El ticket ${numeroTicket} ya estaba tomado, generando otro (intento ${intento} de ${MAX_INTENTOS_TICKET}).`)
      numeroTicket = generarNumeroTicket()
    }
  }

  // Se agotaron los intentos y todos fueron colisiones. Con un millón de
  // números y ~90 tickets en uso esto es prácticamente imposible, así que si
  // ocurre no es mala suerte: es una señal de que algo más está mal (por
  // ejemplo, generarNumeroTicket devolviendo siempre lo mismo). El mensaje va
  // en español porque FormularioCiudadano lo muestra tal cual al vecino.
  if (!creada) {
    const error = new Error('No pudimos asignarle un número a tu reporte. Intenta nuevamente en un momento.')
    error.esColisionRepetida = true
    throw error
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
// Techo de la ventana que cargan los paneles municipales.
//
// Bug real, mismo patrón que el corregido el 02-ago-2026 en tickets_publicos
// (ESTADO_PROYECTO.md §26) pero que quedó sin arreglar en esta colección: esta
// suscripción no tenía limit(), así que cada vez que un funcionario abría su
// panel se descargaba el histórico COMPLETO del municipio. Con 1.000
// incidencias acumuladas son 1.000 lecturas por apertura: cuatro funcionarios
// abriendo el panel ocho veces al día se comen 32.000 de las 50.000 lecturas
// diarias del plan Spark, antes de que entre un solo vecino.
//
// 500 es holgado para operar —lo que un municipio chico acumula en meses— y
// deja margen de sobra bajo la cuota. Cuando la ventana se llena, lo que deja
// de ser cierto son los totales "de siempre": por eso se exporta la constante y
// quien muestre un acumulado tiene que decir que está acotado (ver
// reporteGerencial.js y PanelIndicadores.jsx), en vez de presentar una cifra
// parcial como si fuera el histórico completo. Mismo criterio que §26 aplicó en
// la página de transparencia.
//
// Los dos índices que esto necesita YA existen en firestore.indexes.json
// —(municipio_id, fecha_creacion DESC) y (municipio_id, estado, fecha_creacion
// DESC)—, así que este cambio no requiere desplegar índices.
export const MAX_INCIDENCIAS_PANEL = 500

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

  const q = query(
    incidenciasRef,
    ...condiciones,
    orderBy('fecha_creacion', 'desc'),
    limitar(MAX_INCIDENCIAS_PANEL)
  )

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
// fecha_asignacion se guarda la PRIMERA vez, la asigne quien la asigne — es lo
// que permite calcular el "tiempo de reacción" (fecha_asignacion -
// fecha_creacion). Una reasignación posterior NO la reescribe (ver abajo).
export async function asignarCuadrilla(incidencia, cuadrilla, presupuestoEstimado = null) {
  if (!cuadrilla) {
    throw new Error('Debes indicar el nombre de la cuadrilla.')
  }

  const cambios = {
    estado: 'En Proceso',
    cuadrilla_asignada: cuadrilla,
  }

  // La fecha de asignación se escribe SOLO la primera vez. Es lo que mide el
  // tiempo de reacción del municipio (fecha_asignacion - fecha_creacion) y lo
  // que alimenta la tarjeta de "atrasados" del panel del Alcalde, así que
  // reescribirla al reasignar dejaba un caso de hace dos semanas pareciendo
  // recién tomado — el indicador mejoraba solo por apretar un botón. Cambiar de
  // cuadrilla es un hecho posterior y se guarda aparte, sin tocar el reloj.
  if (!incidencia.fecha_asignacion) {
    cambios.fecha_asignacion = serverTimestamp()
  } else {
    cambios.fecha_reasignacion = serverTimestamp()
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
