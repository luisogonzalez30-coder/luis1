// Cola de reportes ciudadanos pendientes de sincronizar.
//
// POR QUÉ INDEXEDDB Y NO localStorage (02-sep-2026)
// -------------------------------------------------
// La cola vivía en localStorage. Eso traía dos problemas, y el segundo es el
// que importa en terreno:
//
//  1. Cuota. localStorage son ~5 MB por origen, compartidos con todo lo demás
//     que la app guarda ahí (id de dispositivo, votos, enfriamiento). Un
//     reporte de texto no la llena, pero al llenarse lanza QuotaExceededError
//     y el reporte se pierde sin red que lo recoja.
//  2. Solo guarda texto. Un File no cabe en JSON, así que **la foto se
//     descartaba**: el vecino de la zona sin señal —justo el que más necesita
//     que le crean— mandaba su reporte sin la imagen. Está documentado en §10
//     y en los comentarios de FormularioCiudadano.
//
// IndexedDB resuelve los dos: la cuota se mide en cientos de MB (porcentaje del
// disco, no 5 MB fijos) y guarda Blob/File nativamente, sin convertir a base64
// —que además infla un 33% y hay que decodificar en memoria en un celular de
// gama baja—. La foto ahora sobrevive a la cola.
//
// La API sigue siendo la misma de antes salvo que ahora es asíncrona: IndexedDB
// no tiene una lectura síncrona equivalente a getItem.
//
// RESPALDO EN localStorage
// ------------------------
// IndexedDB no está siempre disponible: Safari en modo privado antiguo, un
// navegador con almacenamiento bloqueado, un WebView recortado. Cuando abrir la
// base falla, la cola cae a localStorage con el MISMO formato que usaba antes,
// y en ese camino las fotos se descartan (no caben). guardarReportePendiente
// devuelve `conFotos` para que quien llama pueda decirle la verdad al vecino en
// vez de prometerle una foto que no se guardó.

const NOMBRE_BD = 'tumuniaqui-offline'
const VERSION_BD = 1
const ALMACEN = 'reportes_pendientes'

// Misma clave que usaba la versión en localStorage: sirve de respaldo Y de
// origen de la migración de lo que haya quedado encolado antes de este cambio.
const CLAVE_LEGADO = 'reportes_pendientes'

function generarIdLocal() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// --- IndexedDB ---

// Se abre UNA vez y se reusa la promesa: abrir en cada operación multiplica los
// eventos de upgrade y deja conexiones colgando. Si falla, se cachea el null —
// no tiene sentido reintentar en cada guardado cuando el navegador ya dijo que
// no.
let promesaBD = null

function abrirBD() {
  if (promesaBD) return promesaBD

  promesaBD = new Promise((resolver) => {
    if (typeof indexedDB === 'undefined') {
      console.warn('[colaOffline] Este navegador no tiene IndexedDB; se usa localStorage sin fotos.')
      return resolver(null)
    }

    let solicitud
    try {
      solicitud = indexedDB.open(NOMBRE_BD, VERSION_BD)
    } catch (error) {
      // Safari en modo privado lanza acá mismo, antes de cualquier evento.
      console.warn('[colaOffline] No se pudo abrir IndexedDB:', error)
      return resolver(null)
    }

    solicitud.onupgradeneeded = () => {
      const bd = solicitud.result
      if (!bd.objectStoreNames.contains(ALMACEN)) {
        bd.createObjectStore(ALMACEN, { keyPath: 'idLocal' })
      }
    }

    solicitud.onsuccess = () => resolver(solicitud.result)
    solicitud.onerror = () => {
      console.warn('[colaOffline] IndexedDB rechazó la apertura:', solicitud.error)
      resolver(null)
    }
    // Un onblocked queda esperando para siempre si otra pestaña tiene una
    // versión vieja abierta. Se resuelve como "no disponible" y la cola cae al
    // respaldo, en vez de dejar el envío del vecino colgado.
    solicitud.onblocked = () => {
      console.warn('[colaOffline] IndexedDB bloqueada por otra pestaña; se usa localStorage.')
      resolver(null)
    }
  })

  return promesaBD
}

// Envuelve una transacción en una promesa. Se resuelve con el resultado de la
// petición, no con el evento, y solo cuando la transacción COMPLETA: en
// IndexedDB una petición puede tener éxito y la transacción abortar después.
function ejecutar(bd, modo, operacion) {
  return new Promise((resolver, rechazar) => {
    let resultado
    const transaccion = bd.transaction(ALMACEN, modo)

    transaccion.oncomplete = () => resolver(resultado)
    transaccion.onerror = () => rechazar(transaccion.error)
    transaccion.onabort = () => rechazar(transaccion.error || new Error('Transacción abortada'))

    const peticion = operacion(transaccion.objectStore(ALMACEN))
    if (peticion) peticion.onsuccess = () => { resultado = peticion.result }
  })
}

// --- Respaldo en localStorage (sin fotos) ---

function leerLegado() {
  try {
    const crudo = localStorage.getItem(CLAVE_LEGADO)
    return crudo ? JSON.parse(crudo) : []
  } catch (error) {
    console.error('[colaOffline] No se pudo leer la cola local:', error)
    return []
  }
}

function escribirLegado(cola) {
  try {
    localStorage.setItem(CLAVE_LEGADO, JSON.stringify(cola))
    return true
  } catch (error) {
    console.error('[colaOffline] No se pudo guardar en almacenamiento local:', error)
    return false
  }
}

// Las fotos son File/Blob: no sobreviven a JSON.stringify. Se quitan a
// propósito y de forma explícita, para que el reporte se guarde igual en vez de
// romper la serialización entera.
function sinFotos(datos) {
  const { fotosAntes, ...resto } = datos
  return resto
}

// Lo que haya quedado en localStorage de antes de este cambio se pasa a
// IndexedDB la primera vez que se lee la cola, y recién ahí se borra el
// original. Si la copia falla, el legado queda intacto y se reintenta en la
// siguiente lectura: perder un reporte encolado es peor que migrarlo dos veces
// (el reintento ya es idempotente por numeroTicketExistente, ver crearIncidencia).
let legadoMigrado = false

async function migrarLegado(bd) {
  if (legadoMigrado) return
  legadoMigrado = true

  const pendientes = leerLegado()
  if (pendientes.length === 0) return

  try {
    for (const item of pendientes) {
      await ejecutar(bd, 'readwrite', (almacen) => almacen.put(item))
    }
    localStorage.removeItem(CLAVE_LEGADO)
    console.info(`[colaOffline] Migrados ${pendientes.length} reporte(s) de localStorage a IndexedDB.`)
  } catch (error) {
    legadoMigrado = false
    console.error('[colaOffline] Falló la migración de la cola a IndexedDB; se conserva la copia anterior:', error)
  }
}

// --- API pública ---

// Guarda un reporte para reintentar más tarde.
//
// Devuelve { idLocal, conFotos }:
//   - idLocal: null si el dispositivo no pudo persistirlo por ninguna vía. Ahí
//     no hay garantía de reintento automático y quien llama debe pedirle al
//     vecino que anote su número de ticket.
//   - conFotos: si las fotos quedaron guardadas junto al reporte. Es false
//     cuando no había fotos o cuando se cayó al respaldo de localStorage.
export async function guardarReportePendiente(datos) {
  const idLocal = generarIdLocal()
  const item = { idLocal, datos, creadoEn: Date.now() }
  const tieneFotos = Boolean(datos?.fotosAntes?.length)

  const bd = await abrirBD()

  if (bd) {
    try {
      await migrarLegado(bd)
      await ejecutar(bd, 'readwrite', (almacen) => almacen.put(item))
      return { idLocal, conFotos: tieneFotos }
    } catch (error) {
      // QuotaExceededError con fotos adentro es el caso realista acá. Se
      // reintenta sin ellas antes de rendirse: el texto del reporte pesa unos
      // pocos KB y es lo que el municipio necesita sí o sí.
      console.error('[colaOffline] IndexedDB rechazó el guardado, se reintenta sin fotos:', error)
      try {
        await ejecutar(bd, 'readwrite', (almacen) => almacen.put({ ...item, datos: sinFotos(datos) }))
        return { idLocal, conFotos: false }
      } catch (segundoError) {
        console.error('[colaOffline] IndexedDB tampoco pudo guardar el reporte sin fotos:', segundoError)
      }
    }
  }

  const cola = leerLegado()
  cola.push({ ...item, datos: sinFotos(datos) })
  return escribirLegado(cola) ? { idLocal, conFotos: false } : { idLocal: null, conFotos: false }
}

export async function obtenerReportesPendientes() {
  const bd = await abrirBD()
  if (!bd) return leerLegado()

  try {
    await migrarLegado(bd)
    const items = await ejecutar(bd, 'readonly', (almacen) => almacen.getAll())
    // Más antiguo primero: el orden en que el vecino los mandó es el orden en
    // que conviene reintentarlos.
    return (items || []).sort((a, b) => (a.creadoEn || 0) - (b.creadoEn || 0))
  } catch (error) {
    console.error('[colaOffline] No se pudo leer la cola de IndexedDB:', error)
    return leerLegado()
  }
}

export async function eliminarReportePendiente(idLocal) {
  const bd = await abrirBD()

  if (bd) {
    try {
      await ejecutar(bd, 'readwrite', (almacen) => almacen.delete(idLocal))
    } catch (error) {
      console.error('[colaOffline] No se pudo borrar el reporte ya sincronizado:', error)
    }
  }

  // También en el respaldo: un reporte migrado a medias no debe volver a
  // enviarse desde localStorage.
  const cola = leerLegado()
  const filtrada = cola.filter((item) => item.idLocal !== idLocal)
  if (filtrada.length !== cola.length) escribirLegado(filtrada)
}
