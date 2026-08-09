// Servicio standalone (Render.com, Web Service gratuito) que reemplaza a
// whatsapp-bot/ (Baileys, no oficial) por la Graph API oficial de Meta.
// No usa Firebase Cloud Functions: el proyecto está en plan Spark y Cloud
// Functions exige Blaze (facturación activa) — ver ESTADO_PROYECTO.md.
//
// Reusa las MISMAS banderas de idempotencia que whatsapp-bot/index.js ya
// dejaba en cada incidencia (notificado_whatsapp_creacion, notificado_whatsapp)
// en vez de inventar campos nuevos: incidenciasService.js YA las escribe en
// `false` al crear cada incidencia (ver crearIncidencia), así que esta
// escucha funciona desde el primer deploy sin tocar la app principal.
// IMPORTANTE: si dejas whatsapp-bot/ corriendo a la vez, los dos van a
// competir por la misma bandera — cualquiera de los dos que gane la carrera
// es el que efectivamente notifica (no se duplica el mensaje, pero tampoco
// es predecible cuál de los dos lo mandó). Para un corte limpio, apaga
// whatsapp-bot/ una vez que confirmes que este servicio funciona.

const express = require('express')
const admin = require('firebase-admin')
const axios = require('axios')

const { enviarTemplate, explicarError, formatearParaGraphApi } = require('./whatsapp')
const { etiquetaCategoria } = require('./categorias')
const { crearRouter: crearRouterWebhook } = require('./webhook')

const PORT = process.env.PORT || 3000
const PORTAL_URL_ESTADO = process.env.PORTAL_URL_ESTADO || 'https://app-incidencias-urbanas.web.app/estado'

// Solo hacen falta para el webhook (respuestas a consultas del vecino). Si no
// están, el servicio arranca igual y los avisos automáticos funcionan: lo único
// que se desactiva es la respuesta a mensajes entrantes. Nunca se monta el
// webhook sin firma — sería una URL pública que cualquiera podría usar para
// hacernos responder a números arbitrarios.
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET

const VARS_REQUERIDAS = ['FIREBASE_SERVICE_ACCOUNT', 'WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID']
const faltantes = VARS_REQUERIDAS.filter((clave) => !process.env[clave])
if (faltantes.length > 0) {
  console.error(`[server] Faltan variables de entorno: ${faltantes.join(', ')}. Copia .env.example a .env y complétalo (o cárgalas en Render -> Settings -> Environment).`)
  process.exit(1)
}

// --- Firebase Admin ---
// FIREBASE_SERVICE_ACCOUNT puede venir como JSON crudo (empieza con "{") o en
// base64 — esto último es lo recomendado en Render para no pelear con saltos
// de línea/comillas en el editor de variables de entorno.
function cargarCredencial() {
  const crudo = process.env.FIREBASE_SERVICE_ACCOUNT.trim()
  const texto = crudo.startsWith('{') ? crudo : Buffer.from(crudo, 'base64').toString('utf8')
  try {
    return JSON.parse(texto)
  } catch (error) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT no es JSON válido ni base64 de un JSON válido: ' + error.message)
  }
}

admin.initializeApp({ credential: admin.credential.cert(cargarCredencial()) })
const db = admin.firestore()

// --- EVENTO 1: nuevo ticket -> template "alerta_nuevo_ticket" ---
// Variables del body en ESE orden (deben calzar con el template aprobado en
// Meta Business Manager): {{1}} categoría legible, {{2}} número de ticket.
// OJO: el orden quedó así (no ticket-primero) porque así fue como se armó el
// texto aprobado en Meta ("recibimos tu reporte de {{1}} ... es {{2}}") — si
// alguna vez se reemplaza el template, hay que revisar este orden de nuevo.
async function procesarNuevoTicket(id, incidencia) {
  const ref = db.collection('incidencias').doc(id)
  const para = formatearParaGraphApi(incidencia.contacto_ciudadano)

  if (!para) {
    // Reporte anónimo o contacto ilegible: no es un error, no hay a quién
    // notificar. Se marca igual para no reevaluarlo en cada reconexión.
    console.log(`[server] ${incidencia.numero_ticket || id} (creación): sin WhatsApp válido, no se notifica.`)
    await ref.update({ notificado_whatsapp_creacion: true })
    return
  }

  try {
    await enviarTemplate({
      para,
      template: 'alerta_nuevo_ticket',
      parametrosBody: [etiquetaCategoria(incidencia.categoria), incidencia.numero_ticket || id],
    })
    await ref.update({ notificado_whatsapp_creacion: true })
    console.log(`[server] ${incidencia.numero_ticket || id} (creación): WhatsApp enviado a ${para}.`)
  } catch (error) {
    // Sin try/catch acá arriba se caería todo el listener. No se marca la
    // bandera: si falló, sigue con notificado_whatsapp_creacion=false y esta
    // misma incidencia vuelve a aparecer como "added" la próxima vez que el
    // proceso se reconecte (deploy, reinicio de Render, etc.) — reintento
    // gratis sin lógica extra.
    console.error(
      `[server] ${incidencia.numero_ticket || id} (creación): falló el envío.\n    ${explicarError(error)}`
    )
  }
}

function escucharNuevosTickets() {
  db.collection('incidencias')
    .where('notificado_whatsapp_creacion', '==', false)
    .onSnapshot(
      (snapshot) => {
        // Solo "added": es el documento entrando RECIÉN a este resultado de
        // query, sea porque se creó ahora o porque el proceso se acaba de
        // conectar y estaba pendiente de antes. "modified"/"removed" no
        // aplican acá — si se procesara snapshot.docs completo en cada
        // evento, se reprocesarían también los ya notificados que siguen en
        // el snapshot local hasta que el server confirma el update.
        snapshot.docChanges().forEach((cambio) => {
          if (cambio.type === 'added') procesarNuevoTicket(cambio.doc.id, cambio.doc.data())
        })
      },
      (error) => console.error('[server] Error escuchando nuevos tickets:', error.message)
    )
  console.log('[server] Escuchando nuevos tickets (notificado_whatsapp_creacion == false)...')
}

// --- EVENTO 2: ticket resuelto -> template "ticket_resuelto" ---
// Dispara cuando estado ENTRA a "Resuelto" (no antes) sin importar de qué
// estado venía — el flujo real casi siempre pasa por "En Proceso" primero.
// Variables del body: {{1}} número de ticket, {{2}} link con la foto de
// término, o al portal si la foto todavía no se subió.
//
// OJO: foto_despues_url se escribe en una SEGUNDA escritura asíncrona
// DESPUÉS de que estado ya quedó en "Resuelto" (ver marcarResuelto en
// incidenciasService.js — a propósito, para no bloquear el cierre con mala
// señal en terreno). Esta función casi siempre corre ANTES de que la foto
// exista, así que manda el link al portal como fallback en ese caso. Si tu
// template "ticket_resuelto" espera la foto como IMAGEN en el header (no
// como variable de texto), esto no te sirve tal cual — o rediseñas el
// template para no depender de la foto, o agregas un tercer listener sobre
// notificado_whatsapp_foto (bandera nueva) que dispare cuando foto_despues_url
// deja de estar vacío.
async function procesarTicketResuelto(id, incidencia) {
  const ref = db.collection('incidencias').doc(id)
  const para = formatearParaGraphApi(incidencia.contacto_ciudadano)

  if (!para) {
    console.log(`[server] ${incidencia.numero_ticket || id} (resuelto): sin WhatsApp válido, no se notifica.`)
    await ref.update({ notificado_whatsapp: true })
    return
  }

  try {
    await enviarTemplate({
      para,
      template: 'ticket_resuelto',
      parametrosBody: [incidencia.numero_ticket || id, incidencia.foto_despues_url || PORTAL_URL_ESTADO],
    })
    await ref.update({ notificado_whatsapp: true })
    console.log(`[server] ${incidencia.numero_ticket || id} (resuelto): WhatsApp enviado a ${para}.`)
  } catch (error) {
    console.error(
      `[server] ${incidencia.numero_ticket || id} (resuelto): falló el envío.\n    ${explicarError(error)}`
    )
  }
}

function escucharTicketsResueltos() {
  db.collection('incidencias')
    .where('estado', '==', 'Resuelto')
    .where('notificado_whatsapp', '==', false)
    .onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach((cambio) => {
          if (cambio.type === 'added') procesarTicketResuelto(cambio.doc.id, cambio.doc.data())
        })
      },
      (error) => console.error('[server] Error escuchando tickets resueltos:', error.message)
    )
  console.log('[server] Escuchando tickets resueltos (estado == Resuelto AND notificado_whatsapp == false)...')
}

// --- Servidor HTTP mínimo ---
// Obligatorio para Render (Web Service): necesita un puerto abierto
// respondiendo para no marcar el deploy como caído. No hace nada más — toda
// la lógica real corre en los listeners de arriba, no en request handlers.
const app = express()
app.get('/', (_req, res) => res.status(200).send('Status: OK'))

// --- Webhook de consultas del vecino (opcional) ---
// Solo se monta si están las DOS variables. Sin WHATSAPP_APP_SECRET no se puede
// validar que lo que llega venga de verdad de Meta, y una URL pública sin esa
// validación se puede usar para hacernos responder a números arbitrarios: antes
// de montar algo así sin firma, preferimos no montarlo.
if (WHATSAPP_VERIFY_TOKEN && WHATSAPP_APP_SECRET) {
  app.use(
    '/webhook',
    crearRouterWebhook({ db, verifyToken: WHATSAPP_VERIFY_TOKEN, appSecret: WHATSAPP_APP_SECRET })
  )
  console.log('[server] Webhook de consultas activo en /webhook.')
} else {
  console.log(
    '[server] Webhook DESACTIVADO (faltan WHATSAPP_VERIFY_TOKEN y/o WHATSAPP_APP_SECRET).\n' +
      '         Los avisos automáticos funcionan igual; lo único que no corre es\n' +
      '         la respuesta a los vecinos que escriban al número.'
  )
}

app.listen(PORT, () => console.log(`[server] Escuchando en el puerto ${PORT}.`))

// --- Auto-ping: evita que Render duerma el servicio ---
// El plan Free de Render apaga el proceso a los ~15 min sin peticiones HTTP
// entrantes — y como este servicio no recibe tráfico de nadie (nadie visita
// esta URL, solo escucha Firestore), se dormía solo entre reportes. Mientras
// duerme, los listeners de arriba NO corren, así que un aviso podía tardar
// horas en salir (recién cuando algo lo despertaba). Esto lo evita pegándose
// a sí mismo cada 10 minutos: como el pedido sale y vuelve a entrar por la
// URL pública, Render lo cuenta como actividad real y nunca llega a los 15.
// RENDER_EXTERNAL_URL la inyecta Render solo en cada Web Service — no hace
// falta configurarla a mano. Si no existe (ej. corriendo en local), esto
// simplemente no hace nada.
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL
if (RENDER_EXTERNAL_URL) {
  const INTERVALO_PING_MS = 10 * 60 * 1000
  setInterval(() => {
    axios.get(RENDER_EXTERNAL_URL, { timeout: 15000 }).catch((error) => {
      // No es grave si un ping puntual falla (ej. el servicio ya estaba
      // despertando por otra razón) — el siguiente intento en 10 min corrige solo.
      console.error('[server] Auto-ping falló (no crítico):', error.message)
    })
  }, INTERVALO_PING_MS)
  console.log(`[server] Auto-ping activo cada ${INTERVALO_PING_MS / 60000} min a ${RENDER_EXTERNAL_URL} — el servicio ya no debería dormirse solo.`)
} else {
  console.log('[server] RENDER_EXTERNAL_URL no está definida — auto-ping desactivado (¿corriendo local?).')
}

escucharNuevosTickets()
escucharTicketsResueltos()
