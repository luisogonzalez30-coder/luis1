// Pruebas de las funciones de IA SIN llamar a la API y sin gastar un peso.
//
//   node probar-ia.js
//
// El cliente de Anthropic se reemplaza por uno de mentira que devuelve
// respuestas armadas a mano, con la MISMA forma que devuelve la API real
// (bloques tool_use, stop_reason, usage). Así se puede probar el ciclo
// completo —incluido el de herramientas— sin red y sin clave.
//
// Lo que más importa comprobar acá no es que la IA acierte: es que cuando NO
// está, todo siga funcionando igual que antes.

const assert = require('assert')

let pasadas = 0
let fallidas = 0

function afirmar(condicion, nombre, detalle) {
  if (condicion) {
    pasadas++
    console.log(`  ✓ ${nombre}`)
  } else {
    fallidas++
    console.log(`  ✗ ${nombre}${detalle !== undefined ? ` — ${JSON.stringify(detalle)}` : ''}`)
  }
}

// --- Cliente de Anthropic de mentira ---------------------------------------

const llamadas = []
let respuestasEncoladas = []

function respuestaConHerramienta(nombre, entrada) {
  return {
    stop_reason: 'tool_use',
    content: [{ type: 'tool_use', id: 'tu_1', name: nombre, input: entrada }],
    usage: { input_tokens: 1500, output_tokens: 100 },
  }
}

function respuestaConTexto(texto) {
  return {
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: texto }],
    usage: { input_tokens: 800, output_tokens: 60 },
  }
}

class ErrorFalso extends Error {}

function instalarClienteFalso() {
  const ruta = require.resolve('@anthropic-ai/sdk')
  function AnthropicFalso() {
    return {
      messages: {
        create: async (parametros) => {
          llamadas.push(parametros)
          if (respuestasEncoladas.length === 0) throw new ErrorFalso('sin respuestas encoladas')
          return respuestasEncoladas.shift()
        },
      },
    }
  }
  AnthropicFalso.RateLimitError = class extends ErrorFalso {}
  AnthropicFalso.AuthenticationError = class extends ErrorFalso {}
  AnthropicFalso.APIError = ErrorFalso

  require.cache[ruta] = { id: ruta, filename: ruta, loaded: true, exports: AnthropicFalso }
}

async function principal() {
  console.log('\n── Sin clave: todo degrada al comportamiento anterior\n')

  delete process.env.ANTHROPIC_API_KEY
  let ia = require('./ia')

  afirmar(ia.iaDisponible() === false, 'iaDisponible() dice que no')
  afirmar((await ia.clasificarReporte({ descripcion: 'un hoyo' })) === null, 'clasificar devuelve null, no lanza')
  afirmar(
    (await ia.sonElMismoProblema({ nuevo: { categoria: 'Bache' }, existente: { categoria: 'Socavon', distancia_metros: 8 } })) === null,
    'comparar duplicados devuelve null, no lanza'
  )
  afirmar((await ia.resumirParaCuentaPublica({ total: 5 })) === null, 'resumen devuelve null, no lanza')
  afirmar(
    (await ia.responderConversacion({ historial: [{ rol: 'user', texto: 'hola' }], herramientas: [] })) === null,
    'conversación devuelve null, no lanza'
  )
  afirmar(ia.CATEGORIAS_VALIDAS.length === 58, 'conoce las 58 categorías del catálogo', ia.CATEGORIAS_VALIDAS.length)

  // --- Con clave y modelo simulado -----------------------------------------

  console.log('\n── Con clave: clasificación\n')

  process.env.ANTHROPIC_API_KEY = 'clave-de-prueba'
  delete require.cache[require.resolve('./ia')]
  instalarClienteFalso()
  ia = require('./ia')

  afirmar(ia.iaDisponible() === true, 'con clave, iaDisponible() dice que sí')

  respuestasEncoladas = [respuestaConHerramienta('clasificar', { categoria: 'Bache', confianza: 'alta', motivo: 'Se ve un hoyo en la calzada.' })]
  let sugerencia = await ia.clasificarReporte({ descripcion: 'hay un hoyo grande', foto: { base64: 'AAAA', tipo: 'image/jpeg' } })
  afirmar(sugerencia?.categoria === 'Bache', 'devuelve la categoría propuesta', sugerencia)
  afirmar(sugerencia?.etiqueta === 'Bache en la vía', 'la traduce a su etiqueta legible', sugerencia?.etiqueta)
  afirmar(sugerencia?.confianza === 'alta', 'conserva la confianza')

  const ultima = llamadas[llamadas.length - 1]
  afirmar(ultima.messages[0].content[0].type === 'image', 'manda la foto como imagen')
  afirmar(ultima.system[0].cache_control?.type === 'ephemeral', 'marca el catálogo para caché (es lo que abarata la llamada)')
  afirmar(ultima.tool_choice?.name === 'clasificar', 'fuerza la herramienta, no deja que conteste texto libre')
  afirmar(ultima.tools[0].strict === true, 'la herramienta es estricta')

  // La defensa que de verdad importa: el modelo puede devolver cualquier cosa.
  console.log('\n── Una categoría inventada se descarta, no llega a Firestore\n')
  respuestasEncoladas = [respuestaConHerramienta('clasificar', { categoria: 'Ovni_aterrizado', confianza: 'alta', motivo: 'inventada' })]
  sugerencia = await ia.clasificarReporte({ descripcion: 'algo raro', foto: null })
  afirmar(sugerencia === null, 'una categoría que no existe en el catálogo se descarta', sugerencia)

  console.log('\n── Si la API falla, se sigue sin IA\n')
  respuestasEncoladas = []
  sugerencia = await ia.clasificarReporte({ descripcion: 'hay un hoyo', foto: null })
  afirmar(sugerencia === null, 'un error de la API devuelve null en vez de lanzar')

  console.log('\n── Duplicados: ante la duda, NO fusiona\n')
  respuestasEncoladas = [respuestaConHerramienta('responder', { es_el_mismo: true, motivo: 'Es el mismo hoyo.' })]
  let veredicto = await ia.sonElMismoProblema({
    nuevo: { categoria: 'Bache', descripcion: 'hoyo' },
    existente: { categoria: 'Pavimento_deteriorado', descripcion: 'pavimento roto', distancia_metros: 12 },
  })
  afirmar(veredicto?.esElMismo === true, 'reconoce dos nombres del mismo problema', veredicto)

  respuestasEncoladas = [respuestaConHerramienta('responder', { es_el_mismo: false, motivo: 'Son dos luminarias distintas.' })]
  veredicto = await ia.sonElMismoProblema({
    nuevo: { categoria: 'Luminaria' },
    existente: { categoria: 'Luminaria', distancia_metros: 45 },
  })
  afirmar(veredicto?.esElMismo === false, 'no fusiona dos problemas distintos que están cerca')

  console.log('\n── Conversación: el ciclo de herramientas\n')

  const ejecutadas = []
  const herramientas = [
    {
      definicion: { name: 'buscar_ticket', description: 'x', input_schema: { type: 'object', properties: {}, required: [] } },
      ejecutar: async (entrada) => {
        ejecutadas.push(entrada)
        return JSON.stringify({ numero: '482173', estado: 'Resuelto' })
      },
    },
  ]

  respuestasEncoladas = [
    respuestaConHerramienta('buscar_ticket', { numero_ticket: '482173' }),
    respuestaConTexto('Tu reporte 482 173 ya está resuelto ✅'),
  ]

  let texto = await ia.responderConversacion({
    historial: [{ rol: 'user', texto: '¿cómo va el 482173?' }],
    herramientas,
  })
  afirmar(texto === 'Tu reporte 482 173 ya está resuelto ✅', 'usa la herramienta y responde con su resultado', texto)
  afirmar(ejecutadas.length === 1 && ejecutadas[0].numero_ticket === '482173', 'ejecutó la herramienta con lo que pidió el modelo', ejecutadas)

  console.log('\n── Una herramienta que falla no deja al vecino sin respuesta\n')
  respuestasEncoladas = [
    respuestaConHerramienta('buscar_ticket', { numero_ticket: '999999' }),
    respuestaConTexto('No pude consultarlo ahora, intenta en un rato.'),
  ]
  texto = await ia.responderConversacion({
    historial: [{ rol: 'user', texto: '¿y el 999999?' }],
    herramientas: [
      {
        definicion: herramientas[0].definicion,
        ejecutar: async () => {
          throw new Error('Firestore caído')
        },
      },
    ],
  })
  afirmar(typeof texto === 'string' && texto.length > 0, 'el error de la herramienta se convierte en respuesta, no en caída', texto)

  console.log('\n── El tope de gasto apaga la IA sola\n')

  process.env.IA_TOPE_USD_MES = '0.0001' // se supera con una sola llamada
  delete require.cache[require.resolve('./ia')]
  ia = require('./ia')
  afirmar(ia.iaDisponible() === true, 'antes de gastar, está disponible')

  respuestasEncoladas = [respuestaConHerramienta('clasificar', { categoria: 'Basural', confianza: 'media', motivo: 'basura acumulada' })]
  await ia.clasificarReporte({ descripcion: 'basura', foto: null })

  afirmar(ia.iaDisponible() === false, 'pasado el tope de gasto, se apaga sola')
  afirmar(ia.estadoIa().tope_alcanzado === true, 'y lo informa en su estado')
  afirmar((await ia.clasificarReporte({ descripcion: 'otra cosa' })) === null, 'y deja de llamar a la API')

  delete process.env.IA_TOPE_USD_MES

  console.log(`\n  ${pasadas} pruebas OK, ${fallidas} fallando.\n`)
  process.exit(fallidas === 0 ? 0 : 1)
}

principal().catch((error) => {
  console.error('La prueba se cayó:', error)
  process.exit(1)
})
