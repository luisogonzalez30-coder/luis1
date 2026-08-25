// Endpoints de IA para la app web.
//
// Existen porque la clave de API NO puede vivir en el navegador: cualquiera que
// abra el sitio descarga el JavaScript y la leería. Así que el formulario del
// vecino le pide la clasificación a este servicio, que es el único que tiene la
// clave.
//
// Eso convierte a estas rutas en algo que hay que proteger: son públicas, sin
// login (el vecino nunca se autentica, ver §16), y cada llamada cuesta plata.
// Un endpoint público que gasta dinero es un blanco. Las defensas, en orden:
//
//   1. CORS cerrado a los orígenes de la app (ORIGENES_PERMITIDOS).
//   2. Tope de llamadas por IP y por minuto.
//   3. Tope de tamaño de la foto, antes de mandarla a ninguna parte.
//   4. El tope de gasto mensual de ia.js, que apaga todo si se alcanza.
//
// Ninguna de estas rutas es necesaria para que la app funcione: si el servicio
// está caído o la IA apagada, el formulario sigue funcionando exactamente como
// antes (el vecino elige su categoría a mano).

const express = require('express')
const ia = require('./ia')

// Orígenes que pueden llamar a estas rutas. Se pueden agregar más por variable
// de entorno, separados por coma, para no tener que tocar código al montar un
// dominio propio.
const ORIGENES_PERMITIDOS = [
  'https://app-incidencias-urbanas.web.app',
  'https://app-incidencias-urbanas.firebaseapp.com',
  ...(process.env.IA_ORIGENES_EXTRA || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
]

// En desarrollo el front corre en localhost y necesita poder llamar.
if (process.env.NODE_ENV !== 'production') {
  ORIGENES_PERMITIDOS.push('http://localhost:5173', 'http://localhost:4173')
}

// Una foto comprimida por la app pesa bastante menos que esto
// (comprimirImagen.js la deja en el orden de los cientos de kB). El tope está
// para que nadie mande un archivo enorme, no para acotar el uso normal.
const MAX_FOTO_BASE64 = 3 * 1024 * 1024
const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const MAX_LLAMADAS_IP = 20
const VENTANA_MS = 60 * 1000
const llamadasPorIp = new Map()

function excedeLimiteIp(ip) {
  const ahora = Date.now()
  const registro = llamadasPorIp.get(ip)

  if (!registro || ahora - registro.desde > VENTANA_MS) {
    llamadasPorIp.set(ip, { desde: ahora, cuenta: 1 })
    return false
  }

  registro.cuenta += 1
  return registro.cuenta > MAX_LLAMADAS_IP
}

setInterval(() => {
  const limite = Date.now() - VENTANA_MS
  for (const [ip, registro] of llamadasPorIp) {
    if (registro.desde < limite) llamadasPorIp.delete(ip)
  }
}, VENTANA_MS).unref()

function crearRouter() {
  const router = express.Router()

  // La foto va en el cuerpo, así que el límite de express tiene que dar espacio
  // para el base64 (que infla ~33% sobre el binario).
  router.use(express.json({ limit: '5mb' }))

  router.use((req, res, siguiente) => {
    const origen = req.get('Origin')

    // Sin cabecera Origin son llamadas que no vienen de un navegador (los
    // scripts de prueba del repo, por ejemplo): se dejan pasar, porque el tope
    // por IP y el tope de gasto siguen aplicando igual.
    if (origen && !ORIGENES_PERMITIDOS.includes(origen)) {
      console.warn(`[ia] Llamada rechazada desde un origen no permitido: ${origen}`)
      return res.status(403).json({ error: 'origen no permitido' })
    }

    if (origen) {
      res.set('Access-Control-Allow-Origin', origen)
      res.set('Vary', 'Origin')
    }
    res.set('Access-Control-Allow-Headers', 'Content-Type')
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')

    if (req.method === 'OPTIONS') return res.sendStatus(204)

    const ip = req.ip || req.socket?.remoteAddress || 'desconocida'
    if (excedeLimiteIp(ip)) {
      console.warn(`[ia] ${ip} superó ${MAX_LLAMADAS_IP} llamadas por minuto, se rechaza.`)
      return res.status(429).json({ error: 'demasiadas llamadas, intenta en un minuto' })
    }

    return siguiente()
  })

  // Para que la app sepa si mostrar la sugerencia o no, sin tener que intentar
  // y fallar. Devuelve solo lo que el navegador necesita saber: si está activa.
  // El gasto y el modelo NO se publican — es una URL pública.
  router.get('/estado', (_req, res) => {
    res.json({ activa: ia.iaDisponible() })
  })

  // Sugerir la categoría de un reporte a partir de la foto y la descripción.
  //
  // Devuelve 200 con { sugerencia: null } cuando la IA no está disponible, en
  // vez de un error: para la app "no hay sugerencia" es una respuesta válida y
  // esperada, no una falla que haya que manejar aparte.
  router.post('/clasificar', async (req, res) => {
    const { descripcion, foto } = req.body || {}

    if (foto) {
      if (typeof foto.base64 !== 'string' || foto.base64.length > MAX_FOTO_BASE64) {
        return res.status(413).json({ error: 'la foto es demasiado grande' })
      }
      if (foto.tipo && !TIPOS_IMAGEN.includes(foto.tipo)) {
        return res.status(415).json({ error: 'tipo de imagen no soportado' })
      }
    }

    if (!foto && !descripcion) {
      return res.status(400).json({ error: 'hace falta una foto o una descripción' })
    }

    const sugerencia = await ia.clasificarReporte({
      descripcion: typeof descripcion === 'string' ? descripcion.slice(0, 1000) : '',
      foto,
    })

    res.json({ sugerencia })
  })

  // Desempate semántico de duplicados. La app ya filtró por cercanía; esto solo
  // decide si dos reportes cercanos son el mismo problema.
  router.post('/duplicado', async (req, res) => {
    const { nuevo, existente } = req.body || {}

    if (!nuevo?.categoria || !existente?.categoria) {
      return res.status(400).json({ error: 'faltan los dos reportes a comparar' })
    }

    const veredicto = await ia.sonElMismoProblema({ nuevo, existente })
    res.json({ veredicto })
  })

  // Resumen narrado de la Cuenta Pública. Los números vienen ya calculados por
  // la app: acá no se calcula nada, solo se redacta.
  router.post('/resumen', async (req, res) => {
    const { datos } = req.body || {}
    if (!datos || typeof datos !== 'object') {
      return res.status(400).json({ error: 'faltan los datos del período' })
    }

    const resumen = await ia.resumirParaCuentaPublica(datos)
    res.json({ resumen })
  })

  return router
}

module.exports = { crearRouter, ORIGENES_PERMITIDOS }
