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
const { enviarTexto, explicarError } = require('./whatsapp')
const { etiquetaCategoria } = require('./categorias')

const PORTAL_URL_ESTADO = process.env.PORTAL_URL_ESTADO || 'https://app-incidencias-urbanas.web.app/estado'

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
// Se acepta escrito de varias formas porque nadie va a copiar la frase exacta:
// con o sin tildes, en singular, y con las palabras que la gente usa de verdad
// para referirse a un reporte municipal.
const RE_MIS_REPORTES = /\bmis?\s*(reportes?|tickets?|solicitudes?|denuncias?|reclamos?)\b/

function normalizarTexto(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function pideSusReportes(texto) {
  return RE_MIS_REPORTES.test(normalizarTexto(texto))
}

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

// La ayuda se manda una sola vez por hora al mismo número: si alguien conversa
// con el bot, no queremos repetirle las instrucciones en cada mensaje.
const AYUDA_CADA_MS = 60 * 60 * 1000
const ultimaAyuda = new Map()

function correspondeMandarAyuda(numero) {
  const ahora = Date.now()
  if (ahora - (ultimaAyuda.get(numero) || 0) < AYUDA_CADA_MS) return false
  ultimaAyuda.set(numero, ahora)
  return true
}

// --- Firma de Meta ---
// Sin esto, cualquiera que descubra la URL puede POSTear mensajes falsos y
// hacernos responder a números arbitrarios. timingSafeEqual en vez de === para
// no filtrar información por el tiempo de comparación.
function firmaValida(req, appSecret) {
  const recibida = req.get('X-Hub-Signature-256') || ''
  if (!recibida.startsWith('sha256=') || !req.rawBody) return false

  const esperada =
    'sha256=' + crypto.createHmac('sha256', appSecret).update(req.rawBody).digest('hex')

  const a = Buffer.from(recibida)
  const b = Buffer.from(esperada)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
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
    if (pideSusReportes(texto)) {
      const reportes = await buscarReportesDelNumero(db, numero)
      await enviarTexto({
        para: numero,
        texto: reportes.length > 0 ? armarListaDeReportes(reportes) : TEXTO_SIN_REPORTES,
      })
      console.log(`[webhook] ${numero}: pidió sus reportes, se le enviaron ${reportes.length}.`)
      return
    }

    if (correspondeMandarAyuda(numero)) {
      await enviarTexto({ para: numero, texto: TEXTO_AYUDA })
      console.log(`[webhook] ${numero}: mensaje sin ticket, se envió la ayuda.`)
    }
    return
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

        // Solo texto. Si el vecino manda audio, foto o sticker, se le explica
        // qué mandar en vez de dejarlo sin respuesta.
        if (mensaje.type !== 'text') {
          if (correspondeMandarAyuda(mensaje.from)) {
            await enviarTexto({ para: mensaje.from, texto: TEXTO_AYUDA })
          }
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
    res.sendStatus(200)

    procesarCuerpo(req.app.locals.db || db, req.body).catch((error) => {
      console.error(`[webhook] Falló al procesar el evento.\n    ${explicarError(error)}`)
    })
  })

  return router
}

module.exports = {
  crearRouter,
  extraerNumeroTicket,
  armarRespuesta,
  formatearNumeroTicket,
  // Exportadas para poder probarlas sin levantar el servidor ni mandar mensajes
  // reales (ver probar-mis-reportes.mjs): la consulta y el armado del texto son
  // justo lo que conviene revisar contra datos de verdad.
  pideSusReportes,
  buscarReportesDelNumero,
  armarListaDeReportes,
  TEXTO_SIN_REPORTES,
}
