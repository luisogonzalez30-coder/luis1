import 'dotenv/config'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, doc, getDoc, collection, query, where, onSnapshot, updateDoc } from 'firebase/firestore'
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import qrcode from 'qrcode-terminal'
import pino from 'pino'
import { CATEGORIAS } from '../src/utils/categorias.js'

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

function mensajeParaIncidencia(incidencia, nombreMunicipio) {
  const saludo = incidencia.nombre_ciudadano ? `Hola ${incidencia.nombre_ciudadano}` : 'Hola'
  return `${saludo}, tu reporte de "${etiquetaCategoria(incidencia.categoria)}" (ticket ${incidencia.numero_ticket}) fue resuelto por ${nombreMunicipio}. Gracias por avisarnos.\n\nPuedes ver el detalle acá: ${PORTAL_URL_ESTADO}`
}

async function procesarIncidencia(sock, incidenciaId, incidencia, nombreMunicipio) {
  const refIncidencia = doc(db, 'incidencias', incidenciaId)

  if (!pareceTelefono(incidencia.contacto_ciudadano)) {
    // Sin contacto, o el contacto es un correo: no hay a quién mandarle WhatsApp.
    // Se marca igual como notificado para que no se vuelva a evaluar en cada reinicio.
    console.log(`[bot] ${incidencia.numero_ticket}: sin contacto tipo teléfono (valor: "${incidencia.contacto_ciudadano || ''}"), no se envía WhatsApp.`)
    await updateDoc(refIncidencia, { notificado_whatsapp: true })
    return
  }

  const numero = normalizarNumero(incidencia.contacto_ciudadano)

  try {
    const [resultado] = await sock.onWhatsApp(numero)
    if (!resultado?.exists) {
      console.warn(`[bot] ${incidencia.numero_ticket}: el número ${numero} no tiene WhatsApp registrado. No se pudo notificar.`)
      await updateDoc(refIncidencia, { notificado_whatsapp: true })
      return
    }

    const mensaje = mensajeParaIncidencia(incidencia, nombreMunicipio)
    const fotoUrl = incidencia.foto_despues_url || incidencia.fotos_antes_urls?.[0]
    const contenido = fotoUrl ? { image: { url: fotoUrl }, caption: mensaje } : { text: mensaje }

    await sock.sendMessage(resultado.jid, contenido)
    await updateDoc(refIncidencia, { notificado_whatsapp: true })
    console.log(`[bot] ${incidencia.numero_ticket}: WhatsApp enviado a ${numero}.`)
  } catch (error) {
    // OJO: acá NO se marca notificado_whatsapp -- si el envío falló (ej. WhatsApp
    // desconectado en ese momento), esta incidencia vuelve a aparecer como "added"
    // la próxima vez que el bot arranque y se reintenta sola.
    console.error(`[bot] ${incidencia.numero_ticket}: falló el envío de WhatsApp.`, error?.message || error)
  }
}

function escucharIncidenciasResueltas(sock, municipioId, nombreMunicipio) {
  const q = query(
    collection(db, 'incidencias'),
    where('municipio_id', '==', municipioId),
    where('estado', '==', 'Resuelto'),
    where('notificado_whatsapp', '==', false)
  )

  onSnapshot(
    q,
    (snapshot) => {
      // Solo se procesan los documentos que RECIÉN entraron al resultado (type
      // "added"). Si se procesara snapshot.docs completo en cada evento, cada
      // incidencia nueva resuelta reprocesaría también las que ya se notificaron
      // hace rato (siguen en el snapshot local hasta que el server confirma el
      // update de notificado_whatsapp).
      snapshot.docChanges().forEach((cambio) => {
        if (cambio.type === 'added') {
          procesarIncidencia(sock, cambio.doc.id, cambio.doc.data(), nombreMunicipio)
        }
      })
    },
    (error) => {
      console.error('[bot] Error escuchando incidencias:', error?.message || error)
    }
  )

  console.log(`[bot] Escuchando incidencias resueltas del municipio "${municipioId}"...`)
}

async function iniciarWhatsApp(municipioId, nombreMunicipio) {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info')
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({ version, auth: state, logger })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (actualizacion) => {
    const { connection, lastDisconnect, qr } = actualizacion

    if (qr) {
      console.log('\n[bot] Escanea este código QR con WhatsApp (Dispositivos vinculados) en el celular +56977701624:\n')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'open') {
      console.log('[bot] Conectado a WhatsApp.')
      escucharIncidenciasResueltas(sock, municipioId, nombreMunicipio)
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
