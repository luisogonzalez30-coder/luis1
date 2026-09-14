// Cliente de las funciones de IA. Todas viven en el servicio de WhatsApp
// (Render), no acá: la clave de API no puede viajar al navegador, porque el
// bundle lo descarga cualquiera que abra el sitio.
//
// Regla que gobierna este archivo: **nada de esto puede romper el formulario**.
// Si el servicio está caído, si la IA está apagada o si la respuesta demora,
// cada función devuelve null y el residente sigue reportando exactamente como
// antes. Por eso ninguna lanza y todas tienen su propio tope de espera.

const URL_BOT = import.meta.env.VITE_URL_BOT || 'https://proyectomuni.onrender.com'

// El residente está mirando la pantalla. Pasado este tiempo se sigue sin
// sugerencia — es preferible a dejarlo esperando por algo que es opcional.
const TIMEOUT_MS = 12000

// El chequeo de duplicados es más impaciente que el resto: ahí el residente ya
// tocó "Siguiente" y el formulario está detenido esperando. Doce segundos
// mirando un botón que no responde se sienten como que la app se colgó.
const TIMEOUT_DUPLICADO_MS = 6000

// Sin conexión no tiene sentido intentar: se ahorra la espera completa del
// tope de tiempo antes de rendirse. El formulario ya sabe funcionar offline
// (cola de reportes, la documentación) y esto es justamente lo prescindible.
function haySenal() {
  return typeof navigator === 'undefined' || navigator.onLine
}

async function pedir(ruta, cuerpo, timeoutMs = TIMEOUT_MS) {
  const abortador = new AbortController()
  const reloj = setTimeout(() => abortador.abort(), timeoutMs)

  try {
    const respuesta = await fetch(`${URL_BOT}${ruta}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
      signal: abortador.signal,
    })

    if (!respuesta.ok) {
      console.warn(`[iaService] ${ruta} respondió ${respuesta.status}, se sigue sin IA.`)
      return null
    }

    return await respuesta.json()
  } catch (error) {
    // AbortError incluido: que la sugerencia no llegue no es un error del que
    // haya que enterar al residente.
    console.warn(`[iaService] ${ruta} no respondió (${error.name}), se sigue sin IA.`)
    return null
  } finally {
    clearTimeout(reloj)
  }
}

// Convierte el File de la foto a base64 sin el prefijo "data:...;base64,".
// La foto ya viene comprimida por comprimirImagen.js, así que esto pesa poco.
function aBase64(archivo) {
  return new Promise((resolver) => {
    const lector = new FileReader()
    lector.onload = () => {
      const resultado = String(lector.result || '')
      const coma = resultado.indexOf(',')
      resolver(coma >= 0 ? resultado.slice(coma + 1) : null)
    }
    lector.onerror = () => resolver(null)
    lector.readAsDataURL(archivo)
  })
}

// Tipos que acepta la API. Una foto de celular siempre cae en los dos primeros;
// el resto se descarta antes de gastar la subida.
const TIPOS_ACEPTADOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// Pide la categoría que mejor describe el reporte.
// Devuelve { categoria, etiqueta, confianza, motivo } o null.
export async function sugerirCategoria({ foto, descripcion }) {
  if (!foto && !descripcion) return null
  if (!haySenal()) return null

  let fotoCodificada = null
  if (foto) {
    if (!TIPOS_ACEPTADOS.includes(foto.type)) return null
    const base64 = await aBase64(foto)
    if (!base64) return null
    fotoCodificada = { base64, tipo: foto.type }
  }

  const datos = await pedir('/ia/clasificar', { descripcion, foto: fotoCodificada })
  return datos?.sugerencia || null
}

// Pregunta si dos reportes cercanos son el mismo problema físico.
// Devuelve { esElMismo, motivo } o null.
export async function esElMismoProblema({ nuevo, existente }) {
  if (!haySenal()) return null
  const datos = await pedir('/ia/duplicado', { nuevo, existente }, TIMEOUT_DUPLICADO_MS)
  return datos?.veredicto || null
}

// Redacta el párrafo de resumen de la Cuenta Pública a partir de cifras YA
// calculadas. Nadie está esperando en pantalla, así que la espera es más larga.
export async function redactarResumenCuentaPublica(datos) {
  if (!haySenal()) return null
  const respuesta = await pedir('/ia/resumen', { datos }, 60000)
  return respuesta?.resumen || null
}

// Si la IA está encendida en el servidor. Se usa para no mostrar controles que
// no van a hacer nada (ej. el botón de resumen en el panel del Administrador).
export async function iaEstaActiva() {
  try {
    const abortador = new AbortController()
    const reloj = setTimeout(() => abortador.abort(), 5000)
    const respuesta = await fetch(`${URL_BOT}/ia/estado`, { signal: abortador.signal })
    clearTimeout(reloj)
    if (!respuesta.ok) return false
    const datos = await respuesta.json()
    return Boolean(datos?.activa)
  } catch {
    return false
  }
}
