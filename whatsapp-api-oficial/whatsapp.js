// Cliente de la Graph API de Meta. Lo usan tanto server.js (avisos que salen
// solos) como webhook.js (respuestas a lo que escribe el vecino).
//
// Diferencia de plata entre las dos funciones de acá, que conviene tener clara:
//   enviarTemplate  -> mensaje de PLANTILLA. Se cobra (Utilidad, Chile:
//                      US$ 0,02 aprox. por mensaje) porque sale sin que el
//                      vecino haya escrito primero.
//   enviarTexto     -> mensaje LIBRE. Es GRATIS, pero solo se puede usar
//                      dentro de las 24 h siguientes a un mensaje del vecino.
//                      Fuera de esa ventana Meta lo rechaza con el error
//                      131047 — por eso el webhook solo responde a quien
//                      acaba de escribir, nunca inicia una conversación.

const axios = require('axios')

const GRAPH_API_VERSION = 'v19.0'
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID

// Código de idioma del template, y tiene que ser EXACTAMENTE el que aparece en
// Meta Business Manager. Las plantillas se crearon como "Spanish (CHL)", que en
// la Graph API es 'es_CL' — NO 'es', que para Meta es otro idioma distinto.
const WHATSAPP_TEMPLATE_LANG = process.env.WHATSAPP_TEMPLATE_LANG || 'es_CL'

const AYUDA_POR_CODIGO = {
  132001: 'La plantilla no existe en ese idioma. Revisa que WHATSAPP_TEMPLATE_LANG calce EXACTO con el idioma en Meta (Spanish (CHL) = es_CL) y que el nombre esté bien escrito.',
  132000: 'La cantidad de variables que mandamos no calza con las que espera la plantilla aprobada. Corre "node ver-plantillas.js" para comparar los dos lados.',
  132005: 'La plantilla no está aprobada todavía (o quedó rechazada). Revísala en Meta Business Manager.',
  131030: 'El número de destino no está en la lista de destinatarios permitidos. Pasa mientras la cuenta está en modo de prueba: agrégalo en Meta -> WhatsApp -> Primeros pasos.',
  131026: 'El número de destino no tiene WhatsApp, o no puede recibir mensajes.',
  131047: 'Pasaron más de 24 h desde el último mensaje del vecino: fuera de esa ventana no se puede mandar texto libre, solo plantillas aprobadas.',
  131056: 'Demasiados mensajes a ese mismo número en poco rato (límite de pares). Reintenta más tarde.',
  190: 'El token venció o fue revocado. Los tokens de "Primeros pasos" duran 24 h: hay que generar uno permanente de usuario del sistema.',
  100: 'Parámetro inválido en la llamada. Suele ser el WHATSAPP_PHONE_NUMBER_ID equivocado (ojo: es el ID del número, no el número).',
  80007: 'Se alcanzó el límite de mensajes de la cuenta. Revisa la calidad del número y los límites en Meta Business Manager.',
}

// Los errores de la Graph API llegan como códigos numéricos sin contexto. Esto
// los traduce a algo accionable, porque estos logs se leen desde el panel de
// Render a las 11 de la noche cuando algo dejó de funcionar.
function explicarError(error) {
  const meta = error.response?.data?.error
  if (!meta) return error.message
  const ayuda = AYUDA_POR_CODIGO[meta.code]
  return [
    `[${meta.code}] ${meta.message}`,
    meta.error_data?.details ? `detalle: ${meta.error_data.details}` : null,
    ayuda ? `→ ${ayuda}` : null,
  ]
    .filter(Boolean)
    .join('\n    ')
}

// La Graph API exige SOLO dígitos, con código de país, sin "+".
// contacto_ciudadano ya se guarda normalizado como "+56912345678" (ver
// src/utils/telefono.js), pero esto igual valida por si hay registros viejos o
// mal formados — null si no se puede reconocer, para no mandarle un mensaje al
// número equivocado.
function formatearParaGraphApi(contacto) {
  const digitos = (contacto || '').replace(/\D/g, '')
  if (digitos.length === 9 && digitos.startsWith('9')) return `56${digitos}`
  if (digitos.length === 11 && digitos.startsWith('569')) return digitos
  return null
}

async function postMensaje(cuerpo) {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`
  const { data } = await axios.post(url, cuerpo, {
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  })
  return data
}

// Mensaje de plantilla aprobada. SE COBRA.
function enviarTemplate({ para, template, parametrosBody, idioma }) {
  return postMensaje({
    messaging_product: 'whatsapp',
    to: para,
    type: 'template',
    template: {
      name: template,
      language: { code: idioma || WHATSAPP_TEMPLATE_LANG },
      components: [
        {
          type: 'body',
          parameters: parametrosBody.map((texto) => ({ type: 'text', text: String(texto) })),
        },
      ],
    },
  })
}

// Texto libre. GRATIS, pero solo dentro de las 24 h posteriores a un mensaje
// del vecino. preview_url en false para que no se despliegue la tarjeta del
// link (el mensaje se lee más limpio en pantallas chicas).
function enviarTexto({ para, texto }) {
  return postMensaje({
    messaging_product: 'whatsapp',
    to: para,
    type: 'text',
    text: { preview_url: false, body: texto },
  })
}

// Tope de Meta para el título de un botón de respuesta. No es un consejo: si se
// pasa, la API rechaza el mensaje completo con error 100 y el vecino no recibe
// nada. Se recorta acá en vez de confiar en que quien escriba los textos cuente
// los caracteres a mano.
const MAX_TITULO_BOTON = 20
const MAX_BOTONES = 3

// Mensaje con botones tocables (hasta 3). GRATIS y sin aprobación de Meta,
// porque es texto libre: vale la misma regla que enviarTexto, solo dentro de las
// 24 h siguientes a un mensaje del vecino.
//
// Existe porque pedirle al vecino que ESCRIBA la frase correcta no funciona: en
// la primera prueba real el corrector del teléfono cambió "mis reportes" por
// "mía reportes" y el bot no lo reconoció (10-ago-2026). Un botón no se escribe
// mal. `botones` es [{ id, titulo }] y el id es el que vuelve en el webhook.
function enviarBotones({ para, texto, botones }) {
  return postMensaje({
    messaging_product: 'whatsapp',
    to: para,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: texto },
      action: {
        buttons: botones.slice(0, MAX_BOTONES).map((b) => ({
          type: 'reply',
          reply: { id: b.id, title: b.titulo.slice(0, MAX_TITULO_BOTON) },
        })),
      },
    },
  })
}

module.exports = {
  GRAPH_API_VERSION,
  WHATSAPP_TEMPLATE_LANG,
  enviarTemplate,
  enviarTexto,
  enviarBotones,
  explicarError,
  formatearParaGraphApi,
}
