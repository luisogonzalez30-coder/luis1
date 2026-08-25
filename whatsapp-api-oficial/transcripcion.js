// Transcripción de las notas de voz que manda el vecino por WhatsApp.
//
// POR QUÉ ESTO NO USA CLAUDE: la API de Claude acepta imágenes y documentos,
// no audio. Es la única función de IA de la plataforma que necesita un
// proveedor distinto, y eso tiene consecuencias que no son técnicas: un tercero
// más que recibe datos de vecinos, y por lo tanto una línea más en la política
// de privacidad (§35.2) antes de encenderlo con gente real.
//
// Por eso viene APAGADO por defecto. Sin OPENAI_API_KEY, un audio hace
// exactamente lo que hace hoy: mostrar el menú de botones (§41.5).
//
// Para qué sirve: en un pueblo la gente manda audios, no textos. Un adulto
// mayor que no escribe bien igual puede describir un problema hablando. Hoy ese
// mensaje se pierde.

const axios = require('axios')
const { GRAPH_API_VERSION } = require('./whatsapp')

const CLAVE_OPENAI = process.env.OPENAI_API_KEY
const MODELO_TRANSCRIPCION = process.env.TRANSCRIPCION_MODELO || 'whisper-1'
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN

// Un audio de WhatsApp normal pesa muy poco. El tope existe para que alguien no
// pueda mandar una hora de audio y hacernos pagarla.
const MAX_BYTES = 5 * 1024 * 1024
const TIMEOUT_MS = 30000

function transcripcionDisponible() {
  return Boolean(CLAVE_OPENAI)
}

// Meta no entrega el archivo directamente: primero hay que pedir la URL con el
// id del media, y esa URL solo se puede descargar mandando el mismo token.
async function descargarMedia(mediaId) {
  const meta = await axios.get(`https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`, {
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
    timeout: 10000,
  })

  const url = meta.data?.url
  if (!url) throw new Error('Meta no devolvió la URL del audio.')

  if (meta.data.file_size && meta.data.file_size > MAX_BYTES) {
    throw new Error(`El audio pesa ${meta.data.file_size} bytes, más del tope de ${MAX_BYTES}.`)
  }

  const archivo = await axios.get(url, {
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
    responseType: 'arraybuffer',
    timeout: TIMEOUT_MS,
    maxContentLength: MAX_BYTES,
  })

  return {
    datos: Buffer.from(archivo.data),
    tipo: meta.data.mime_type || 'audio/ogg',
  }
}

// Devuelve el texto transcrito, o null si no se puede. Nunca lanza: quien la
// llama sigue su camino normal (el menú de botones) si esto no funciona.
async function transcribirAudioDeWhatsapp(mediaId) {
  if (!transcripcionDisponible()) return null

  try {
    const audio = await descargarMedia(mediaId)

    // WhatsApp manda los audios como .ogg (codec opus). El nombre del archivo
    // importa: el proveedor deduce el formato de la extensión.
    const formulario = new FormData()
    formulario.append('file', new Blob([audio.datos], { type: audio.tipo }), 'audio.ogg')
    formulario.append('model', MODELO_TRANSCRIPCION)
    formulario.append('language', 'es')

    const { data } = await axios.post('https://api.openai.com/v1/audio/transcriptions', formulario, {
      headers: { Authorization: `Bearer ${CLAVE_OPENAI}` },
      timeout: TIMEOUT_MS,
    })

    const texto = (data?.text || '').trim()
    if (!texto) return null

    console.log(`[transcripcion] Audio transcrito, ${texto.length} caracteres.`)
    return texto
  } catch (error) {
    const detalle = error.response?.data?.error?.message || error.message
    console.warn(`[transcripcion] No se pudo transcribir el audio: ${detalle}`)
    return null
  }
}

module.exports = { transcripcionDisponible, transcribirAudioDeWhatsapp }
