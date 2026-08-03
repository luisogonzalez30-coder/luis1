import 'dotenv/config'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, doc, getDoc, getDocs, collection, query, where, onSnapshot, updateDoc } from 'firebase/firestore'
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import qrcode from 'qrcode-terminal'
import pino from 'pino'
import { CATEGORIAS } from '../src/utils/categorias.js'
import { formatearFecha } from '../src/utils/tiempo.js'

const VARS_REQUERIDAS = [
  'FIREBASE_API_KEY', 'FIREBASE_AUTH_DOMAIN', 'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET', 'FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_APP_ID',
  'BOT_FUNCIONARIO_EMAIL', 'BOT_FUNCIONARIO_PASSWORD',
]
const faltantes = VARS_REQUERIDAS.filter((clave) => !process.env[clave])
if (faltantes.length > 0) {
  console.error(`[bot] Faltan variables en .env: ${faltantes.join(', ')}. Copia .env.example a .env y complétalo.`)
  process.exit(1)
}

const PORTAL_URL_ESTADO = process.env.PORTAL_URL_ESTADO || 'https://app-incidencias-urbanas.web.app/estado'

// categoria se guarda como slug interno (ej. "Arbol_caido"); CATEGORIAS (mismo
// catálogo que usa el formulario ciudadano) trae la etiqueta legible ("Árbol
// caído o en riesgo") — se reusa desde ahí para no duplicar la lista acá.
const ETIQUETA_POR_VALOR = Object.fromEntries(CATEGORIAS.map((c) => [c.valor, c.etiqueta]))
function etiquetaCategoria(valorCategoria) {
  return ETIQUETA_POR_VALOR[valorCategoria] || valorCategoria
}

const app = initializeApp({
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
})
const auth = getAuth(app)
const db = getFirestore(app)
const logger = pino({ level: 'silent' })

// Desde el 02-ago-2026 el formulario exige un celular chileno válido y lo
// guarda normalizado (§29), pero en reportes anteriores contacto_ciudadano
// tiene lo que el vecino haya tecleado: correos, nombres ("gonzalez"), números
// a medias. Se exige una cantidad de dígitos plausible para no ir a preguntarle
// a WhatsApp por cosas que claramente no son un teléfono.
function pareceTelefono(contacto) {
  if (!contacto || contacto.includes('@')) return false
  const digitos = contacto.replace(/\D/g, '')
  return digitos.length >= 8 && digitos.length <= 12
}

// Baileys espera el número en formato E.164 sin "+". El ciudadano puede haber
// escrito "+56 9 1234 5678", "56912345678" o "912345678" (sin código de país,
// caso más común) — se limpia y se antepone 56 (Chile) si hace falta.
function normalizarNumero(contacto) {
  const soloDigitos = contacto.replace(/\D/g, '')
  return soloDigitos.startsWith('56') ? soloDigitos : `56${soloDigitos}`
}

function saludoPara(incidencia) {
  return incidencia.nombre_ciudadano ? `Hola ${incidencia.nombre_ciudadano}` : 'Hola'
}

// Los 3 momentos del ciclo de vida que el bot notifica por WhatsApp. Cada uno
// tiene su propia bandera en el documento (independientes entre sí) para poder
// avisar varias veces por incidencia sin repetirse — ver notificado_whatsapp_*
// en incidenciasService.js.
const TIPOS_NOTIFICACION = [
  {
    tipo: 'creación',
    campo: 'notificado_whatsapp_creacion',
    filtroEstado: null, // se detecta apenas se crea, sin importar el estado en que esté
    construirMensaje: (incidencia, nombreMunicipio) =>
      `${saludoPara(incidencia)}, recibimos tu reporte de "${etiquetaCategoria(incidencia.categoria)}" en ${nombreMunicipio}. Tu número de ticket es *${incidencia.numero_ticket}* — guárdalo para hacer seguimiento.\n\nConsulta el estado cuando quieras acá: ${PORTAL_URL_ESTADO}`,
    obtenerFoto: (incidencia) => incidencia.fotos_antes_urls?.[0],
  },
  {
    tipo: 'asignación',
    campo: 'notificado_whatsapp_asignacion',
    filtroEstado: 'En Proceso',
    construirMensaje: (incidencia, nombreMunicipio) =>
      `${saludoPara(incidencia)}, tu reporte de "${etiquetaCategoria(incidencia.categoria)}" (ticket ${incidencia.numero_ticket}) fue asignado a una cuadrilla de ${nombreMunicipio}. Pronto lo van a resolver.\n\nVer detalle: ${PORTAL_URL_ESTADO}`,
    obtenerFoto: () => undefined,
  },
  {
    tipo: 'resuelto',
    campo: 'notificado_whatsapp',
    filtroEstado: 'Resuelto',
    construirMensaje: (incidencia, nombreMunicipio) =>
      `${saludoPara(incidencia)}, tu reporte de "${etiquetaCategoria(incidencia.categoria)}" (ticket ${incidencia.numero_ticket}) fue resuelto por ${nombreMunicipio}. Gracias por avisarnos.\n\nPuedes ver el detalle acá: ${PORTAL_URL_ESTADO}`,
    obtenerFoto: (incidencia) => incidencia.foto_despues_url || incidencia.fotos_antes_urls?.[0],
  },
]

// --- Alerta de emergencia al Alcalde ---
// Cuando entra una incidencia de gravedad Alta (riesgo a las personas: fuga de
// gas, cableado expuesto, socavón, árbol caído...) el bot le escribe al celular
// del Alcalde. El escenario que esto evita es que el Alcalde se entere de algo
// grave por un vecino enojado en redes sociales antes que por su propio
// municipio.
//
// El número sale de municipalidades/{id}.whatsapp_alcalde — si el municipio no
// lo configuró, la alerta simplemente no corre (no es obligatorio).
async function procesarEmergencia(sock, incidenciaId, incidencia, municipio) {
  const refIncidencia = doc(db, 'incidencias', incidenciaId)

  // Si el bot estuvo apagado y el caso ya se resolvió, avisar ahora sería ruido:
  // se marca como alertado y no se manda nada.
  if (incidencia.estado === 'Resuelto') {
    await updateDoc(refIncidencia, { alertado_alcalde: true })
    return
  }

  const numero = normalizarNumero(municipio.whatsapp_alcalde)

  try {
    const [resultado] = await sock.onWhatsApp(numero)
    if (!resultado?.exists) {
      console.warn(`[bot] ${incidencia.numero_ticket} (emergencia): el número del Alcalde (${numero}) no tiene WhatsApp. Revisa municipalidades/${municipio.id}.whatsapp_alcalde`)
      await updateDoc(refIncidencia, { alertado_alcalde: true })
      return
    }

    const lineas = [
      '🚨 *EMERGENCIA REPORTADA*',
      '',
      `*${etiquetaCategoria(incidencia.categoria)}*`,
      `Reporte ${formatearTicket(incidencia.numero_ticket)} · ${incidencia.departamento || 'Sin departamento'}`,
    ]
    if (incidencia.direccion_texto) lineas.push(`📍 ${incidencia.direccion_texto}`)
    if (incidencia.detalles_adicionales) lineas.push(`"${incidencia.detalles_adicionales}"`)
    if (incidencia.coordenadas?.lat) {
      lineas.push(`Ubicación exacta: https://www.google.com/maps?q=${incidencia.coordenadas.lat},${incidencia.coordenadas.lng}`)
    }
    lineas.push('', `Ingresado: ${formatearFecha(incidencia.fecha_creacion)}`)
    lineas.push('', 'Todavía sin cuadrilla asignada. Revisa el panel para asignarla.')

    const mensaje = lineas.join('\n')
    const fotoUrl = incidencia.fotos_antes_urls?.[0]

    await sock.sendMessage(resultado.jid, fotoUrl ? { image: { url: fotoUrl }, caption: mensaje } : { text: mensaje })
    await updateDoc(refIncidencia, { alertado_alcalde: true })
    console.log(`[bot] ${incidencia.numero_ticket} (emergencia): alerta enviada al Alcalde (${numero}).`)
  } catch (error) {
    // Igual que el resto: si falla no se marca la bandera, así se reintenta sola.
    console.error(`[bot] ${incidencia.numero_ticket} (emergencia): falló la alerta al Alcalde.`, error?.message || error)
  }
}

function escucharEmergencias(sock, municipio) {
  if (!municipio.whatsapp_alcalde) {
    console.log('[bot] Sin alerta de emergencias: la municipalidad no tiene "whatsapp_alcalde" configurado.')
    return
  }

  const q = query(
    collection(db, 'incidencias'),
    where('municipio_id', '==', municipio.id),
    where('nivel_gravedad', '==', 'Alta'),
    where('alertado_alcalde', '==', false)
  )

  onSnapshot(
    q,
    (snapshot) => {
      snapshot.docChanges().forEach((cambio) => {
        if (cambio.type === 'added') procesarEmergencia(sock, cambio.doc.id, cambio.doc.data(), municipio)
      })
    },
    (error) => console.error('[bot] Error escuchando emergencias:', error?.message || error)
  )

  console.log(`[bot] Alertas de emergencia activas hacia el Alcalde (${municipio.whatsapp_alcalde}).`)
}

async function procesarNotificacion(sock, incidenciaId, incidencia, nombreMunicipio, config) {
  const { tipo, campo, construirMensaje, obtenerFoto } = config
  const refIncidencia = doc(db, 'incidencias', incidenciaId)

  if (!pareceTelefono(incidencia.contacto_ciudadano)) {
    // Sin contacto, o el contacto es un correo: no hay a quién mandarle WhatsApp.
    // Se marca igual como notificado para que no se vuelva a evaluar en cada reinicio.
    console.log(`[bot] ${incidencia.numero_ticket} (${tipo}): sin contacto tipo teléfono (valor: "${incidencia.contacto_ciudadano || ''}"), no se envía WhatsApp.`)
    await updateDoc(refIncidencia, { [campo]: true })
    return
  }

  const numero = normalizarNumero(incidencia.contacto_ciudadano)

  try {
    const [resultado] = await sock.onWhatsApp(numero)
    if (!resultado?.exists) {
      console.warn(`[bot] ${incidencia.numero_ticket} (${tipo}): el número ${numero} no tiene WhatsApp registrado. No se pudo notificar.`)
      await updateDoc(refIncidencia, { [campo]: true })
      return
    }

    const mensaje = construirMensaje(incidencia, nombreMunicipio)
    const fotoUrl = obtenerFoto(incidencia)
    const contenido = fotoUrl ? { image: { url: fotoUrl }, caption: mensaje } : { text: mensaje }

    await sock.sendMessage(resultado.jid, contenido)
    await updateDoc(refIncidencia, { [campo]: true })
    console.log(`[bot] ${incidencia.numero_ticket} (${tipo}): WhatsApp enviado a ${numero}.`)
  } catch (error) {
    // OJO: acá NO se marca la bandera -- si el envío falló (ej. WhatsApp
    // desconectado en ese momento), esta incidencia vuelve a aparecer como "added"
    // la próxima vez que el bot arranque y se reintenta sola.
    console.error(`[bot] ${incidencia.numero_ticket} (${tipo}): falló el envío de WhatsApp.`, error?.message || error)
  }
}

const ESTADO_LEGIBLE = {
  Pendiente: 'Pendiente de asignar',
  'En Proceso': 'En proceso (cuadrilla asignada)',
  Resuelto: 'Resuelto',
}

// Números de ticket. El formato actual son 6 dígitos ("482173", que se muestra
// como "482 173"); el viejo era "INC-YYYYMMDD-XXXX" y se sigue reconociendo
// porque hay vecinos con uno de esos anotado. Insensible a mayúsculas.
const REGEX_TICKET_NUEVO = /\b(\d{3})\s?(\d{3})\b/
const REGEX_TICKET_VIEJO = /INC-\d{8}-[0-9A-F]{4}/i

// "mis reportes", "mis reporte", "mis tickets", "mis solicitudes"...
const REGEX_MIS_REPORTES = /\bmis\s+(reportes?|tickets?|solicitudes?|numeros?|números?)\b/i

function extraerNumeroTicket(texto) {
  const viejo = texto.match(REGEX_TICKET_VIEJO)
  if (viejo) return viejo[0].toUpperCase()
  const nuevo = texto.match(REGEX_TICKET_NUEVO)
  return nuevo ? `${nuevo[1]}${nuevo[2]}` : null
}

// Variantes con las que un mismo teléfono puede estar guardado en
// contacto_ciudadano, a partir del JID de WhatsApp ("56912345678@s.whatsapp.net").
//
// Desde el 02-ago-2026 la app guarda siempre "+56912345678" normalizado
// (utils/telefono.js), pero los reportes ANTERIORES tienen lo que el vecino
// haya tecleado: "9999999999", "56912345678", etc. Se prueban las formas más
// comunes para que "mis reportes" también encuentre los reportes viejos.
// Las que llevan espacios o puntos quedan fuera: son infinitas y no vale la
// pena — ese vecino igual puede consultar con su número de reporte.
function variantesTelefono(jid) {
  const digitos = (jid || '').split('@')[0].replace(/\D/g, '')
  if (!digitos) return []

  const variantes = new Set([`+${digitos}`, digitos])
  // "56912345678" → también "912345678" (como lo escribiría alguien en Chile).
  if (digitos.startsWith('56') && digitos.length === 11) {
    const sinPais = digitos.slice(2)
    variantes.add(sinPais)
    variantes.add(`+${sinPais}`)
  }
  return [...variantes]
}

// Permite que el ciudadano consulte el estado de su reporte escribiéndole
// directo al bot (sin tener que abrir /estado). Solo responde si el mensaje
// contiene algo con forma de ticket — cualquier otro mensaje se ignora, para no
// contestar con ruido si alguien le escribe otra cosa al número del municipio.
async function responderConsultaTicket(sock, remitenteJid, textoMensaje, mensajeOriginal) {
  const numeroTicket = extraerNumeroTicket(textoMensaje)
  if (!numeroTicket) return false

  const snap = await getDoc(doc(db, 'tickets_publicos', numeroTicket))

  const respuesta = snap.exists()
    ? construirRespuestaEstado(numeroTicket, snap.data())
    : `No encontré ningún reporte con el número *${formatearTicket(numeroTicket)}*. Revisa que esté bien escrito, o consulta en ${PORTAL_URL_ESTADO}`

  await sock.sendMessage(remitenteJid, { text: respuesta }, { quoted: mensajeOriginal })
  console.log(`[bot] Respondida consulta de estado para ${numeroTicket} a ${remitenteJid}.`)
  return true
}

// Recuperación de tickets sin pedir datos personales (reemplaza a la búsqueda
// por RUT, ver §29): el vecino escribe "mis reportes" y el bot le contesta con
// los suyos. La identidad es el propio número de WhatsApp desde el que escribe,
// y la respuesta llega SOLO a ese número — nadie puede pedir los de otro.
async function responderMisReportes(sock, remitenteJid, municipioId, mensajeOriginal) {
  const variantes = variantesTelefono(remitenteJid)
  if (variantes.length === 0) return false

  // Dos filtros de igualdad, sin orderBy: Firestore los resuelve sin índice
  // compuesto (verificado contra el proyecto real). Una consulta por variante;
  // son pocas y esto solo corre cuando alguien escribe "mis reportes".
  const porId = new Map()
  for (const telefono of variantes) {
    const snap = await getDocs(query(
      collection(db, 'incidencias'),
      where('municipio_id', '==', municipioId),
      where('contacto_ciudadano', '==', telefono)
    ))
    // Map por id: si dos variantes trajeran el mismo reporte, no se duplica.
    snap.docs.forEach((d) => porId.set(d.id, d.data()))
  }

  if (porId.size === 0) {
    await sock.sendMessage(
      remitenteJid,
      { text: `No encontré reportes hechos desde este número. Si reportaste con otro teléfono, escríbeme desde ese, o consulta con tu número de reporte en ${PORTAL_URL_ESTADO}` },
      { quoted: mensajeOriginal }
    )
    return true
  }

  const reportes = [...porId.values()]
    .sort((a, b) => (b.fecha_creacion?.toMillis?.() || 0) - (a.fecha_creacion?.toMillis?.() || 0))
    .slice(0, 10)

  const lineas = [`Estos son tus reportes (${reportes.length}):`, '']
  for (const r of reportes) {
    lineas.push(`*${formatearTicket(r.numero_ticket)}* — ${etiquetaCategoria(r.categoria)}`)
    lineas.push(`   ${ESTADO_LEGIBLE[r.estado] || r.estado} · ${formatearFecha(r.fecha_creacion)}`)
  }
  lineas.push('', `Detalle de cualquiera en ${PORTAL_URL_ESTADO}`)

  await sock.sendMessage(remitenteJid, { text: lineas.join('\n') }, { quoted: mensajeOriginal })
  console.log(`[bot] Enviada la lista de ${reportes.length} reporte(s) a ${remitenteJid}.`)
  return true
}

// "482173" → "482 173" (los tickets viejos se devuelven tal cual).
function formatearTicket(numeroTicket) {
  if (!numeroTicket) return ''
  return /^\d{6}$/.test(numeroTicket) ? `${numeroTicket.slice(0, 3)} ${numeroTicket.slice(3)}` : numeroTicket
}

function construirRespuestaEstado(numeroTicket, ticket) {
  const lineas = [
    `Reporte *${formatearTicket(numeroTicket)}*`,
    `Categoría: ${etiquetaCategoria(ticket.categoria)}`,
    `Estado: ${ESTADO_LEGIBLE[ticket.estado] || ticket.estado}`,
    `Creado: ${formatearFecha(ticket.fecha_creacion)}`,
  ]
  if (ticket.fecha_cierre) lineas.push(`Resuelto: ${formatearFecha(ticket.fecha_cierre)}`)
  lineas.push('', `Más detalle: ${PORTAL_URL_ESTADO}`)
  return lineas.join('\n')
}

function escucharMensajesEntrantes(sock, municipioId) {
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    for (const mensaje of messages) {
      const remoteJid = mensaje.key.remoteJid
      // Ignora: mensajes propios, sin contenido, y grupos/difusión (solo chats 1 a 1).
      if (mensaje.key.fromMe || !mensaje.message || !remoteJid?.endsWith('@s.whatsapp.net')) continue

      const texto = mensaje.message.conversation || mensaje.message.extendedTextMessage?.text || ''
      if (!texto) continue

      try {
        // "mis reportes" primero: si no, un mensaje como "mis 2 reportes"
        // podría confundirse con un número de ticket.
        if (REGEX_MIS_REPORTES.test(texto)) {
          await responderMisReportes(sock, remoteJid, municipioId, mensaje)
        } else {
          await responderConsultaTicket(sock, remoteJid, texto, mensaje)
        }
      } catch (error) {
        console.error('[bot] Error respondiendo mensaje entrante:', error?.message || error)
      }
    }
  })
}

function escucharNotificacion(sock, municipioId, nombreMunicipio, config) {
  const condiciones = [where('municipio_id', '==', municipioId)]
  if (config.filtroEstado) condiciones.push(where('estado', '==', config.filtroEstado))
  condiciones.push(where(config.campo, '==', false))

  const q = query(collection(db, 'incidencias'), ...condiciones)

  onSnapshot(
    q,
    (snapshot) => {
      // Solo se procesan los documentos que RECIÉN entraron al resultado (type
      // "added"). Si se procesara snapshot.docs completo en cada evento, cada
      // incidencia nueva reprocesaría también las que ya se notificaron hace
      // rato (siguen en el snapshot local hasta que el server confirma el update).
      snapshot.docChanges().forEach((cambio) => {
        if (cambio.type === 'added') {
          procesarNotificacion(sock, cambio.doc.id, cambio.doc.data(), nombreMunicipio, config)
        }
      })
    },
    (error) => {
      console.error(`[bot] Error escuchando notificaciones de "${config.tipo}":`, error?.message || error)
    }
  )

  console.log(`[bot] Escuchando notificaciones de "${config.tipo}" del municipio "${municipioId}"...`)
}

async function iniciarWhatsApp(municipio) {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info')
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({ version, auth: state, logger })

  sock.ev.on('creds.update', saveCreds)
  escucharMensajesEntrantes(sock, municipio.id)

  sock.ev.on('connection.update', (actualizacion) => {
    const { connection, lastDisconnect, qr } = actualizacion

    if (qr) {
      console.log('\n[bot] Escanea este código QR con WhatsApp (Dispositivos vinculados) en el celular +56977701624:\n')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'open') {
      console.log('[bot] Conectado a WhatsApp.')
      TIPOS_NOTIFICACION.forEach((config) => escucharNotificacion(sock, municipio.id, municipio.nombre, config))
      escucharEmergencias(sock, municipio)
    }

    if (connection === 'close') {
      const codigo = lastDisconnect?.error?.output?.statusCode
      if (codigo === DisconnectReason.loggedOut) {
        console.error('[bot] Sesión cerrada desde el celular. Borra la carpeta "auth_info" y vuelve a correr el bot para escanear el QR de nuevo.')
      } else {
        console.warn('[bot] Se cortó la conexión con WhatsApp, reconectando...')
        iniciarWhatsApp(municipio)
      }
    }
  })
}

async function main() {
  console.log('[bot] Iniciando sesión de funcionario...')
  const credencial = await signInWithEmailAndPassword(auth, process.env.BOT_FUNCIONARIO_EMAIL, process.env.BOT_FUNCIONARIO_PASSWORD)

  const perfilSnap = await getDoc(doc(db, 'usuarios_municipales', credencial.user.uid))
  if (!perfilSnap.exists()) {
    throw new Error('La cuenta inició sesión pero no tiene perfil en usuarios_municipales. ¿Se creó bien desde /dashboard/funcionarios?')
  }
  const perfil = perfilSnap.data()

  if (perfil.rol === 'JEFE_DEPARTAMENTO') {
    console.warn(`[bot] Advertencia: esta cuenta es JEFE_DEPARTAMENTO (${perfil.departamento}) y solo va a notificar incidencias de ese departamento. Se recomienda una cuenta TERRENO o ALCALDE_ADMIN para cubrir todo el municipio.`)
  }

  const municipioSnap = await getDoc(doc(db, 'municipalidades', perfil.municipio_id))
  const municipio = {
    id: perfil.municipio_id,
    nombre: municipioSnap.exists() ? municipioSnap.data().nombre : 'la Municipalidad',
    // Opcional: si no está configurado, no se mandan alertas de emergencia.
    whatsapp_alcalde: municipioSnap.exists() ? municipioSnap.data().whatsapp_alcalde : null,
  }

  console.log(`[bot] Sesión iniciada como ${perfil.nombre || perfil.email} (${perfil.rol}), municipio "${municipio.id}" (${municipio.nombre}).`)

  await iniciarWhatsApp(municipio)
}

main().catch((error) => {
  console.error('[bot] Error fatal al iniciar:', error?.message || error)
  process.exit(1)
})
