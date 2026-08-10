// Lee las plantillas REALES desde Meta y las compara con lo que server.js
// manda. La vista previa del navegador ya trae los valores de ejemplo puestos,
// así que mirándola no se puede saber cuántas variables tiene de verdad — y si
// no calzan, Meta rechaza el envío con el error 132000.
//
// Uso (PowerShell):
//   $env:WHATSAPP_TOKEN="EAAG..."
//   $env:WHATSAPP_WABA_ID="123456789012345"
//   node ver-plantillas.js
//
// El WABA_ID (ID de la cuenta de WhatsApp Business) está en
// Meta for Developers -> tu app -> WhatsApp -> Configuración de la API,
// como "Identificador de la cuenta de WhatsApp Business". NO es el business_id
// que sale en la URL del navegador, ni el ID del número de teléfono.

const axios = require('axios')

const GRAPH_API_VERSION = 'v19.0'
const TOKEN = process.env.WHATSAPP_TOKEN
const WABA_ID = process.env.WHATSAPP_WABA_ID

// Lo que server.js manda hoy. Si cambias los parametrosBody allá, cambia esto.
//
// Corregido el 10-ago-2026: esta lista estaba desactualizada y decía justo lo
// contrario de lo que hace server.js — el orden de alerta_nuevo_ticket invertido,
// y ticket_resuelto con 2 variables cuando manda 1. Una herramienta de
// diagnóstico que miente es peor que no tenerla: habría dado "todo calza"
// mirando la plantilla equivocada.
const LO_QUE_MANDAMOS = {
  // server.js: parametrosBody: [etiquetaCategoria(categoria), numero_ticket]
  alerta_nuevo_ticket: { variables: 2, detalle: '{{1}} categoría legible · {{2}} número de ticket' },
  // server.js: parametrosBody: [numero_ticket] — el link va fijo en el texto
  // aprobado, NO como variable.
  ticket_resuelto: { variables: 1, detalle: '{{1}} número de ticket' },
}
const IDIOMA_ESPERADO = process.env.WHATSAPP_TEMPLATE_LANG || 'es_CL'

if (!TOKEN || !WABA_ID) {
  console.error('\n  ✗ Faltan WHATSAPP_TOKEN y/o WHATSAPP_WABA_ID.')
  console.error('    $env:WHATSAPP_TOKEN="EAAG..."')
  console.error('    $env:WHATSAPP_WABA_ID="123456789012345"\n')
  process.exit(1)
}

function contarVariables(texto) {
  const encontradas = (texto || '').match(/\{\{\s*\d+\s*\}\}/g) || []
  return new Set(encontradas.map((v) => v.replace(/\D/g, ''))).size
}

async function main() {
  let data
  try {
    const respuesta = await axios.get(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${WABA_ID}/message_templates`,
      {
        params: { fields: 'name,status,language,category,components', limit: 100 },
        headers: { Authorization: `Bearer ${TOKEN}` },
        timeout: 15000,
      }
    )
    data = respuesta.data
  } catch (error) {
    const meta = error.response?.data?.error
    console.error('\n  ✗ No se pudieron leer las plantillas.')
    console.error(`    ${meta ? `[${meta.code}] ${meta.message}` : error.message}`)
    if (meta?.code === 190) console.error('\n    → El token venció (los de "Primeros pasos" duran 24 h).')
    if (meta?.code === 100) console.error('\n    → Revisa el WABA_ID: no es el business_id de la URL ni el ID del teléfono.')
    console.error('')
    process.exit(1)
  }

  const plantillas = data.data || []
  console.log(`\n  ${plantillas.length} plantilla(s) en la cuenta:\n`)

  let problemas = 0

  for (const p of plantillas) {
    const body = (p.components || []).find((c) => c.type === 'BODY')
    const header = (p.components || []).find((c) => c.type === 'HEADER')
    const botones = (p.components || []).find((c) => c.type === 'BUTTONS')
    const varsBody = contarVariables(body?.text)

    console.log(`  ── ${p.name}  [${p.language}]  ${p.status}  (${p.category})`)
    if (body?.text) {
      console.log(`     texto : ${body.text.replace(/\n/g, '\n             ')}`)
    }
    console.log(`     variables en el body: ${varsBody}`)
    if (header) console.log(`     tiene HEADER de tipo ${header.format || 'TEXT'}${contarVariables(header.text) ? ' CON variable' : ''}`)
    if (botones) console.log(`     tiene ${botones.buttons?.length || 0} botón(es)`)

    const esperado = LO_QUE_MANDAMOS[p.name]
    if (esperado) {
      if (varsBody !== esperado.variables) {
        problemas++
        console.log(`     ✗ DESCALCE: server.js manda ${esperado.variables} (${esperado.detalle}) y la plantilla espera ${varsBody}.`)
        console.log('       Meta va a responder 132000. Hay que igualar uno de los dos lados.')
      } else {
        console.log(`     ✓ Calza con server.js (${esperado.detalle})`)
      }
      if (p.language !== IDIOMA_ESPERADO) {
        problemas++
        console.log(`     ✗ IDIOMA: la plantilla es "${p.language}" y vamos a enviar "${IDIOMA_ESPERADO}".`)
        console.log(`       Pon WHATSAPP_TEMPLATE_LANG=${p.language} o Meta responde 132001.`)
      }
      if (p.status !== 'APPROVED') {
        console.log(`     · Todavía no aprobada (${p.status}) — no se puede enviar aún.`)
      }
    }
    console.log('')
  }

  for (const nombre of Object.keys(LO_QUE_MANDAMOS)) {
    if (!plantillas.some((p) => p.name === nombre)) {
      problemas++
      console.log(`  ✗ server.js usa "${nombre}" pero no existe ninguna plantilla con ese nombre.\n`)
    }
  }

  console.log(problemas === 0
    ? '  ✓ Todo calza. Cuando queden aprobadas, se puede enviar sin tocar nada más.\n'
    : `  ${problemas} cosa(s) por arreglar antes de que esto funcione.\n`)
}

main()
