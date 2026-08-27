// Pruebas del webhook SIN Meta, sin Firebase y sin gastar un peso.
// Levanta el router con una base de datos y un WhatsApp de mentira, y le manda
// exactamente los mismos cuerpos JSON que manda Meta, firmados igual.
//
//   node probar-webhook.js
//
// Si todo pasa, lo único que falta para producción es apuntar la URL en Meta.

const crypto = require('crypto')
const http = require('http')
const express = require('express')

const APP_SECRET = 'secreto-de-prueba'
const VERIFY_TOKEN = 'token-de-prueba'

// --- Dobles de prueba -------------------------------------------------------

// Intercepta los envíos antes de que salgan a la red.
const enviados = []
require.cache[require.resolve('./whatsapp')] = {
  id: require.resolve('./whatsapp'),
  filename: require.resolve('./whatsapp'),
  loaded: true,
  exports: {
    enviarTexto: async ({ para, texto }) => {
      enviados.push({ para, texto })
      return { messages: [{ id: 'falso' }] }
    },
    explicarError: (e) => e.message,
  },
}

const TICKETS = {
  482173: {
    estado: 'Resuelto',
    categoria: 'Bache',
    direccion_texto: 'Frente a la escuela',
    upvotes: 3,
    fecha_creacion: { toDate: () => new Date('2026-08-01T14:30:00Z') },
    fecha_cierre: { toDate: () => new Date('2026-08-05T18:00:00Z') },
  },
  111222: {
    estado: 'Pendiente',
    categoria: 'Luminaria',
    upvotes: 1,
    fecha_creacion: { toDate: () => new Date('2026-08-06T09:00:00Z') },
    fecha_cierre: null,
  },
}

let lecturas = 0
const dbFalsa = {
  collection: () => ({
    doc: (id) => ({
      get: async () => {
        lecturas++
        return { exists: Boolean(TICKETS[id]), data: () => TICKETS[id] }
      },
    }),
  }),
}

const { crearRouter, extraerNumeroTicket } = require('./webhook')

// --- Utilidades -------------------------------------------------------------

let ok = 0
let fallos = 0

function afirmar(condicion, descripcion, detalle) {
  if (condicion) {
    ok++
    console.log(`  ✓ ${descripcion}`)
  } else {
    fallos++
    console.log(`  ✗ ${descripcion}`)
    if (detalle !== undefined) console.log(`      obtenido: ${JSON.stringify(detalle)}`)
  }
}

function firmar(cuerpo) {
  return 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(cuerpo).digest('hex')
}

function mensajeEntrante(texto, { id = 'wamid.' + Math.random(), from = '56977701624', type = 'text' } = {}) {
  return JSON.stringify({
    entry: [{ changes: [{ value: { messages: [{ id, from, type, text: { body: texto } }] } }] }],
  })
}

function pedir(servidor, { metodo = 'POST', ruta = '/webhook', cuerpo = '', firma, headers = {} }) {
  return new Promise((resolve) => {
    const { port } = servidor.address()
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: ruta,
        method: metodo,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(cuerpo),
          ...(firma ? { 'X-Hub-Signature-256': firma } : {}),
          ...headers,
        },
      },
      (res) => {
        let datos = ''
        res.on('data', (c) => (datos += c))
        res.on('end', () => resolve({ status: res.statusCode, cuerpo: datos }))
      }
    )
    req.on('error', () => resolve({ status: 0, cuerpo: '' }))
    if (cuerpo) req.write(cuerpo)
    req.end()
  })
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

// --- Pruebas ----------------------------------------------------------------

async function main() {
  const app = express()
  app.use('/webhook', crearRouter({ db: dbFalsa, verifyToken: VERIFY_TOKEN, appSecret: APP_SECRET }))
  const servidor = http.createServer(app).listen(0)
  await new Promise((r) => servidor.once('listening', r))

  console.log('\n── Reconocer el número de ticket en una frase\n')
  afirmar(extraerNumeroTicket('482173') === '482173', 'seis dígitos pelados')
  afirmar(extraerNumeroTicket('hola quiero saber del 482 173 gracias') === '482173', 'con espacio, dentro de una frase')
  afirmar(extraerNumeroTicket('mi ticket es 482-173') === '482173', 'con guion')
  afirmar(extraerNumeroTicket('INC-20260802-8BD7') === 'INC-20260802-8BD7', 'formato antiguo')
  afirmar(extraerNumeroTicket('buenas tardes') === null, 'texto sin ticket -> null')
  afirmar(extraerNumeroTicket('') === null, 'vacío -> null')

  console.log('\n── Verificación de la URL (handshake de Meta)\n')
  let r = await pedir(servidor, {
    metodo: 'GET',
    ruta: `/webhook?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=desafio123`,
  })
  afirmar(r.status === 200 && r.cuerpo === 'desafio123', 'token correcto -> devuelve el challenge', r)

  r = await pedir(servidor, {
    metodo: 'GET',
    ruta: '/webhook?hub.mode=subscribe&hub.verify_token=equivocado&hub.challenge=x',
  })
  afirmar(r.status === 403, 'token equivocado -> 403', r.status)

  console.log('\n── Seguridad: firma de Meta\n')
  let cuerpo = mensajeEntrante('482173')
  r = await pedir(servidor, { cuerpo })
  afirmar(r.status === 401, 'sin firma -> 401', r.status)

  r = await pedir(servidor, { cuerpo, firma: 'sha256=' + 'a'.repeat(64) })
  afirmar(r.status === 401, 'firma falsa -> 401', r.status)
  afirmar(enviados.length === 0, 'no se respondió nada a las peticiones no firmadas')

  console.log('\n── Consulta de un ticket que existe\n')
  enviados.length = 0
  cuerpo = mensajeEntrante('hola, quiero saber del 482 173')
  r = await pedir(servidor, { cuerpo, firma: firmar(cuerpo) })
  await esperar(60)
  afirmar(r.status === 200, 'responde 200 al tiro (Meta no reintenta)', r.status)
  afirmar(enviados.length === 1, 'se mandó una respuesta', enviados.length)
  const texto = enviados[0]?.texto || ''
  afirmar(texto.includes('482 173'), 'muestra el ticket formateado')
  afirmar(texto.includes('Resuelto'), 'muestra el estado')
  afirmar(texto.includes('Bache en la vía'), 'traduce la categoría a lenguaje humano')
  afirmar(texto.includes('01-08-2026'), 'fecha en formato chileno', texto)
  afirmar(texto.includes('2 vecino'), 'menciona los otros vecinos que reportaron lo mismo')
  afirmar(!/undefined|null|NaN|\[object/.test(texto), 'sin basura técnica en el mensaje', texto)

  console.log('\n── Ticket que no existe\n')
  enviados.length = 0
  cuerpo = mensajeEntrante('999999')
  r = await pedir(servidor, { cuerpo, firma: firmar(cuerpo) })
  await esperar(60)
  afirmar(enviados.length === 1 && /No encontré/.test(enviados[0].texto), 'avisa que no lo encontró', enviados[0]?.texto)

  console.log('\n── Mensaje sin ticket -> siempre hay respuesta\n')
  // Esta prueba afirmaba lo contrario hasta el 25-ago-2026: que la segunda vez
  // seguida NO se respondiera, por un tope de "una ayuda por hora" que existió
  // al principio. §41.5 lo quitó a propósito —el menú ES la respuesta a "no te
  // entendí", y callarse deja al vecino creyendo que el bot está muerto— pero
  // la prueba se quedó afirmando la regla vieja y llevaba fallando desde
  // entonces. Ahora comprueba lo que el código de verdad hace.
  enviados.length = 0
  cuerpo = mensajeEntrante('hola buenas tardes', { from: '56911112222' })
  await pedir(servidor, { cuerpo, firma: firmar(cuerpo) })
  await esperar(60)
  afirmar(enviados.length === 1 && /número de ticket/.test(enviados[0].texto), 'primera vez -> responde')

  cuerpo = mensajeEntrante('sigue ahí?', { from: '56911112222' })
  await pedir(servidor, { cuerpo, firma: firmar(cuerpo) })
  await esperar(60)
  afirmar(enviados.length === 2, 'segunda vez seguida -> TAMBIÉN responde, nunca se queda callado', enviados.length)

  console.log('\n── Reintentos de Meta (mismo id de mensaje)\n')
  enviados.length = 0
  cuerpo = mensajeEntrante('111222', { id: 'wamid.repetido' })
  await pedir(servidor, { cuerpo, firma: firmar(cuerpo) })
  await esperar(60)
  await pedir(servidor, { cuerpo, firma: firmar(cuerpo) })
  await esperar(60)
  afirmar(enviados.length === 1, 'el vecino recibe UNA sola respuesta', enviados.length)

  console.log('\n── Tope de consultas por número (cuota de Firestore)\n')
  enviados.length = 0
  const antes = lecturas
  for (let i = 0; i < 15; i++) {
    const c = mensajeEntrante('482173', { id: 'wamid.spam' + i, from: '56933334444' })
    await pedir(servidor, { c: 0, cuerpo: c, firma: firmar(c) })
  }
  await esperar(200)
  afirmar(enviados.length <= 10, `corta pasadas las 10 consultas por minuto (respondió ${enviados.length})`)
  afirmar(lecturas - antes <= 10, `no sigue leyendo Firestore después del tope (${lecturas - antes} lecturas)`)

  console.log('\n── Mensajes que no son texto (audio, foto)\n')
  enviados.length = 0
  cuerpo = JSON.stringify({
    entry: [{ changes: [{ value: { messages: [{ id: 'wamid.audio', from: '56955556666', type: 'audio' }] } }] }],
  })
  await pedir(servidor, { cuerpo, firma: firmar(cuerpo) })
  await esperar(60)
  afirmar(enviados.length === 1 && /número de ticket/.test(enviados[0].texto), 'le explica qué mandar en vez de ignorarlo')

  console.log('\n── Avisos de entrega fallida\n')
  cuerpo = JSON.stringify({
    entry: [
      {
        changes: [
          {
            value: {
              statuses: [
                { status: 'failed', recipient_id: '56999998888', errors: [{ code: 131026, title: 'no tiene WhatsApp' }] },
                { status: 'delivered', recipient_id: '56977701624' },
              ],
            },
          },
        ],
      },
    ],
  })
  r = await pedir(servidor, { cuerpo, firma: firmar(cuerpo) })
  await esperar(60)
  afirmar(r.status === 200, 'acepta el aviso de estado sin caerse', r.status)

  console.log('\n── Cuerpo inesperado (que no tumbe el servicio)\n')
  for (const raro of ['{}', '{"entry":[]}', '{"entry":[{"changes":[{}]}]}', '{"entry":null}']) {
    r = await pedir(servidor, { cuerpo: raro, firma: firmar(raro) })
    afirmar(r.status === 200, `sobrevive a ${raro}`, r.status)
  }

  servidor.close()
  console.log(`\n  ${ok} pruebas OK, ${fallos} fallando.\n`)
  process.exit(fallos === 0 ? 0 : 1)
}

main()
