// Cliente de Claude para todo lo que la plataforma le pide a la IA.
//
// Vive acá, en el servicio de Render, y NO en la app: la clave de API no puede
// viajar al navegador (el bundle lo descarga cualquiera). El formulario del
// vecino llega a estas funciones por HTTP, a través de los endpoints /ia/* que
// monta server.js.
//
// Tres reglas que ordenan todo este archivo:
//
//   1. NADA de esto es obligatorio para que la plataforma funcione. Si falta la
//      clave, si la API se cae o si se alcanzó el tope de gasto, cada función
//      devuelve null y el sistema opera exactamente como antes: el vecino elige
//      su categoría a mano y el bot muestra el menú de botones de §41.5. La IA
//      SUMA, nunca es el camino crítico.
//   2. La IA propone, las tablas deciden. Nunca devuelve gravedad ni
//      departamento: solo la categoría. gravedad.js y departamento.js siguen
//      derivando lo demás, que es lo que un municipio puede auditar y defender.
//   3. Lo que devuelve el modelo se valida SIEMPRE contra el catálogo real. Un
//      slug que no existe se descarta, no se escribe en Firestore.

const Anthropic = require('@anthropic-ai/sdk')
const { ETIQUETA_POR_CATEGORIA } = require('./categorias')

const CLAVE = process.env.ANTHROPIC_API_KEY

// Por defecto Opus 5. Haiku 4.5 cuesta la quinta parte y es la alternativa
// natural si el volumen crece — el cálculo completo está en docs/COSTOS-IA.md.
// Se cambia con una variable de entorno, sin tocar código ni desplegar.
const MODELO = process.env.IA_MODELO || 'claude-opus-5'

// Tope de gasto mensual estimado, en dólares. 0 = sin tope.
// Al alcanzarlo, iaDisponible() empieza a decir que no y todo degrada solo.
const TOPE_USD_MES = Number(process.env.IA_TOPE_USD_MES || 0)

// Cuántas veces seguidas puede el bot contestar con IA en una misma
// conversación antes de volver al menú de botones. El bot conversacional es la
// partida que peor escala (su costo depende de conversaciones, no de reportes),
// así que el techo va puesto desde el día uno.
const MAX_TURNOS = Number(process.env.IA_MAX_TURNOS || 6)

// Precio por millón de tokens, para estimar el gasto. Si se cambia el modelo
// por uno que no esté acá, se usa la tarifa de Opus 5 — sobreestimar el gasto
// es el error seguro: hace que el tope corte antes, no después.
const PRECIOS = {
  'claude-opus-5': { entrada: 5, salida: 25 },
  'claude-sonnet-5': { entrada: 3, salida: 15 },
  'claude-haiku-4-5': { entrada: 1, salida: 5 },
}

const TIMEOUT_RAPIDO_MS = 12000 // el vecino está esperando en pantalla
const TIMEOUT_LARGO_MS = 60000 // informes, nadie mirando

let cliente = null
function obtenerCliente() {
  if (!CLAVE) return null
  if (!cliente) cliente = new Anthropic({ apiKey: CLAVE, maxRetries: 1 })
  return cliente
}

// --- Contabilidad de gasto ---
// Se lleva en memoria y se persiste en Firestore, porque Render reinicia el
// servicio seguido (sobre todo en plan Free) y un contador que se reinicia con
// el proceso no es un tope, es un adorno.

let db = null
let gastoMes = { mes: null, usd: 0 }

function mesActual() {
  return new Date().toISOString().slice(0, 7) // "2026-08"
}

// server.js llama a esto una vez, al arrancar, con la instancia de Firestore.
async function iniciar(firestore) {
  db = firestore
  if (!CLAVE) {
    console.log('[ia] Sin ANTHROPIC_API_KEY: las funciones de IA quedan apagadas y todo degrada al comportamiento anterior.')
    return
  }
  const mes = mesActual()
  try {
    const snap = await db.collection('configuracion').doc('ia_gasto').get()
    const datos = snap.exists ? snap.data() : {}
    gastoMes = { mes, usd: datos?.[mes] || 0 }
  } catch (error) {
    // Que no se pueda leer el gasto no debe impedir arrancar: se parte de cero
    // y el tope corta más tarde de lo debido, que es preferible a no arrancar.
    console.warn(`[ia] No se pudo leer el gasto acumulado, se parte de 0: ${error.message}`)
    gastoMes = { mes, usd: 0 }
  }
  console.log(`[ia] Activa con modelo ${MODELO}. Gasto de ${mes}: US$${gastoMes.usd.toFixed(4)}${TOPE_USD_MES ? ` de US$${TOPE_USD_MES}` : ' (sin tope)'}.`)
}

function estimarCosto(uso) {
  const precio = PRECIOS[MODELO] || PRECIOS['claude-opus-5']
  const entrada = (uso?.input_tokens || 0) + (uso?.cache_read_input_tokens || 0)
  const salida = uso?.output_tokens || 0
  return (entrada / 1e6) * precio.entrada + (salida / 1e6) * precio.salida
}

function registrarGasto(uso) {
  const mes = mesActual()
  if (gastoMes.mes !== mes) gastoMes = { mes, usd: 0 }

  const costo = estimarCosto(uso)
  gastoMes.usd += costo

  // Fire-and-forget: si la escritura falla, el contador en memoria sigue bien
  // hasta el próximo reinicio. No vale la pena bloquear una respuesta al vecino
  // por esto.
  if (db) {
    const admin = require('firebase-admin')
    db.collection('configuracion')
      .doc('ia_gasto')
      .set({ [mes]: admin.firestore.FieldValue.increment(costo) }, { merge: true })
      .catch((error) => console.warn(`[ia] No se pudo registrar el gasto: ${error.message}`))
  }
  return costo
}

function topeAlcanzado() {
  if (!TOPE_USD_MES) return false
  if (gastoMes.mes !== mesActual()) return false
  return gastoMes.usd >= TOPE_USD_MES
}

// La pregunta que hace el resto del código antes de intentar cualquier cosa.
function iaDisponible() {
  if (!CLAVE) return false
  if (topeAlcanzado()) return false
  return true
}

function estadoIa() {
  return {
    activa: iaDisponible(),
    tiene_clave: Boolean(CLAVE),
    modelo: MODELO,
    max_turnos: MAX_TURNOS,
    gasto_mes_usd: Number(gastoMes.usd.toFixed(4)),
    tope_usd_mes: TOPE_USD_MES || null,
    tope_alcanzado: topeAlcanzado(),
  }
}

// Envoltorio común: cualquier fallo de la API se registra y devuelve null.
// Ninguna función de este archivo lanza — quien la llama nunca tiene que
// envolverla en try/catch para no romper el flujo del vecino.
async function llamar(descripcion, parametros, timeout) {
  const api = obtenerCliente()
  if (!api) return null

  try {
    const respuesta = await api.messages.create(parametros, { timeout })
    const costo = registrarGasto(respuesta.usage)
    console.log(`[ia] ${descripcion}: ok (US$${costo.toFixed(5)}, acumulado del mes US$${gastoMes.usd.toFixed(4)}).`)
    return respuesta
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      console.warn(`[ia] ${descripcion}: la API está limitando el ritmo, se sigue sin IA.`)
    } else if (error instanceof Anthropic.AuthenticationError) {
      console.error('[ia] La ANTHROPIC_API_KEY no es válida. Todas las funciones de IA quedan degradadas hasta corregirla.')
    } else if (error instanceof Anthropic.APIError) {
      console.warn(`[ia] ${descripcion}: error ${error.status} de la API — ${error.message}`)
    } else {
      console.warn(`[ia] ${descripcion}: ${error.message}`)
    }
    return null
  }
}

function primerToolUse(respuesta, nombre) {
  const bloque = (respuesta?.content || []).find((b) => b.type === 'tool_use' && b.name === nombre)
  return bloque ? bloque.input : null
}

function textoDe(respuesta) {
  return (respuesta?.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
}

// ---------------------------------------------------------------------------
// 1. Clasificar un reporte a partir de la foto y lo que escribió el vecino
// ---------------------------------------------------------------------------

const CATEGORIAS_VALIDAS = Object.keys(ETIQUETA_POR_CATEGORIA)

const LISTA_CATEGORIAS = Object.entries(ETIQUETA_POR_CATEGORIA)
  .map(([slug, etiqueta]) => `${slug}: ${etiqueta}`)
  .join('\n')

// El prompt del sistema es estable (las 58 categorías no cambian entre
// reportes), así que se marca para caché: a partir de la segunda llamada esa
// parte cuesta una décima parte. Es la optimización que más plata ahorra acá,
// porque el catálogo es el grueso de la entrada.
const SISTEMA_CLASIFICAR = `Eres el clasificador de reportes ciudadanos de una municipalidad chilena.

Recibes la foto que sacó un vecino y, a veces, una descripción escrita por él.
Tu única tarea es elegir cuál de estas categorías describe mejor el problema:

${LISTA_CATEGORIAS}

Reglas:
- Elige SIEMPRE una categoría de la lista, usando el slug exacto (la parte antes de los dos puntos).
- Si la foto no muestra un problema de espacio público que le competa a un municipio, usa "Otro" con confianza baja.
- La confianza es tu propia certeza: "alta" solo si la foto muestra el problema con claridad.
- El motivo es UNA frase corta, en español de Chile, dirigida al vecino, explicando qué viste. Sin tecnicismos.
- No inventes detalles que no estén en la foto. No menciones personas, patentes ni datos privados.`

const HERRAMIENTA_CLASIFICAR = {
  name: 'clasificar',
  description: 'Entrega la categoría que mejor describe el reporte del vecino.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      categoria: { type: 'string', enum: CATEGORIAS_VALIDAS },
      confianza: { type: 'string', enum: ['alta', 'media', 'baja'] },
      motivo: { type: 'string' },
    },
    required: ['categoria', 'confianza', 'motivo'],
    additionalProperties: false,
  },
}

// Devuelve { categoria, confianza, motivo } o null.
//
// `foto` es { base64, tipo } — el tipo tiene que ser uno de los que acepta la
// API. La app manda la foto YA comprimida (comprimirImagen.js), así que lo que
// llega acá pesa poco.
async function clasificarReporte({ descripcion, foto }) {
  if (!iaDisponible()) return null
  if (!foto && !descripcion) return null

  const contenido = []

  if (foto?.base64) {
    contenido.push({
      type: 'image',
      source: { type: 'base64', media_type: foto.tipo || 'image/jpeg', data: foto.base64 },
    })
  }

  contenido.push({
    type: 'text',
    text: descripcion
      ? `El vecino escribió: "${descripcion}"\n\n¿Qué categoría corresponde?`
      : 'El vecino no escribió nada, solo mandó la foto. ¿Qué categoría corresponde?',
  })

  const respuesta = await llamar(
    'clasificar reporte',
    {
      model: MODELO,
      max_tokens: 1000,
      // Tarea corta y acotada: no necesita pensar mucho y el vecino está
      // esperando en pantalla.
      output_config: { effort: 'low' },
      system: [{ type: 'text', text: SISTEMA_CLASIFICAR, cache_control: { type: 'ephemeral' } }],
      tools: [HERRAMIENTA_CLASIFICAR],
      tool_choice: { type: 'tool', name: 'clasificar' },
      messages: [{ role: 'user', content: contenido }],
    },
    TIMEOUT_RAPIDO_MS
  )

  const salida = primerToolUse(respuesta, 'clasificar')
  if (!salida) return null

  // Validación obligatoria: el enum del schema ya lo restringe, pero el
  // catálogo real es la única autoridad. Un slug que no existe se descarta —
  // nunca se escribe en Firestore algo que la app no sepa mostrar.
  if (!CATEGORIAS_VALIDAS.includes(salida.categoria)) {
    console.warn(`[ia] El modelo propuso una categoría que no existe ("${salida.categoria}"), se descarta.`)
    return null
  }

  return {
    categoria: salida.categoria,
    etiqueta: ETIQUETA_POR_CATEGORIA[salida.categoria],
    confianza: salida.confianza,
    motivo: String(salida.motivo || '').slice(0, 300),
  }
}

// ---------------------------------------------------------------------------
// 2. ¿Son el mismo problema? — desempate semántico de duplicados
// ---------------------------------------------------------------------------
//
// La detección por cercanía (Haversine, 50 m) ya filtró los candidatos; esto
// solo desempata. Por eso corre en pocos reportes y cuesta casi nada.
//
// El hueco que cierra: hoy solo se comparan reportes de la MISMA categoría, así
// que "Bache" y "Pavimento deteriorado" sobre el mismo hoyo son dos tickets.

const HERRAMIENTA_DUPLICADO = {
  name: 'responder',
  description: 'Indica si los dos reportes describen el mismo problema físico.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      es_el_mismo: { type: 'boolean' },
      motivo: { type: 'string' },
    },
    required: ['es_el_mismo', 'motivo'],
    additionalProperties: false,
  },
}

const SISTEMA_DUPLICADO = `Decides si dos reportes ciudadanos describen EL MISMO problema físico.

Los dos ocurren a menos de 50 metros uno del otro. La pregunta no es si son parecidos,
sino si un funcionario que va al lugar arreglaría UNA sola cosa o DOS.

Ejemplos de "el mismo": un hoyo reportado como "Bache" y como "Pavimento deteriorado";
una luminaria reportada como apagada y como parpadeando.
Ejemplos de "no": dos luminarias distintas de la misma cuadra; un basural y un árbol caído.

Ante la duda, responde que NO son el mismo: fusionar dos problemas reales en un solo
ticket hace que uno de los dos no se arregle nunca.`

async function sonElMismoProblema({ nuevo, existente }) {
  if (!iaDisponible()) return null

  const respuesta = await llamar(
    'comparar duplicado',
    {
      model: MODELO,
      max_tokens: 500,
      output_config: { effort: 'low' },
      system: [{ type: 'text', text: SISTEMA_DUPLICADO, cache_control: { type: 'ephemeral' } }],
      tools: [HERRAMIENTA_DUPLICADO],
      tool_choice: { type: 'tool', name: 'responder' },
      messages: [
        {
          role: 'user',
          content:
            `Reporte nuevo:\n` +
            `  categoría: ${ETIQUETA_POR_CATEGORIA[nuevo.categoria] || nuevo.categoria}\n` +
            `  descripción: ${nuevo.descripcion || '(sin descripción)'}\n` +
            `  dirección: ${nuevo.direccion || '(sin dirección)'}\n\n` +
            `Reporte que ya existe (a ${Math.round(existente.distancia_metros)} m):\n` +
            `  categoría: ${ETIQUETA_POR_CATEGORIA[existente.categoria] || existente.categoria}\n` +
            `  descripción: ${existente.descripcion || '(sin descripción)'}\n` +
            `  dirección: ${existente.direccion || '(sin dirección)'}`,
        },
      ],
    },
    TIMEOUT_RAPIDO_MS
  )

  const salida = primerToolUse(respuesta, 'responder')
  if (!salida) return null

  return { esElMismo: Boolean(salida.es_el_mismo), motivo: String(salida.motivo || '').slice(0, 300) }
}

// ---------------------------------------------------------------------------
// 3. Resumen para la Cuenta Pública
// ---------------------------------------------------------------------------
//
// Los números ya están calculados por reporteGerencial.js: acá solo se narran.
// Es deliberado que la IA no calcule nada — si inventara una cifra, terminaría
// dicha en voz alta por un Alcalde.

const SISTEMA_RESUMEN = `Escribes el párrafo de resumen de la cuenta pública de una municipalidad chilena.

Recibes cifras YA CALCULADAS. Tu trabajo es narrarlas, no recalcularlas ni completarlas.

Reglas estrictas:
- Usa SOLO las cifras que te entregan. No inventes ni estimes ninguna otra.
- Si una cifra no está, no la menciones. No escribas "aproximadamente" ni rellenes.
- Máximo 150 palabras, dos o tres párrafos cortos.
- Tono institucional chileno, sobrio. Sin adjetivos de propaganda, sin signos de exclamación.
- Es un texto que el Alcalde puede leer en voz alta ante el concejo: escríbelo para ser dicho.
- No prometas nada a futuro. Describe lo que pasó en el período.`

async function resumirParaCuentaPublica(datos) {
  if (!iaDisponible()) return null

  const respuesta = await llamar(
    'resumen de cuenta pública',
    {
      model: MODELO,
      max_tokens: 2000,
      system: [{ type: 'text', text: SISTEMA_RESUMEN, cache_control: { type: 'ephemeral' } }],
      messages: [
        {
          role: 'user',
          content: `Cifras del período:\n\n${JSON.stringify(datos, null, 2)}\n\nEscribe el resumen.`,
        },
      ],
    },
    TIMEOUT_LARGO_MS
  )

  const texto = textoDe(respuesta)
  return texto || null
}

// ---------------------------------------------------------------------------
// 4. El bot conversacional
// ---------------------------------------------------------------------------
//
// El webhook le pasa el historial y las herramientas que sabe ejecutar; acá se
// corre el ciclo y se devuelve qué contestar. Las herramientas las EJECUTA el
// webhook (tiene el acceso a Firestore), no este archivo: así toda la lectura
// de datos del vecino sigue pasando por el mismo código de siempre.

const SISTEMA_BOT = `Eres el asistente por WhatsApp de una municipalidad chilena. Hablas con vecinos.

Cómo hablas:
- Español de Chile, tratando de "tú", cercano y breve. Mensajes de WhatsApp, no cartas.
- Frases cortas. Nunca más de 6 líneas por respuesta.
- Muchos vecinos son adultos mayores: nada de tecnicismos, nada de jerga.
- Puedes usar algún emoji, con moderación.

Qué puedes hacer:
- Buscar un reporte por su número de ticket (6 dígitos).
- Listar los reportes hechos desde el número que te escribe.
- Entregar el enlace para hacer un reporte nuevo.

Reglas que no puedes romper:
- NUNCA inventes el estado de un reporte, una fecha, ni un plazo de reparación. Si no lo
  entregó una herramienta, no lo sabes.
- NUNCA prometas cuándo se va a arreglar algo. El municipio no se compromete por tu boca.
- Si te preguntan algo que no puedes resolver (una urgencia, un trámite, una consulta que
  no es de reportes), dilo y deriva: emergencias al 133, y para lo demás la Oficina de
  Partes de la municipalidad.
- Si alguien describe una emergencia en curso (fuego, alguien herido, un delito pasando),
  lo primero de tu respuesta es que llame al 133 o 131.
- No pidas RUT, dirección exacta del domicilio ni datos personales que no necesites.`

// El webhook pasa `herramientas` como [{ definicion, ejecutar }]. Se corre el
// ciclo hasta que el modelo deja de pedir herramientas o se llega al tope de
// vueltas — un tope existe porque un ciclo sin techo es un costo sin techo.
const MAX_VUELTAS_HERRAMIENTAS = 4

async function responderConversacion({ historial, herramientas }) {
  if (!iaDisponible()) return null

  const mensajes = historial.map((m) => ({ role: m.rol, content: m.texto }))
  const definiciones = herramientas.map((h) => h.definicion)

  for (let vuelta = 0; vuelta < MAX_VUELTAS_HERRAMIENTAS; vuelta++) {
    const respuesta = await llamar(
      'responder al vecino',
      {
        model: MODELO,
        max_tokens: 2000,
        output_config: { effort: 'low' },
        system: [{ type: 'text', text: SISTEMA_BOT, cache_control: { type: 'ephemeral' } }],
        tools: definiciones,
        messages: mensajes,
      },
      TIMEOUT_RAPIDO_MS
    )

    // Cualquier fallo devuelve null y el webhook cae al menú de botones.
    if (!respuesta) return null

    if (respuesta.stop_reason !== 'tool_use') {
      const texto = textoDe(respuesta)
      return texto || null
    }

    const pedidos = (respuesta.content || []).filter((b) => b.type === 'tool_use')
    mensajes.push({ role: 'assistant', content: respuesta.content })

    const resultados = []
    for (const pedido of pedidos) {
      const herramienta = herramientas.find((h) => h.definicion.name === pedido.name)
      if (!herramienta) {
        resultados.push({
          type: 'tool_result',
          tool_use_id: pedido.id,
          content: 'Esa herramienta no existe.',
          is_error: true,
        })
        continue
      }
      try {
        const resultado = await herramienta.ejecutar(pedido.input)
        resultados.push({ type: 'tool_result', tool_use_id: pedido.id, content: String(resultado) })
      } catch (error) {
        // Se devuelve el error como resultado en vez de abortar: el modelo
        // puede explicárselo al vecino en vez de dejarlo sin respuesta.
        console.warn(`[ia] La herramienta ${pedido.name} falló: ${error.message}`)
        resultados.push({
          type: 'tool_result',
          tool_use_id: pedido.id,
          content: 'No se pudo consultar esa información en este momento.',
          is_error: true,
        })
      }
    }

    mensajes.push({ role: 'user', content: resultados })
  }

  console.warn('[ia] Se llegó al tope de vueltas de herramientas sin una respuesta final.')
  return null
}

module.exports = {
  iniciar,
  iaDisponible,
  estadoIa,
  clasificarReporte,
  sonElMismoProblema,
  resumirParaCuentaPublica,
  responderConversacion,
  MAX_TURNOS,
  CATEGORIAS_VALIDAS,
}
