// Webhook de Meta: recibe lo que el vecino ESCRIBE al número de la
// municipalidad y le responde el estado de su ticket, sin que nadie del
// municipio tenga que contestar.
//
// Reemplaza la consulta conversacional que hacía whatsapp-bot/ (Baileys) — ver
// ESTADO_PROYECTO.md §23.8 — pero por la vía oficial.
//
// Por qué esto no cuesta plata: responder con texto libre dentro de las 24 h
// siguientes a un mensaje del vecino es gratis (ver whatsapp.js). Como este
// webhook SOLO responde a quien acaba de escribir, y nunca inicia una
// conversación, el costo por consulta es cero.
//
// Se monta aparte de los listeners de server.js a propósito: si Meta manda algo
// inesperado y esto falla, los avisos automáticos siguen funcionando igual.

const crypto = require('crypto')
const express = require('express')
const { enviarTexto, enviarBotones, explicarError } = require('./whatsapp')
const { etiquetaCategoria } = require('./categorias')
const ia = require('./ia')
const { transcripcionDisponible, transcribirAudioDeWhatsapp } = require('./transcripcion')

const PORTAL_URL_ESTADO = process.env.PORTAL_URL_ESTADO || 'https://app-incidencias-urbanas.web.app/estado'
// A dónde se manda al vecino que quiere reportar algo nuevo. Va por variable de
// entorno porque el formulario es POR COMUNA (/:municipio/reportar) y este
// servicio atiende el número de una municipalidad: si algún día atiende otra,
// esto cambia sin tocar código.
const PORTAL_URL_REPORTAR =
  process.env.PORTAL_URL_REPORTAR || 'https://app-incidencias-urbanas.web.app/licanten/reportar'

// Reconoce el número de ticket dentro de una frase cualquiera ("hola, quiero
// saber del 482 173 por favor"). Dos formatos, igual que normalizarNumeroTicket
// en src/utils/ticket.js:
//   - el actual: 6 dígitos, tolerando espacio, punto o guion al medio
//   - el antiguo: INC-20260802-8BD7, para los vecinos que aún lo tengan anotado
const RE_TICKET_ANTIGUO = /\bINC-\d{8}-[A-Z0-9]{4}\b/i
const RE_TICKET_6 = /\b(\d{3})[\s.-]?(\d{3})\b/

function extraerNumeroTicket(texto) {
  const limpio = (texto || '').trim()

  const antiguo = limpio.match(RE_TICKET_ANTIGUO)
  if (antiguo) return antiguo[0].toUpperCase()

  const seis = limpio.match(RE_TICKET_6)
  if (seis) return seis[1] + seis[2]

  return null
}

function formatearNumeroTicket(numeroTicket) {
  if (!numeroTicket) return ''
  if (!/^\d{6}$/.test(numeroTicket)) return numeroTicket
  return `${numeroTicket.slice(0, 3)} ${numeroTicket.slice(3)}`
}

// "Mis reportes": el vecino que perdió su número de ticket pide su lista.
//
// Esto existe porque §29 eliminó la búsqueda por RUT de /estado justificándose
// en que esta consulta la reemplazaba — y después la consulta se perdió en la
// migración a la API oficial (§39.3), dejando al vecino sin NINGUNA forma de
// recuperar un ticket olvidado. La pantalla de confirmación se lo promete
// textualmente ("escríbenos 'mis reportes'"), así que hasta hoy era una promesa
// incumplida.
//
// El reconocimiento es a propósito tolerante, y aun así NO es la defensa
// principal: cualquier mensaje que no se entienda termina mostrando el menú de
// botones (ver MENU_OPCIONES), así que un error de tipeo nunca deja al vecino
// sin salida. Esto solo atrapa a quien escribe en vez de tocar.
//
// La lista de variantes salió de la primera prueba real (10-ago-2026): el
// corrector del teléfono convirtió "mis reportes" en **"mía reportes"** y la
// versión estricta no lo reconoció. Por eso se pide solo que aparezca un
// posesivo Y una palabra de reporte, en cualquier orden, en vez de una frase
// exacta: cubre "mia reportes", "mi reporte", "ver mis solicitudes", "estado de
// mis tickets".
const RE_PALABRA_REPORTE = /\b(reportes?|tickets?|solicitudes?|denuncias?|reclamos?)\b/
const RE_POSESIVO = /\bm(?:i|is|ia|ias|io|ios)\b/
// Sin espacio al medio, que es como queda cuando el teclado los pega.
const RE_PEGADO = /\bm(?:i|is|ia|ias)(?:reportes?|tickets?|solicitudes?|denuncias?|reclamos?)\b/

function normalizarTexto(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function pideSusReportes(texto) {
  const t = normalizarTexto(texto)
  if (RE_PEGADO.test(t)) return true
  return RE_PALABRA_REPORTE.test(t) && RE_POSESIVO.test(t)
}

// --- Menú de botones ---
// Los ids viajan en el webhook cuando el vecino toca un botón, así que son
// estables y cortos. Los títulos no pasan de 20 caracteres (tope de Meta; ver
// enviarBotones en whatsapp.js).
const OPCION_MIS_REPORTES = 'mis_reportes'
const OPCION_BUSCAR_TICKET = 'buscar_ticket'
const OPCION_NUEVO_REPORTE = 'nuevo_reporte'

const MENU_TEXTO =
  '¡Hola! 👋 Soy el asistente de la municipalidad.\n\n¿Qué necesitas? Toca una opción:'

const MENU_OPCIONES = [
  { id: OPCION_MIS_REPORTES, titulo: '📋 Mis reportes' },
  { id: OPCION_BUSCAR_TICKET, titulo: '🔍 Buscar ticket' },
  { id: OPCION_NUEVO_REPORTE, titulo: '➕ Nuevo reporte' },
]

const TEXTO_PEDIR_TICKET =
  'Escríbeme el número de tu ticket 🔍\n\n' +
  'Son 6 dígitos, como 482173 (o 482 173, da lo mismo).\n\n' +
  'Si no lo tienes a mano, pídeme *mis reportes* y te mando la lista.'

const TEXTO_NUEVO_REPORTE =
  'Para reportar algo nuevo, entra acá 👇\n\n' +
  `${PORTAL_URL_REPORTAR}\n\n` +
  'Son 3 pasos: marcas el lugar en el mapa, eliges qué pasa y mandas una foto. ' +
  'Al terminar te llega el número de tu reporte por acá mismo.'

// Formas en que ese mismo teléfono puede estar guardado en contacto_ciudadano.
// Meta entrega el número como puros dígitos con código de país ("56998803719").
// Desde §29 la app guarda siempre "+56998803719" (normalizarWhatsapp en
// src/utils/telefono.js), pero los reportes anteriores guardaban lo que el
// vecino escribió, así que se buscan también las variantes razonables.
function variantesDeContacto(digitos) {
  const nacional = digitos.startsWith('56') ? digitos.slice(2) : digitos
  return [...new Set([`+${digitos}`, digitos, `+${nacional}`, nacional])]
}

const MAX_REPORTES_LISTADOS = 5
// Se leen algunos más de los que se muestran, para poder decirle al vecino que
// tiene otros sin listárselos todos. El techo es por la cuota de lecturas del
// plan Spark. OJO: si la lectura llega al tope no se sabe el total real, así que
// ahí el mensaje no da un número (ver armarListaDeReportes).
const MAX_REPORTES_LEIDOS = 12

async function buscarReportesDelNumero(db, digitos) {
  const snap = await db
    .collection('incidencias')
    .where('contacto_ciudadano', 'in', variantesDeContacto(digitos))
    .limit(MAX_REPORTES_LEIDOS)
    .get()

  // Se ordena en memoria a propósito: un where('in') combinado con
  // orderBy('fecha_creacion') exige un índice compuesto en Firestore, y un
  // vecino tiene un puñado de reportes, no miles. Así esto funciona sin
  // desplegar un índice nuevo.
  return snap.docs
    .map((d) => d.data())
    .sort((a, b) => (b.fecha_creacion?.toMillis?.() || 0) - (a.fecha_creacion?.toMillis?.() || 0))
}

function armarListaDeReportes(reportes) {
  const mostrados = reportes.slice(0, MAX_REPORTES_LISTADOS)

  const lineas = [
    reportes.length === 1 ? 'Este es tu reporte:' : `Tus reportes (${mostrados.length} de los más recientes):`,
    '',
  ]

  for (const r of mostrados) {
    const emoji = EMOJI_POR_ESTADO[r.estado] || '📋'
    const fecha = formatearFecha(r.fecha_creacion)
    lineas.push(`${emoji} ${formatearNumeroTicket(r.numero_ticket)} · ${etiquetaCategoria(r.categoria)}`)
    lineas.push(`   ${r.estado || 'Pendiente'}${fecha ? ` · ${fecha}` : ''}`)
    if (r.direccion_texto) lineas.push(`   ${r.direccion_texto}`)
    lineas.push('')
  }

  // Si la consulta llegó al tope de lectura, el total puede ser mayor: ahí se
  // dice que hay más sin inventar una cifra. Solo cuando vino por debajo del
  // tope el número es real.
  if (reportes.length > mostrados.length) {
    const sinMostrar = reportes.length - mostrados.length
    lineas.push(
      reportes.length === MAX_REPORTES_LEIDOS
        ? 'Tienes más reportes además de estos.'
        : `Tienes ${sinMostrar} más además de ${sinMostrar === 1 ? 'este' : 'estos'}.`,
      ''
    )
  }

  lineas.push('Escríbeme el número de cualquiera para ver su detalle.')
  lineas.push(`También puedes verlos acá: ${PORTAL_URL_ESTADO}`)

  return lineas.join('\n')
}

// Cuando no hay nada, la respuesta tiene que explicar POR QUÉ, no solo decir
// "no encontré": lo más probable es que el vecino haya reportado desde otro
// teléfono, o sin dejar su WhatsApp.
const TEXTO_SIN_REPORTES =
  'No encontré reportes hechos con este número 🤔\n\n' +
  'Te busco por el teléfono desde el que me escribes, así que puede pasar si ' +
  'reportaste desde otro celular o si no dejaste tu WhatsApp al reportar.\n\n' +
  `Si tienes el número de tu ticket a mano, escríbemelo y te digo cómo va. ` +
  `También puedes consultarlo acá: ${PORTAL_URL_ESTADO}`

const formateadorFecha = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/Santiago',
})

function formatearFecha(valor) {
  if (!valor) return null
  // Firestore Admin devuelve Timestamp; toDate() puede no existir si el campo
  // quedó como string en algún registro viejo.
  const fecha = typeof valor.toDate === 'function' ? valor.toDate() : new Date(valor)
  return Number.isNaN(fecha.getTime()) ? null : formateadorFecha.format(fecha)
}

const EMOJI_POR_ESTADO = {
  Pendiente: '🕓',
  'En Proceso': '🔧',
  Resuelto: '✅',
}

function armarRespuesta(numeroTicket, ticket) {
  const lineas = [
    `${EMOJI_POR_ESTADO[ticket.estado] || '📋'} Ticket ${formatearNumeroTicket(numeroTicket)}`,
    '',
    `Estado: ${ticket.estado || 'Pendiente'}`,
    `Reporte: ${etiquetaCategoria(ticket.categoria)}`,
  ]

  const creado = formatearFecha(ticket.fecha_creacion)
  if (creado) lineas.push(`Recibido: ${creado}`)

  const cerrado = formatearFecha(ticket.fecha_cierre)
  if (cerrado) lineas.push(`Resuelto: ${cerrado}`)

  if (ticket.direccion_texto) lineas.push(`Lugar: ${ticket.direccion_texto}`)

  if (ticket.upvotes > 1) {
    lineas.push('', `Otros ${ticket.upvotes - 1} vecino(s) reportaron lo mismo.`)
  }

  if (ticket.estado === 'Resuelto') {
    lineas.push('', `Puedes calificar la atención acá: ${PORTAL_URL_ESTADO}`)
  } else {
    lineas.push('', `Ver el detalle: ${PORTAL_URL_ESTADO}`)
  }

  return lineas.join('\n')
}

const TEXTO_NO_ENCONTRADO = (numeroTicket) =>
  `No encontré el ticket ${formatearNumeroTicket(numeroTicket)}. ` +
  `Revisa que esté bien copiado (son 6 números) y vuelve a escribirlo.\n\n` +
  `También puedes consultarlo acá: ${PORTAL_URL_ESTADO}`

const TEXTO_AYUDA =
  'Hola 👋 Para consultar un reporte, escríbeme solo el número de ticket ' +
  'de 6 dígitos que te entregamos al reportar (por ejemplo: 482173).\n\n' +
  'Si lo perdiste, escríbeme *mis reportes* y te mando la lista de los tuyos.\n\n' +
  `También puedes consultarlos acá: ${PORTAL_URL_ESTADO}`

// --- Protecciones en memoria ---
// Se pierden al reiniciar el servicio, y está bien: son para evitar duplicados
// y abuso dentro de una misma sesión, no para llevar registro de nada.

// Meta reintenta el mismo webhook si no le respondemos 200 rápido. Sin esto, un
// reintento hace que el vecino reciba la respuesta dos veces.
const idsVistos = new Set()
const MAX_IDS = 1000

function yaProcesado(id) {
  if (idsVistos.has(id)) return true
  idsVistos.add(id)
  if (idsVistos.size > MAX_IDS) idsVistos.delete(idsVistos.values().next().value)
  return false
}

// Tope de consultas por número. No es por el costo de los mensajes (responder es
// gratis) sino por la cuota de LECTURAS de Firestore: el proyecto está en plan
// Spark y alguien mandando cientos de mensajes podría agotarla y dejar la app
// caída para todos.
const MAX_CONSULTAS = 10
const VENTANA_MS = 60 * 1000
const consultasPorNumero = new Map()

function excedeLimite(numero) {
  const ahora = Date.now()
  const registro = consultasPorNumero.get(numero)

  if (!registro || ahora - registro.desde > VENTANA_MS) {
    consultasPorNumero.set(numero, { desde: ahora, cuenta: 1 })
    return false
  }

  registro.cuenta += 1
  return registro.cuenta > MAX_CONSULTAS
}

// Antes había un tope de "una ayuda por hora" para no repetirle las
// instrucciones a quien conversaba con el bot. Se quitó al pasar al menú de
// botones: el menú ES la respuesta a "no te entendí", y callarse deja al vecino
// creyendo que el bot está muerto. Lo que protege del abuso sigue siendo
// excedeLimite (10 por minuto), que ya cubría el resto de las respuestas.

// --- Firma de Meta ---
// Sin esto, cualquiera que descubra la URL puede POSTear mensajes falsos y
// hacernos responder a números arbitrarios. timingSafeEqual en vez de === para
// no filtrar información por el tiempo de comparación.
function firmaValida(req, appSecret) {
  const recibida = req.get('X-Hub-Signature-256') || ''
  // Sin rawBody no hay nada que verificar: pasa cuando el cuerpo llegó vacío o
  // con un content-type que express.json() no parsea. Se rechaza, nunca se
  // asume válido.
  if (!appSecret || !recibida.startsWith('sha256=') || !req.rawBody) return false

  const esperada =
    'sha256=' + crypto.createHmac('sha256', appSecret).update(req.rawBody).digest('hex')

  const a = Buffer.from(recibida)
  const b = Buffer.from(esperada)
  // timingSafeEqual exige buffers del mismo largo (lanza si no lo son), por eso
  // el largo se compara antes. Esa comparación no filtra nada: el largo de un
  // sha256 hexadecimal es fijo y público.
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// El menú de botones, con el texto de ayuda como respaldo: si la API rechaza el
// mensaje interactivo (un cliente de WhatsApp muy viejo, un cambio de Meta), el
// vecino igual recibe las instrucciones escritas en vez de quedarse sin nada.
async function mostrarMenu(numero) {
  try {
    await enviarBotones({ para: numero, texto: MENU_TEXTO, botones: MENU_OPCIONES })
    console.log(`[webhook] ${numero}: se envió el menú de opciones.`)
  } catch (error) {
    console.warn(
      `[webhook] ${numero}: falló el menú de botones, se manda la ayuda escrita.\n    ${explicarError(error)}`
    )
    await enviarTexto({ para: numero, texto: TEXTO_AYUDA })
  }
}

async function responderMisReportes(db, numero) {
  const reportes = await buscarReportesDelNumero(db, numero)
  await enviarTexto({
    para: numero,
    texto: reportes.length > 0 ? armarListaDeReportes(reportes) : TEXTO_SIN_REPORTES,
  })
  console.log(`[webhook] ${numero}: pidió sus reportes, se le enviaron ${reportes.length}.`)
}

// Llega acá cuando el vecino TOCA un botón: no hay texto que interpretar, solo
// el id que definimos en MENU_OPCIONES.
async function responderOpcion(db, numero, opcion) {
  if (excedeLimite(numero)) {
    console.warn(`[webhook] ${numero}: superó ${MAX_CONSULTAS} consultas por minuto, se ignora.`)
    return
  }

  switch (opcion) {
    case OPCION_MIS_REPORTES:
      return responderMisReportes(db, numero)
    case OPCION_BUSCAR_TICKET:
      console.log(`[webhook] ${numero}: eligió buscar por número.`)
      return enviarTexto({ para: numero, texto: TEXTO_PEDIR_TICKET })
    case OPCION_NUEVO_REPORTE:
      console.log(`[webhook] ${numero}: eligió reportar algo nuevo.`)
      return enviarTexto({ para: numero, texto: TEXTO_NUEVO_REPORTE })
    default:
      console.warn(`[webhook] ${numero}: opción desconocida "${opcion}", se muestra el menú.`)
      return mostrarMenu(numero)
  }
}

// --- Conversación con IA ---
//
// Esto NO reemplaza nada de lo que ya funcionaba. El orden de resolución sigue
// siendo el mismo y los caminos deterministas van primero:
//
//   1. ¿escribió un número de ticket?      -> respuesta directa de siempre
//   2. ¿pidió "mis reportes"?              -> su lista, como siempre
//   3. cualquier otra cosa                 -> ANTES: menú de botones
//                                             AHORA: la IA, y si falla, el menú
//
// O sea que la IA solo cubre el hueco que antes terminaba en "no te entendí".
// Eso tiene dos consecuencias buenas: el comportamiento ya probado no cambia, y
// el costo es mucho menor que si cada mensaje pasara por el modelo.

// Historial por número, en memoria. Se pierde al reiniciar el servicio y está
// bien: es para que la conversación tenga sentido dentro de un rato, no un
// registro de nada. Nunca se guarda en Firestore — son conversaciones de
// vecinos y no hay ninguna razón para conservarlas.
const HISTORIAL_TTL_MS = 30 * 60 * 1000
const conversaciones = new Map()

function obtenerConversacion(numero) {
  const ahora = Date.now()
  const previa = conversaciones.get(numero)

  if (previa && ahora - previa.ultimoMensaje < HISTORIAL_TTL_MS) {
    previa.ultimoMensaje = ahora
    return previa
  }

  const nueva = { turnos: [], usosIa: 0, ultimoMensaje: ahora }
  conversaciones.set(numero, nueva)
  return nueva
}

// Limpieza periódica: sin esto el Map crece para siempre en un proceso que vive
// semanas.
setInterval(() => {
  const limite = Date.now() - HISTORIAL_TTL_MS
  for (const [numero, conversacion] of conversaciones) {
    if (conversacion.ultimoMensaje < limite) conversaciones.delete(numero)
  }
}, HISTORIAL_TTL_MS).unref()

// Las herramientas que la IA puede pedir. Las EJECUTA este archivo, no ia.js:
// toda la lectura de datos del vecino sigue pasando por las mismas funciones de
// siempre (buscarReportesDelNumero, tickets_publicos), así que la IA no abre
// ningún camino nuevo a los datos — solo decide cuándo usar los que ya existen.
function herramientasPara(db, numero) {
  return [
    {
      definicion: {
        name: 'buscar_ticket',
        description:
          'Busca un reporte por su número de ticket de 6 dígitos y devuelve su estado actual. ' +
          'Úsala cuando el vecino mencione un número de reporte.',
        strict: true,
        input_schema: {
          type: 'object',
          properties: {
            numero_ticket: { type: 'string', description: 'Los 6 dígitos, sin espacios' },
          },
          required: ['numero_ticket'],
          additionalProperties: false,
        },
      },
      ejecutar: async ({ numero_ticket }) => {
        const limpio = String(numero_ticket || '').replace(/\D/g, '')
        if (!/^\d{6}$/.test(limpio)) return 'Ese no es un número de ticket válido: son 6 dígitos.'

        const snap = await db.collection('tickets_publicos').doc(limpio).get()
        if (!snap.exists) return `No existe ningún reporte con el número ${limpio}.`

        const t = snap.data()
        return JSON.stringify({
          numero: limpio,
          estado: t.estado || 'Pendiente',
          categoria: etiquetaCategoria(t.categoria),
          recibido: formatearFecha(t.fecha_creacion),
          resuelto: formatearFecha(t.fecha_cierre),
          lugar: t.direccion_texto || null,
          vecinos_que_reportaron_lo_mismo: t.upvotes || 1,
        })
      },
    },
    {
      definicion: {
        name: 'listar_mis_reportes',
        description:
          'Devuelve los reportes hechos desde el número de WhatsApp con el que escribe el vecino. ' +
          'Úsala cuando pida ver sus reportes o diga que perdió su número de ticket.',
        strict: true,
        input_schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
      },
      ejecutar: async () => {
        const reportes = await buscarReportesDelNumero(db, numero)
        if (reportes.length === 0) {
          return 'Este número no tiene reportes. Puede haber reportado desde otro celular, o sin dejar su WhatsApp.'
        }
        return JSON.stringify(
          reportes.slice(0, MAX_REPORTES_LISTADOS).map((r) => ({
            numero: r.numero_ticket,
            estado: r.estado || 'Pendiente',
            categoria: etiquetaCategoria(r.categoria),
            fecha: formatearFecha(r.fecha_creacion),
            lugar: r.direccion_texto || null,
          }))
        )
      },
    },
    {
      definicion: {
        name: 'enlace_para_reportar',
        description:
          'Devuelve el enlace del formulario para hacer un reporte nuevo. Úsala cuando el vecino ' +
          'quiera reportar algo que todavía no ha reportado.',
        strict: true,
        input_schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
      },
      ejecutar: async () => PORTAL_URL_REPORTAR,
    },
  ]
}

// Devuelve true si contestó, false si hay que caer al menú de botones.
async function responderConIa(db, numero, texto) {
  if (!ia.iaDisponible()) return false

  const conversacion = obtenerConversacion(numero)

  // Tope de turnos: pasado ese punto la conversación vuelve al menú, que es
  // gratis y resuelve lo que el vecino necesita el 90% de las veces. Es el
  // techo de costo del que habla docs/COSTOS-IA.md.
  if (conversacion.usosIa >= ia.MAX_TURNOS) {
    console.log(`[webhook] ${numero}: llegó al tope de ${ia.MAX_TURNOS} turnos con IA, vuelve al menú.`)
    return false
  }

  conversacion.turnos.push({ rol: 'user', texto })
  // Se recorta el historial para que la entrada no crezca sin control: cada
  // turno viejo se vuelve a pagar en cada llamada.
  if (conversacion.turnos.length > ia.MAX_TURNOS * 2) {
    conversacion.turnos = conversacion.turnos.slice(-ia.MAX_TURNOS * 2)
  }

  const respuesta = await ia.responderConversacion({
    historial: conversacion.turnos,
    herramientas: herramientasPara(db, numero),
  })

  if (!respuesta) {
    // La IA no pudo: se saca el turno del historial para no dejarlo colgando
    // sin respuesta, y el vecino recibe el menú de siempre.
    conversacion.turnos.pop()
    return false
  }

  conversacion.turnos.push({ rol: 'assistant', texto: respuesta })
  conversacion.usosIa += 1

  await enviarTexto({ para: numero, texto: respuesta })
  console.log(`[webhook] ${numero}: respondido con IA (turno ${conversacion.usosIa} de ${ia.MAX_TURNOS}).`)
  return true
}

async function responderConsulta(db, numero, texto) {
  if (excedeLimite(numero)) {
    console.warn(`[webhook] ${numero}: superó ${MAX_CONSULTAS} consultas por minuto, se ignora.`)
    return
  }

  const numeroTicket = extraerNumeroTicket(texto)

  if (!numeroTicket) {
    // El ticket manda por sobre "mis reportes" porque es más específico: si el
    // vecino escribió un número, quiere ESE reporte.
    if (pideSusReportes(texto)) return responderMisReportes(db, numero)

    // Cualquier otra cosa —un saludo, una pregunta, un error de tipeo— se
    // intenta con la IA. Si no está configurada, si falla o si la conversación
    // llegó a su tope de turnos, cae al menú de botones: sigue siendo la red
    // que hace que ningún mensaje quede sin respuesta.
    try {
      if (await responderConIa(db, numero, texto)) return
    } catch (error) {
      console.warn(`[webhook] ${numero}: falló la respuesta con IA, se muestra el menú.\n    ${explicarError(error)}`)
    }

    return mostrarMenu(numero)
  }

  const snap = await db.collection('tickets_publicos').doc(numeroTicket).get()

  if (!snap.exists) {
    await enviarTexto({ para: numero, texto: TEXTO_NO_ENCONTRADO(numeroTicket) })
    console.log(`[webhook] ${numero}: consultó ${numeroTicket}, no existe.`)
    return
  }

  await enviarTexto({ para: numero, texto: armarRespuesta(numeroTicket, snap.data()) })
  console.log(`[webhook] ${numero}: consultó ${numeroTicket} (${snap.data().estado}), respondido.`)
}

// Meta avisa acá cuándo un mensaje se entregó o falló. Solo interesan los
// fallos: es la única forma de enterarse de que un aviso no llegó, porque el
// envío original devolvió 200 igual (Meta acepta primero y entrega después).
function registrarEstados(estados) {
  for (const estado of estados) {
    if (estado.status !== 'failed') continue
    const error = estado.errors?.[0]
    console.error(
      `[webhook] No se pudo entregar a ${estado.recipient_id}: ` +
        `${error ? `[${error.code}] ${error.title || error.message}` : 'sin detalle'}`
    )
  }
}

async function procesarCuerpo(db, cuerpo) {
  for (const entrada of cuerpo.entry || []) {
    for (const cambio of entrada.changes || []) {
      const valor = cambio.value || {}

      if (valor.statuses) registrarEstados(valor.statuses)

      for (const mensaje of valor.messages || []) {
        if (yaProcesado(mensaje.id)) {
          console.log(`[webhook] ${mensaje.id}: reintento de Meta, ya estaba procesado.`)
          continue
        }

        // Respuesta a un botón del menú: no trae texto que interpretar, solo el
        // id. Antes este caso caía en el "no es texto" de abajo y se le
        // contestaba la ayuda, o sea que tocar un botón no hacía nada.
        if (mensaje.type === 'interactive') {
          const opcion =
            mensaje.interactive?.button_reply?.id || mensaje.interactive?.list_reply?.id || ''
          await responderOpcion(db, mensaje.from, opcion)
          continue
        }

        // Una nota de voz. En un pueblo la gente manda audios, no textos: un
        // adulto mayor que no escribe bien igual puede describir su problema
        // hablando, y hasta ahora ese mensaje se perdía. Si la transcripción
        // no está configurada o falla, se cae al menú como siempre.
        if (mensaje.type === 'audio' && transcripcionDisponible()) {
          const mediaId = mensaje.audio?.id
          const transcrito = mediaId ? await transcribirAudioDeWhatsapp(mediaId) : null

          if (transcrito) {
            console.log(`[webhook] ${mensaje.from}: mandó un audio, se transcribió y se procesa como texto.`)
            await responderConsulta(db, mensaje.from, transcrito)
            continue
          }
        }

        // Foto, sticker, o un audio que no se pudo transcribir: no hay nada que
        // leer, pero tampoco se lo deja sin respuesta — se le muestra el menú
        // para que pueda seguir tocando.
        if (mensaje.type !== 'text') {
          await mostrarMenu(mensaje.from)
          continue
        }

        await responderConsulta(db, mensaje.from, mensaje.text?.body || '')
      }
    }
  }
}

function crearRouter({ db, verifyToken, appSecret }) {
  const router = express.Router()

  // Guardamos el cuerpo crudo porque la firma se calcula sobre los bytes
  // exactos que mandó Meta: si se serializa de nuevo desde el objeto ya
  // parseado, cualquier diferencia de espaciado la invalida.
  router.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf
      },
    })
  )

  // Handshake: Meta llama una vez al guardar la URL en el panel.
  router.get('/', (req, res) => {
    const modo = req.query['hub.mode']
    const token = req.query['hub.verify_token']

    if (modo === 'subscribe' && token === verifyToken) {
      console.log('[webhook] Verificación de Meta correcta.')
      return res.status(200).send(req.query['hub.challenge'])
    }

    console.warn('[webhook] Verificación rechazada: el verify_token no calza.')
    return res.sendStatus(403)
  })

  router.post('/', (req, res) => {
    if (!firmaValida(req, appSecret)) {
      console.warn('[webhook] Petición con firma inválida, descartada.')
      return res.sendStatus(401)
    }

    // Se responde 200 ANTES de procesar: Meta espera el acuse en pocos segundos
    // y si se demora reintenta el mismo evento (y termina reenviándolo hasta
    // deshabilitar el webhook). El trabajo real va después, en segundo plano.
    //
    // "EVENT_RECEIVED" es el cuerpo que Meta documenta para este acuse. Da lo
    // mismo para el protocolo (lo que cuenta es el 200), pero deja el log de la
    // consola de Meta legible al diagnosticar.
    res.status(200).send('EVENT_RECEIVED')

    // setImmediate saca el procesamiento del tick en el que se está cerrando la
    // respuesta. Sin él, una llamada síncrona pesada dentro de procesarCuerpo
    // (parseo, armado de mensajes) corre antes de que el socket termine de
    // vaciarse, que es justo lo que se quería evitar respondiendo temprano.
    // El cuerpo se captura acá porque el objeto req puede reciclarse.
    const cuerpo = req.body
    const baseDatos = req.app.locals.db || db

    setImmediate(() => {
      procesarCuerpo(baseDatos, cuerpo).catch((error) => {
        console.error(`[webhook] Falló al procesar el evento.\n    ${explicarError(error)}`)
      })
    })
  })

  return router
}

module.exports = {
  crearRouter,
  extraerNumeroTicket,
  armarRespuesta,
  formatearNumeroTicket,
  // Exportadas para poder probar sin levantar el servidor ni mandar mensajes
  // reales: reemplazando enviarTexto/enviarBotones de whatsapp.js por funciones
  // que solo registran, procesarCuerpo permite simular el flujo completo
  // —escribir, tocar un botón, mandar un audio— contra datos de producción.
  procesarCuerpo,
  pideSusReportes,
  buscarReportesDelNumero,
  armarListaDeReportes,
  MENU_OPCIONES,
  TEXTO_SIN_REPORTES,
  responderConIa,
  herramientasPara,
}
