// Prueba la conexión con la Graph API de Meta SIN esperar a que aprueben las
// plantillas nuevas: usa "hello_world", que viene aprobada de fábrica.
//
// Sirve para saber HOY si el token, el número y el permiso están bien. Si esto
// llega a tu teléfono, lo único que falta para producción es la aprobación.
//
// Uso:
//   node probar.js +56977701624
//   node probar.js +56977701624 ticket_resuelto INC-20260806-1234 https://...
//
// Con un solo argumento manda hello_world (inglés, sin variables).
// Con más argumentos manda la plantilla que le digas, en es_CL, y le pasa el
// resto como variables {{1}}, {{2}}, ... en ese orden.

const axios = require('axios')

const GRAPH_API_VERSION = 'v19.0'
const TOKEN = process.env.WHATSAPP_TOKEN
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID

const [, , destinoCrudo, plantilla, ...variables] = process.argv

function salirCon(mensaje) {
  console.error(`\n  ✗ ${mensaje}\n`)
  process.exit(1)
}

if (!TOKEN || !PHONE_NUMBER_ID) {
  salirCon(
    'Faltan WHATSAPP_TOKEN y/o WHATSAPP_PHONE_NUMBER_ID.\n' +
      '    En PowerShell, antes de correr esto:\n' +
      '      $env:WHATSAPP_TOKEN="EAAG..."\n' +
      '      $env:WHATSAPP_PHONE_NUMBER_ID="123456789012345"'
  )
}

if (!destinoCrudo) {
  salirCon('Falta el número de destino.  Ejemplo:  node probar.js +56977701624')
}

// Mismo criterio que server.js, para probar exactamente lo que va a correr.
function formatearParaGraphApi(contacto) {
  const digitos = (contacto || '').replace(/\D/g, '')
  if (digitos.length === 9 && digitos.startsWith('9')) return `56${digitos}`
  if (digitos.length === 11 && digitos.startsWith('569')) return digitos
  return null
}

const para = formatearParaGraphApi(destinoCrudo)
if (!para) {
  salirCon(
    `"${destinoCrudo}" no parece un celular chileno válido.\n` +
      '    Se espera +56 9 XXXX XXXX (o 9XXXXXXXX). Los fijos no sirven para WhatsApp.'
  )
}

const nombrePlantilla = plantilla || 'hello_world'
const idioma = plantilla ? 'es_CL' : 'en_US'

const cuerpo = {
  messaging_product: 'whatsapp',
  to: para,
  type: 'template',
  template: {
    name: nombrePlantilla,
    language: { code: idioma },
  },
}

if (variables.length > 0) {
  cuerpo.template.components = [
    {
      type: 'body',
      parameters: variables.map((texto) => ({ type: 'text', text: String(texto) })),
    },
  ]
}

const AYUDA_POR_CODIGO = {
  132001: 'La plantilla no existe en ese idioma. "Spanish (CHL)" es es_CL, no es. Revisa también que el nombre esté idéntico.',
  132000: `Mandaste ${variables.length} variable(s) y la plantilla espera otra cantidad. Cuenta los {{1}}, {{2}}... en Meta.`,
  132005: 'La plantilla todavía no está aprobada (o quedó rechazada).',
  131030: 'Ese número no está en la lista de destinatarios permitidos. En modo de prueba hay que agregarlo en Meta → WhatsApp → Primeros pasos.',
  131026: 'Ese número no tiene WhatsApp o no puede recibir mensajes.',
  190: 'El token venció o fue revocado. Los de "Primeros pasos" duran 24 h — para producción hay que generar uno permanente de usuario del sistema.',
  100: 'Parámetro inválido. Casi siempre es el PHONE_NUMBER_ID equivocado (es el ID del número, no el número en sí).',
}

async function main() {
  console.log('')
  console.log(`  Plantilla : ${nombrePlantilla}  (${idioma})`)
  console.log(`  Para      : +${para}`)
  if (variables.length) console.log(`  Variables : ${variables.map((v, i) => `{{${i + 1}}}=${v}`).join('  ')}`)
  console.log('')

  try {
    const { data } = await axios.post(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}/messages`,
      cuerpo,
      { headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, timeout: 15000 }
    )
    console.log('  ✓ Meta aceptó el mensaje.')
    console.log(`    id: ${data.messages?.[0]?.id || '(sin id)'}`)
    console.log('')
    console.log('  Revisa tu teléfono. Si llega, la conexión está lista y solo')
    console.log('  falta que aprueben las plantillas.')
    console.log('')
  } catch (error) {
    const meta = error.response?.data?.error
    if (!meta) salirCon(`No se pudo conectar con Meta: ${error.message}`)
    console.error('')
    console.error(`  ✗ Meta rechazó el envío.`)
    console.error(`    [${meta.code}] ${meta.message}`)
    if (meta.error_data?.details) console.error(`    detalle: ${meta.error_data.details}`)
    if (AYUDA_POR_CODIGO[meta.code]) console.error(`\n    → ${AYUDA_POR_CODIGO[meta.code]}`)
    console.error('')
    process.exit(1)
  }
}

main()
