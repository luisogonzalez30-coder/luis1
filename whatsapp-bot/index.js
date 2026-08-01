import 'dotenv/config'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, doc, getDoc, collection, query, where, onSnapshot, updateDoc } from 'firebase/firestore'
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

// El contacto del ciudadano puede ser WhatsApp o correo (ver PasoFoto.jsx del
// front). Solo se intenta WhatsApp si no tiene forma de correo.
function pareceTelefono(contacto) {
  return Boolean(contacto) && !contacto.includes('@')
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

// Formato de generarNumeroTicket() (src/utils/ticket.js): "INC-YYYYMMDD-XXXX",
// XXXX son 4 caracteres hex. Insensible a mayúsculas: el ciudadano lo escribe a mano.
const REGEX_TICKET = /INC-\d{8}-[0-9A-F]{4}/i

// Permite que el ciudadano consulte el estado de su reporte escribiéndole
// directo al bot (sin tener que abrir /estado). Solo responde si el mensaje
// contiene algo con forma de ticket — cualquier otro mensaje se ignora, para no
// contestar con ruido si alguien le escribe otra cosa al número del municipio.
async function responderConsultaTicket(sock, remitenteJid, textoMensaje, mensajeOriginal) {
  const match = textoMensaje.match(REGEX_TICKET)
  if (!match) return

  const numeroTicket = match[0].toUpperCase()
  const snap = await getDoc(doc(db, 'tickets_publicos', numeroTicket))

  const respuesta = snap.exists()
    ? construirRespuestaEstado(numeroTicket, snap.data())
    : `No encontré ningún reporte con el ticket *${numeroTicket}*. Revisa que esté bien escrito, o consulta en ${PORTAL_URL_ESTADO}`

  await sock.sendMessage(remitenteJid, { text: respuesta }, { quoted: mensajeOriginal })
  console.log(`[bot] Respondida consulta de estado para ${numeroTicket} a ${remitenteJid}.`)
}

function construirRespuestaEstado(numeroTicket, ticket) {
  const lineas = [
    `Ticket *${numeroTicket}*`,
    `Categoría: ${etiquetaCategoria(ticket.categoria)}`,
    `Estado: ${ESTADO_LEGIBLE[ticket.estado] || ticket.estado}`,
    `Creado: ${formatearFecha(ticket.fecha_creacion)}`,
  ]
  if (ticket.fecha_cierre) lineas.push(`Resuelto: ${formatearFecha(ticket.fecha_cierre)}`)
  lineas.push('', `Más detalle: ${PORTAL_URL_ESTADO}`)
  return lineas.join('\n')
}

function escucharMensajesEntrantes(sock) {
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    for (const mensaje of messages) {
      const remoteJid = mensaje.key.remoteJid
      // Ignora: mensajes propios, sin contenido, y grupos/difusión (solo chats 1 a 1).
      if (mensaje.key.fromMe || !mensaje.message || !remoteJid?.endsWith('@s.whatsapp.net')) continue

      const texto = mensaje.message.conversation || mensaje.message.extendedTextMessage?.text || ''
      if (!texto) continue

      try {
        await responderConsultaTicket(sock, remoteJid, texto, mensaje)
      } catch (error) {
        console.error('[bot] Error respondiendo consulta de ticket:', error?.message || error)
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

async function iniciarWhatsApp(municipioId, nombreMunicipio) {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info')
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({ version, auth: state, logger })

  sock.ev.on('creds.update', saveCreds)
  escucharMensajesEntrantes(sock)

  sock.ev.on('connection.update', (actualizacion) => {
    const { connection, lastDisconnect, qr } = actualizacion

    if (qr) {
      console.log('\n[bot] Escanea este código QR con WhatsApp (Dispositivos vinculados) en el celular +56977701624:\n')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'open') {
      console.log('[bot] Conectado a WhatsApp.')
      TIPOS_NOTIFICACION.forEach((config) => escucharNotificacion(sock, municipioId, nombreMunicipio, config))
    }

    if (connection === 'close') {
      const codigo = lastDisconnect?.error?.output?.statusCode
      if (codigo === DisconnectReason.loggedOut) {
        console.error('[bot] Sesión cerrada desde el celular. Borra la carpeta "auth_info" y vuelve a correr el bot para escanear el QR de nuevo.')
      } else {
        console.warn('[bot] Se cortó la conexión con WhatsApp, reconectando...')
        iniciarWhatsApp(municipioId, nombreMunicipio)
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
  const nombreMunicipio = municipioSnap.exists() ? municipioSnap.data().nombre : 'la Municipalidad'

  console.log(`[bot] Sesión iniciada como ${perfil.nombre || perfil.email} (${perfil.rol}), municipio "${perfil.municipio_id}" (${nombreMunicipio}).`)

  await iniciarWhatsApp(perfil.municipio_id, nombreMunicipio)
}

main().catch((error) => {
  console.error('[bot] Error fatal al iniciar:', error?.message || error)
  process.exit(1)
})
