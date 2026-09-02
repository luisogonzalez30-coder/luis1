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
const { crearRouter: crearRouterIa } = require('./rutas-ia')
const ia = require('./ia')
const vigilancia = require('./vigilancia')
const { diagnostico } = vigilancia

const PORT = process.env.PORT || 3000

// Solo hacen falta para el webhook (respuestas a consultas del vecino). Si no
// están, el servicio arranca igual y los avisos automáticos funcionan: lo único
// que se desactiva es la respuesta a mensajes entrantes. Nunca se monta el
// webhook sin firma — sería una URL pública que cualquiera podría usar para
// hacernos responder a números arbitrarios.
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET
// Nombre de la plantilla del aviso "ya asignamos tu reporte a una cuadrilla".
// Sin esta variable el aviso NO corre (ver escucharTicketsAsignados): es
// deliberado, porque la plantilla hay que crearla y aprobarla en Meta primero.
const WHATSAPP_TEMPLATE_ASIGNACION = process.env.WHATSAPP_TEMPLATE_ASIGNACION

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
    vigilancia.registrarEnvioOk(id)
    return
  }

  try {
    await enviarTemplate({
      para,
      template: 'alerta_nuevo_ticket',
      parametrosBody: [etiquetaCategoria(incidencia.categoria), incidencia.numero_ticket || id],
    })
    await ref.update({ notificado_whatsapp_creacion: true })
    vigilancia.registrarEnvioOk(id)
    console.log(`[server] ${incidencia.numero_ticket || id} (creación): WhatsApp enviado a ${para}.`)
  } catch (error) {
    // Sin try/catch acá arriba se caería todo el listener. No se marca la
    // bandera: si falló, sigue con notificado_whatsapp_creacion=false y esta
    // misma incidencia vuelve a aparecer como "added" la próxima vez que el
    // proceso se reconecte (deploy, reinicio de Render, etc.) — reintento
    // gratis sin lógica extra.
    vigilancia.registrarEnvioFallido(id, explicarError(error))
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
          if (cambio.type === 'added') {
            vigilancia.registrarPendiente(cambio.doc.id)
            procesarNuevoTicket(cambio.doc.id, cambio.doc.data())
          }
        })
      },
      (error) => {
        vigilancia.registrarErrorListener('nuevos tickets', error.message)
        console.error('[server] Error escuchando nuevos tickets:', error.message)
      }
    )
  console.log('[server] Escuchando nuevos tickets (notificado_whatsapp_creacion == false)...')
}

// --- EVENTO 2: ticket resuelto -> template "ticket_resuelto" ---
// Dispara cuando estado ENTRA a "Resuelto" (no antes) sin importar de qué
// estado venía — el flujo real casi siempre pasa por "En Proceso" primero.
// El template aprobado quedó con UNA sola variable ({{1}} = número de
// ticket); el link al portal se escribió fijo dentro del texto aprobado, no
// como variable — por eso acá NO se manda foto_despues_url/PORTAL_URL_ESTADO
// como segundo parámetro (Meta rechaza si la cantidad no calza exacto). Si
// en algún momento el template aprobado cambia para incluir el link como
// variable, hay que agregarlo de nuevo acá.
async function procesarTicketResuelto(id, incidencia) {
  const ref = db.collection('incidencias').doc(id)
  const para = formatearParaGraphApi(incidencia.contacto_ciudadano)

  if (!para) {
    console.log(`[server] ${incidencia.numero_ticket || id} (resuelto): sin WhatsApp válido, no se notifica.`)
    await ref.update({ notificado_whatsapp: true })
    vigilancia.registrarEnvioOk(id)
    return
  }

  try {
    await enviarTemplate({
      para,
      template: 'ticket_resuelto',
      parametrosBody: [incidencia.numero_ticket || id],
    })
    await ref.update({ notificado_whatsapp: true })
    vigilancia.registrarEnvioOk(id)
    console.log(`[server] ${incidencia.numero_ticket || id} (resuelto): WhatsApp enviado a ${para}.`)
  } catch (error) {
    vigilancia.registrarEnvioFallido(id, explicarError(error))
    console.error(
      `[server] ${incidencia.numero_ticket || id} (resuelto): falló el envío.\n    ${explicarError(error)}`
    )
  }
}

// --- EVENTO 3: cuadrilla asignada -> template configurable ---
// Dispara cuando la incidencia ENTRA a "En Proceso", o sea cuando el Alcalde o
// el Jefe de Departamento le asigna una cuadrilla. Era uno de los 3 momentos que
// notificaba el bot viejo y se perdió en la migración a la API oficial (§39.3);
// es el aviso que le dice al vecino "esto se movió", que es justo el momento en
// que un municipio gana o pierde credibilidad.
//
// **Está apagado hasta que exista la plantilla aprobada en Meta.** Con la API
// oficial no se puede mandar texto libre fuera de la ventana de 24 h, y este
// aviso lo inicia el municipio, así que necesita plantilla. Se enciende poniendo
// WHATSAPP_TEMPLATE_ASIGNACION en Render con el nombre de la plantilla aprobada
// (ver §42). Si no está, el listener no se monta: mejor no correr que llenar el
// log de errores 132001 y reintentar para siempre contra algo que no existe.
//
// Variables del body, en ESE orden: {{1}} número de ticket, {{2}} cuadrilla.
async function procesarTicketAsignado(id, incidencia) {
  const ref = db.collection('incidencias').doc(id)
  const para = formatearParaGraphApi(incidencia.contacto_ciudadano)

  if (!para) {
    console.log(`[server] ${incidencia.numero_ticket || id} (asignación): sin WhatsApp válido, no se notifica.`)
    await ref.update({ notificado_whatsapp_asignacion: true })
    vigilancia.registrarEnvioOk(id)
    return
  }

  try {
    await enviarTemplate({
      para,
      template: WHATSAPP_TEMPLATE_ASIGNACION,
      parametrosBody: [incidencia.numero_ticket || id, incidencia.cuadrilla_asignada || 'un equipo municipal'],
    })
    await ref.update({ notificado_whatsapp_asignacion: true })
    vigilancia.registrarEnvioOk(id)
    console.log(`[server] ${incidencia.numero_ticket || id} (asignación): WhatsApp enviado a ${para}.`)
  } catch (error) {
    vigilancia.registrarEnvioFallido(id, explicarError(error))
    console.error(
      `[server] ${incidencia.numero_ticket || id} (asignación): falló el envío.\n    ${explicarError(error)}`
    )
  }
}

function escucharTicketsAsignados() {
  db.collection('incidencias')
    .where('estado', '==', 'En Proceso')
    .where('notificado_whatsapp_asignacion', '==', false)
    .onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach((cambio) => {
          if (cambio.type === 'added') {
            vigilancia.registrarPendiente(cambio.doc.id)
            procesarTicketAsignado(cambio.doc.id, cambio.doc.data())
          }
        })
      },
      (error) => {
        vigilancia.registrarErrorListener('tickets asignados', error.message)
        console.error('[server] Error escuchando tickets asignados:', error.message)
      }
    )
  console.log(
    `[server] Escuchando asignaciones de cuadrilla (plantilla "${WHATSAPP_TEMPLATE_ASIGNACION}")...`
  )
}

function escucharTicketsResueltos() {
  db.collection('incidencias')
    .where('estado', '==', 'Resuelto')
    .where('notificado_whatsapp', '==', false)
    .onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach((cambio) => {
          if (cambio.type === 'added') {
            vigilancia.registrarPendiente(cambio.doc.id)
            procesarTicketResuelto(cambio.doc.id, cambio.doc.data())
          }
        })
      },
      (error) => {
        vigilancia.registrarErrorListener('tickets resueltos', error.message)
        console.error('[server] Error escuchando tickets resueltos:', error.message)
      }
    )
  console.log('[server] Escuchando tickets resueltos (estado == Resuelto AND notificado_whatsapp == false)...')
}

// --- Servidor HTTP mínimo ---
// Obligatorio para Render (Web Service): necesita un puerto abierto
// respondiendo para no marcar el deploy como caído. No hace nada más — toda
// la lógica real corre en los listeners de arriba, no en request handlers.
const app = express()

// El cuerpo CRUDO, capturado antes de parsear, es lo único con lo que se puede
// verificar la firma X-Hub-Signature-256 de Meta: el HMAC se calcula sobre los
// bytes exactos que viajaron, y volver a serializar el objeto ya parseado
// cambia espaciado y orden de claves, así que la firma nunca calzaría.
//
// Va a nivel de app y no solo dentro del router del webhook (webhook.js lo
// repite por si se monta suelto en una prueba): así ninguna ruta que se agregue
// más adelante puede quedarse sin el crudo por olvido. express.json() no vuelve
// a parsear un cuerpo ya parseado, de modo que tenerlo en los dos lugares no
// duplica trabajo ni pierde req.rawBody.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf
    },
  })
)

app.get('/', (_req, res) => res.status(200).send('Status: OK'))

// --- /salud: para que algo externo sepa que esto se rompió ---
//
// Esta ruta existe porque "/" no sirve para vigilar: responde 200 mientras el
// proceso esté vivo, y en el corte de ~19 h del 9-ago (§39.5) el proceso estaba
// perfectamente vivo — lo que estaba roto era que los envíos no salían. Acá se
// devuelve si el TRABAJO está saliendo, no si el servidor contesta.
//
// 503 cuando algo anda mal, para que el vigilante no tenga que interpretar el
// cuerpo de la respuesta: un chequeo que depende de leer JSON bien es un
// chequeo que falla en silencio el día que el formato cambia.
//
// Sin datos personales a propósito: devuelve conteos y minutos, nunca números
// de teléfono, nombres ni contenido de reportes. Es una URL pública sin
// autenticación, y lo que se publica en una URL pública hay que asumirlo leído
// por cualquiera.
app.get('/salud', (_req, res) => {
  const informe = diagnostico()
  res.status(informe.ok ? 200 : 503).json(informe)
})

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

// --- Rutas de IA para la app web ---
// Se montan siempre. Sin ANTHROPIC_API_KEY responden { sugerencia: null } y la
// app sigue funcionando como antes — es mejor que el formulario reciba una
// respuesta clara de "no hay sugerencia" a que la llamada falle con un 404 y
// haya que distinguir ese caso de un servicio caído.
app.use('/ia', crearRouterIa())
if (process.env.ANTHROPIC_API_KEY) {
  console.log('[server] Rutas de IA activas en /ia (clasificar, duplicado, resumen).')
} else {
  console.log(
    '[server] Rutas de IA montadas pero SIN CLAVE: /ia responde "sin sugerencia" y todo\n' +
      '         degrada al comportamiento anterior. Para encenderlas, define ANTHROPIC_API_KEY\n' +
      '         en Render -> Settings -> Environment (ver docs/COSTOS-IA.md para el costo).'
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

// Carga el gasto de IA acumulado del mes desde Firestore. Sin esto el tope de
// gasto se reiniciaría en cada deploy de Render, o sea que no sería un tope.
ia.iniciar(db).catch((error) => console.warn(`[server] No se pudo iniciar la contabilidad de IA: ${error.message}`))

escucharNuevosTickets()
escucharTicketsResueltos()

// El aviso de asignación solo corre si la plantilla ya existe en Meta. Se avisa
// en el log cuando NO está, para que se entienda que está apagado a propósito y
// no se busque un bug donde no hay ninguno.
if (WHATSAPP_TEMPLATE_ASIGNACION) {
  escucharTicketsAsignados()
} else {
  console.log(
    '[server] Aviso de "cuadrilla asignada" APAGADO (falta WHATSAPP_TEMPLATE_ASIGNACION).\n' +
      '         El código está listo: crea la plantilla en Meta y pon su nombre en esa variable (ver §42).'
  )
}
