// Revisión diaria de todos los sistemas de TuMuniAquí.
//
// Qué es esto y en qué se diferencia del vigilante de cada 30 minutos
// (.github/workflows/vigilar.yml):
//
//   - El vigilante contesta "¿se cayó algo AHORA?" y avisa rápido. Mira dos
//     cosas: el sitio del vecino y /salud del bot.
//   - Esto contesta "¿está TODO sano?" una vez al día, con calma: la app, la
//     landing comercial, el bot, la PWA, los certificados. Cosas que no se
//     caen de golpe pero se pudren despacio — un certificado que vence en 12
//     días, la landing que nadie mira hace un mes, un deploy que dejó el
//     bundle roto pero el HTML sigue respondiendo 200.
//
// Vive en un script y no dentro del YAML a propósito: así se puede correr a
// mano (`node scripts/revisar-sistemas.mjs`) cuando uno quiere saber cómo está
// el servicio, sin esperar a las 9 ni abrir GitHub.
//
// Sin dependencias: solo Node 18+ (fetch y node:tls vienen incluidos). Una
// revisión que necesita `npm install` para correr es una revisión que un día
// no corre.

import tls from 'node:tls'
import fs from 'node:fs'

// --- Qué se revisa ----------------------------------------------------------
// Todo configurable por variable de entorno para poder apuntar a otra
// instalación (otra municipalidad, un entorno de prueba) sin tocar el código.
const URL_APP = (process.env.URL_APP || 'https://app-incidencias-urbanas.web.app').replace(/\/$/, '')
const URL_LANDING = (process.env.URL_LANDING || 'https://tumuniaqui.web.app').replace(/\/$/, '')
// Si falta la variable URL_BOT se usa la dirección conocida de Render. El
// vigilante de 30 minutos prefiere no revisar nada antes que revisar una URL
// adivinada; acá se asume la conocida y se deja dicho cuál se usó, porque una
// revisión diaria que se salta el sistema más frágil no sirve de mucho.
const URL_BOT = (process.env.URL_BOT || 'https://proyectomuni.onrender.com').replace(/\/$/, '')
const MUNICIPIO = process.env.MUNICIPIO_SLUG || 'licanten'

// Un certificado se renueva solo, pero cuando no lo hace uno se entera con el
// navegador gritando en rojo. Dos semanas alcanzan para reaccionar sin correr.
const DIAS_AVISO_CERTIFICADO = 15

// Render en plan gratis duerme el servicio y despertarlo toma su tiempo.
// Confundir "estaba dormido" con "está caído" es la forma más rápida de que
// una alerta se vuelva ruido que nadie mira.
const ESPERA_BOT_MS = 60_000
const ESPERA_WEB_MS = 30_000

// --- Utilidades -------------------------------------------------------------

const resultados = []

/**
 * ok       = todo bien
 * aviso    = mirar sin apuro (no tumba la corrida)
 * falla    = hay que arreglarlo hoy
 * omitido  = no se pudo revisar; ni bueno ni malo, pero no hay que contarlo
 *            como "todo en orden" porque nadie lo miró
 */
function anotar(sistema, estado, detalle) {
  resultados.push({ sistema, estado, detalle })
  const icono = { ok: '✅', aviso: '⚠️ ', falla: '❌', omitido: '➖' }[estado]
  console.log(`${icono} ${sistema}: ${detalle}`)
}

/**
 * Anota una falla, salvo que la respuesta venga del proxy de la red y no del
 * servicio: eso es "no se pudo revisar", no "está caído", y llamarlo falla
 * mandaría a buscar un incendio que no existe.
 */
function problema(sistema, respuesta, mensaje) {
  if (respuesta.bloqueadoPorLaRed) {
    anotar(sistema, 'omitido', 'no se pudo revisar: la red desde donde corre esta revisión bloquea el dominio (no es una caída del servicio)')
    return
  }
  anotar(sistema, 'falla', mensaje)
}

async function pedir(url, ms = ESPERA_WEB_MS) {
  try {
    const respuesta = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(ms),
      // Firebase Hosting responde con caché agresiva en /assets. Sin esto se
      // podría estar revisando una copia guardada y no lo que se sirve hoy.
      headers: { 'Cache-Control': 'no-cache' },
    })
    const cuerpo = await respuesta.text()
    // Un 403 con "allowlist" no lo manda el servicio: lo manda el proxy de la
    // red desde donde se está revisando (entornos con salida restringida). Sin
    // distinguirlo, correr esto desde una red así reporta el servicio entero
    // caído cuando está perfecto.
    const bloqueadoPorLaRed = respuesta.status === 403 && /allowlist|egress|proxy/i.test(cuerpo)
    return { ok: true, estado: respuesta.status, cuerpo, bloqueadoPorLaRed }
  } catch (error) {
    // Un timeout y un DNS que no resuelve son problemas muy distintos y el
    // mensaje de Node ya los distingue; se pasa tal cual en vez de resumirlo.
    return { ok: false, estado: 0, cuerpo: '', error: error.message || String(error) }
  }
}

// --- Revisiones -------------------------------------------------------------

/**
 * La app de los vecinos. No basta con el 200: es una SPA y Firebase Hosting
 * devuelve el mismo index.html para cualquier ruta, así que un 200 solo prueba
 * que Hosting está vivo, no que la app sirva. Lo que de verdad importa es que
 * el HTML traiga el bundle y que ese bundle se pueda descargar — el caso real
 * de §23 fue justo ese: sitio "arriba", JavaScript equivocado, vecino mirando
 * una pantalla de carga eterna.
 */
async function revisarApp() {
  const url = `${URL_APP}/${MUNICIPIO}`
  const pagina = await pedir(url)

  if (!pagina.ok) {
    anotar('App (sitio del vecino)', 'falla', `no responde: ${pagina.error} (${url})`)
    return null
  }
  if (pagina.estado !== 200) {
    problema('App (sitio del vecino)', pagina, `HTTP ${pagina.estado} en ${url}`)
    return null
  }

  const bundle = pagina.cuerpo.match(/src="(\/assets\/index-[^"]+\.js)"/)
  if (!bundle) {
    anotar(
      'App (sitio del vecino)',
      'falla',
      'el HTML responde pero no incluye el bundle de JavaScript: lo publicado no es un build válido'
    )
    return null
  }

  const js = await pedir(`${URL_APP}${bundle[1]}`)
  if (!js.ok || js.estado !== 200) {
    anotar(
      'App (sitio del vecino)',
      'falla',
      `el HTML pide ${bundle[1]} pero ese archivo responde ${js.estado || js.error}: la app no llega a arrancar`
    )
    return bundle[1]
  }
  // Un bundle de React con Firebase, Leaflet y Recharts pesa cientos de KB. Si
  // llega algo diminuto es una página de error disfrazada de 200.
  const kb = Math.round(js.cuerpo.length / 1024)
  if (kb < 100) {
    anotar('App (sitio del vecino)', 'falla', `el bundle servido pesa ${kb} KB; es demasiado poco para ser el real`)
    return bundle[1]
  }

  anotar('App (sitio del vecino)', 'ok', `responde y sirve ${bundle[1]} (${kb} KB)`)
  return bundle[1]
}

/**
 * Portal de consulta de ticket: es la dirección que el bot le manda por
 * WhatsApp a cada vecino ("revisa tu ticket acá"). Si esa ruta se rompe, el
 * mensaje ya salió y el vecino queda con un enlace muerto en la mano.
 */
async function revisarPortalEstado() {
  const url = `${URL_APP}/${MUNICIPIO}/estado`
  const respuesta = await pedir(url)
  if (!respuesta.ok || respuesta.estado !== 200) {
    problema('Portal de consulta de ticket', respuesta, `HTTP ${respuesta.estado || respuesta.error} en ${url}`)
    return
  }
  anotar('Portal de consulta de ticket', 'ok', `responde (${url})`)
}

/**
 * La landing comercial (tumuniaqui.web.app) vive en otro sitio de Hosting y
 * hasta ahora no la revisaba nadie. Es la cara que ven las municipalidades que
 * podrían contratar: caída una semana no rompe el servicio, pero cuesta plata.
 */
async function revisarLanding() {
  const respuesta = await pedir(URL_LANDING)
  if (!respuesta.ok || respuesta.estado !== 200) {
    problema('Landing comercial', respuesta, `HTTP ${respuesta.estado || respuesta.error} en ${URL_LANDING}`)
    return
  }
  if (respuesta.cuerpo.length < 500) {
    anotar('Landing comercial', 'falla', `responde 200 pero devuelve una página casi vacía (${respuesta.cuerpo.length} bytes)`)
    return
  }
  anotar('Landing comercial', 'ok', `responde (${Math.round(respuesta.cuerpo.length / 1024)} KB)`)
}

/**
 * PWA: manifest e ícono. Si el manifest se cae, el vecino que agregó la app a
 * su pantalla de inicio deja de tenerla como app. Nadie reclama por esto —
 * simplemente se degrada en silencio, que es la razón de revisarlo.
 */
async function revisarPwa() {
  const manifest = await pedir(`${URL_APP}/manifest.json`)
  if (!manifest.ok || manifest.estado !== 200) {
    problema('PWA (manifest e íconos)', manifest, `manifest.json responde ${manifest.estado || manifest.error}`)
    return
  }
  try {
    const datos = JSON.parse(manifest.cuerpo)
    if (!datos.name || !Array.isArray(datos.icons) || datos.icons.length === 0) {
      anotar('PWA (manifest e íconos)', 'aviso', 'el manifest se sirve pero le faltan nombre o íconos')
      return
    }
  } catch {
    anotar('PWA (manifest e íconos)', 'falla', 'manifest.json responde 200 pero no es JSON válido')
    return
  }

  const icono = await pedir(`${URL_APP}/icons/icon-192.png`)
  if (!icono.ok || icono.estado !== 200) {
    anotar('PWA (manifest e íconos)', 'aviso', `el manifest está bien pero el ícono responde ${icono.estado || icono.error}`)
    return
  }
  anotar('PWA (manifest e íconos)', 'ok', 'manifest válido e ícono disponible')
}

/**
 * El bot de WhatsApp. /salud no dice "el proceso está vivo" sino "los avisos
 * están saliendo", que es lo que se rompió durante 19 horas el 9-ago sin que
 * nadie se enterara. Acá se guarda además el detalle aunque esté todo bien:
 * ver un día tras otro cuántos avisos quedaron pendientes es lo que permite
 * notar que algo se está degradando antes de que se caiga del todo.
 */
async function revisarBot() {
  const raiz = await pedir(URL_BOT, ESPERA_BOT_MS)
  if (!raiz.ok) {
    anotar('Bot de WhatsApp (proceso)', 'falla', `no responde: ${raiz.error} (${URL_BOT})`)
    return
  }
  if (raiz.estado !== 200) {
    problema('Bot de WhatsApp (proceso)', raiz, `HTTP ${raiz.estado} en ${URL_BOT}`)
    if (raiz.bloqueadoPorLaRed) return
  } else {
    anotar('Bot de WhatsApp (proceso)', 'ok', `el servicio en Render responde (${URL_BOT})`)
  }

  const salud = await pedir(`${URL_BOT}/salud`, ESPERA_BOT_MS)
  if (!salud.ok) {
    anotar('Bot de WhatsApp (avisos saliendo)', 'falla', `/salud no responde: ${salud.error}`)
    return
  }
  if (salud.estado === 404) {
    // Render contesta 404 en cualquier subdominio suyo sin dueño, así que una
    // dirección equivocada se ve igual que un servicio caído. Distinguirlo
    // evita mandar a revisar los registros de Render cuando el problema está
    // en la configuración.
    anotar(
      'Bot de WhatsApp (avisos saliendo)',
      'falla',
      `no existe /salud en ${URL_BOT}. O la variable URL_BOT apunta a otro lado, o ese servicio corre una versión anterior a este endpoint`
    )
    return
  }

  let informe = null
  try {
    informe = JSON.parse(salud.cuerpo)
  } catch {
    /* se maneja abajo: sin JSON igual sirve el código HTTP */
  }

  const problemas = informe?.problemas?.length ? informe.problemas.join('; ') : null

  // Los números vienen anidados en "detalle" (ver diagnostico() en
  // whatsapp-api-oficial/vigilancia.js). Se anotan aunque esté todo bien: ver
  // día a día cuántos avisos quedaron esperando y hace cuánto que no sale uno
  // es lo que deja notar una degradación antes de que se convierta en corte.
  const d = informe?.detalle || {}
  const resumen = informe
    ? [
        `enviados ${d.totalEnviados ?? '?'}`,
        `fallidos ${d.totalFallidos ?? '?'}`,
        `pendientes ${d.avisosPendientes ?? '?'}`,
        // null = todavía no sale ningún aviso desde que arrancó el proceso.
        // No es una falla (Render reinicia el servicio a menudo en plan gratis),
        // pero conviene que se vea.
        d.minutosDesdeUltimoEnvioOk === null || d.minutosDesdeUltimoEnvioOk === undefined
          ? 'sin envíos desde el último arranque'
          : `último envío hace ${d.minutosDesdeUltimoEnvioOk} min`,
        `arriba hace ${d.minutosArriba ?? '?'} min`,
      ].join(', ')
    : salud.cuerpo.slice(0, 200)

  if (salud.estado !== 200) {
    problema('Bot de WhatsApp (avisos saliendo)', salud, `HTTP ${salud.estado} — ${problemas || resumen}`)
    return
  }
  anotar('Bot de WhatsApp (avisos saliendo)', 'ok', resumen)
}

/**
 * Certificados TLS. Los renueva Firebase solo, pero "lo renueva solo" es
 * exactamente el tipo de cosa que uno da por hecha hasta el día que no pasa, y
 * ese día el navegador del vecino muestra una advertencia de sitio inseguro.
 */
async function revisarCertificado(nombre, url) {
  const host = new URL(url).hostname
  const dias = await new Promise((resolver) => {
    const socket = tls.connect({ host, port: 443, servername: host, timeout: 15_000 }, () => {
      const cert = socket.getPeerCertificate()
      socket.end()
      if (!cert || !cert.valid_to) return resolver(null)
      resolver(Math.floor((new Date(cert.valid_to) - Date.now()) / 86_400_000))
    })
    socket.on('error', () => resolver(null))
    socket.on('timeout', () => {
      socket.destroy()
      resolver(null)
    })
  })

  if (dias === null) {
    anotar(`Certificado (${nombre})`, 'aviso', `no se pudo leer el certificado de ${host}`)
    return
  }
  if (dias < 0) {
    anotar(`Certificado (${nombre})`, 'falla', `VENCIDO hace ${Math.abs(dias)} días en ${host}`)
    return
  }
  if (dias <= DIAS_AVISO_CERTIFICADO) {
    anotar(`Certificado (${nombre})`, 'aviso', `vence en ${dias} días (${host})`)
    return
  }
  anotar(`Certificado (${nombre})`, 'ok', `válido ${dias} días más (${host})`)
}

/**
 * Lo desplegado vs. lo commiteado. El error más repetido de este proyecto
 * (§23, §26): el código está en main, todo verde, y en producción sigue
 * corriendo un build anterior — sin ningún síntoma visible hasta que alguien
 * nota que una función nueva simplemente no existe para los vecinos.
 *
 * Se compara el nombre del bundle servido con el que produce un build local.
 * Vite le pone al archivo un hash de su contenido, así que mismo código =
 * mismo nombre. Es un AVISO y no una falla a propósito: el hash también puede
 * cambiar por una diferencia de entorno al compilar, y una alarma que a veces
 * miente termina ignorándose junto con las que no mienten.
 */
function revisarDespliegue(bundleServido) {
  const local = process.env.BUNDLE_LOCAL
  if (!bundleServido || !local) return // sin build local no hay nada que comparar

  const servido = bundleServido.split('/').pop()
  if (servido === local) {
    anotar('Despliegue al día', 'ok', `producción sirve el mismo bundle que compila el código actual (${servido})`)
    return
  }
  anotar(
    'Despliegue al día',
    'aviso',
    `producción sirve ${servido} y el código actual compila ${local}. O falta desplegar, o el build cambió por el entorno. Comprobar con: npm run build && npx firebase deploy --only hosting`
  )
}

// --- Informe ----------------------------------------------------------------

function escribirInforme() {
  const fallas = resultados.filter((r) => r.estado === 'falla')
  const avisos = resultados.filter((r) => r.estado === 'aviso')
  const omitidos = resultados.filter((r) => r.estado === 'omitido')

  // "Todo en orden" solo se dice cuando de verdad se miró todo: un resumen
  // tranquilizador sobre revisiones que no se pudieron hacer es peor que no
  // tener resumen.
  const encabezado = fallas.length
    ? `**${fallas.length} problema(s)**, ${avisos.length} aviso(s), ${omitidos.length} sin revisar.`
    : omitidos.length
      ? `Sin problemas en lo que se pudo revisar, pero ${omitidos.length} sistema(s) quedaron sin revisar.`
      : avisos.length
        ? `Todo funcionando, con ${avisos.length} aviso(s) para mirar sin apuro.`
        : 'Todos los sistemas funcionando.'

  const lineas = [
    `### Revisión diaria de sistemas — ${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC`,
    '',
    encabezado,
    '',
    '| Sistema | Estado | Detalle |',
    '| --- | --- | --- |',
    ...resultados.map(
      (r) =>
        `| ${r.sistema} | ${{ ok: '✅ ok', aviso: '⚠️ aviso', falla: '❌ falla', omitido: '➖ sin revisar' }[r.estado]} | ${r.detalle.replace(/\|/g, '\\|')} |`
    ),
  ]

  const informe = lineas.join('\n')
  console.log('\n' + informe)

  // En GitHub Actions el mismo informe queda en el resumen de la corrida, y el
  // detalle de las fallas sale como salida para que el paso siguiente decida
  // si abre un aviso.
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, informe + '\n')
  }
  if (process.env.GITHUB_OUTPUT) {
    const detalle = [...fallas, ...avisos, ...omitidos]
      .map(
        (r) =>
          `- ${{ falla: '**Falla**', aviso: 'Aviso', omitido: 'Sin revisar' }[r.estado]} — ${r.sistema}: ${r.detalle}`
      )
      .join('\n')
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `hay=${fallas.length ? 'si' : 'no'}\ndetalle<<FIN\n${detalle}\nFIN\n`
    )
  }

  return fallas.length
}

// --- Corrida ----------------------------------------------------------------

console.log(`Revisando todos los sistemas de TuMuniAquí (${new Date().toISOString()})\n`)

const bundle = await revisarApp()
await revisarPortalEstado()
await revisarPwa()
await revisarLanding()
await revisarBot()
await revisarCertificado('app', URL_APP)
await revisarCertificado('landing', URL_LANDING)
revisarDespliegue(bundle)

const fallas = escribirInforme()
// Los avisos no tumban la corrida: si un certificado a 12 días dejara la
// revisión en rojo todos los días durante dos semanas, el rojo dejaría de
// significar algo.
process.exit(fallas ? 1 : 0)
