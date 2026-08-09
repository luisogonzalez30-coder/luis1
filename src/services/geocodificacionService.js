import { conTimeout } from '../utils/timeout'
import { distanciaMetros } from '../utils/distancia'
import { normalizarTexto } from '../utils/busqueda'

// Geocodificación: dirección escrita → coordenadas, y su inversa (coordenadas →
// dirección aproximada). Es la tercera forma de fijar la ubicación en el Paso 1,
// junto al GPS y al toque directo en el mapa (ver §11): el vecino que no tiene
// señal de GPS adentro de su casa, o que reporta algo que vio en otra calle,
// puede escribir la dirección y elegirla de una lista.
//
// **Por qué Nominatim (OpenStreetMap) y no Google Places**: es el mismo proyecto
// que ya provee los tiles del mapa (ver MapaSeleccionUbicacion.jsx), es gratis,
// no pide API key ni cuenta con facturación — el mismo criterio por el que la
// capa satelital es Esri y no Google. La contrapartida es su política de uso
// justo (1 petición por segundo, sin autocompletado agresivo), que acá se
// respeta con tres cosas: el espaciado forzado de `esperarTurno`, la caché en
// memoria, y el rebote de 700 ms del hook que llama a esto
// (hooks/useBusquedaDirecciones.js).
//
// Si algún día el volumen deja de caber en esa política, este archivo es el
// único lugar que hay que cambiar (instancia propia de Nominatim, o proveedor
// pago): el resto de la app solo conoce `buscarDirecciones` y
// `obtenerDireccionAproximada`.

const BASE = 'https://nominatim.openstreetmap.org'

// Política de uso justo de Nominatim: máximo 1 petición por segundo. Se usa
// 1100 ms para dejar margen al reloj del dispositivo.
const MS_ENTRE_PETICIONES = 1100

const LIMITE_RESULTADOS = 6
const TIMEOUT_MS = 8000

// Cuánto se aleja del centro de la comuna la caja de búsqueda que se le pasa a
// Nominatim como preferencia (~28 km en latitud). No es un límite duro: Nominatim
// prioriza lo que cae adentro pero igual puede devolver resultados de otra región,
// y por eso además se filtra por distancia real más abajo.
const GRADOS_VIEWBOX = 0.25

// Distancia máxima al centro de la comuna para considerar un resultado. Sin este
// filtro, escribir "Los Aromos" devuelve calles de Santiago o Concepción, que en
// esta app no son un resultado válido: el vecino solo puede reportar en su comuna.
const RADIO_MAX_METROS = 30000

// Nombres de calle/localidad en el orden en que Nominatim los entrega dentro de
// `address`. Se recorren de más específico a menos.
const CAMPOS_LOCALIDAD = ['village', 'town', 'city', 'hamlet', 'suburb', 'neighbourhood', 'locality', 'municipality']

const MAX_ENTRADAS_CACHE = 40
const cacheBusquedas = new Map()
const cacheInversas = new Map()

// El documento de la municipalidad guarda el nombre institucional
// ("Municipalidad de Licantén"), pero Nominatim busca por el nombre de la comuna
// ("Licantén"). Sin esta limpieza, pegarle el nombre completo a la consulta la
// arruina: "Municipalidad de" no existe como lugar y arrastra los resultados
// hacia el edificio municipal.
export function nombreComuna(municipio) {
  const nombre = (municipio?.nombre || '').trim()
  if (!nombre) return ''
  return nombre.replace(/^(i\.?\s+|ilustre\s+)?municipalidad\s+(de\s+|del\s+)?/i, '').trim()
}

function recordar(cache, clave, valor) {
  // Caché acotada y de por vida de la pestaña: alcanza para que volver atrás y
  // adelante en el wizard, o corregir una letra y borrarla, no gaste peticiones.
  if (cache.size >= MAX_ENTRADAS_CACHE) cache.delete(cache.keys().next().value)
  cache.set(clave, valor)
}

function errorAbortado() {
  const error = new Error('Búsqueda cancelada')
  error.name = 'AbortError'
  return error
}

// Serializa las peticiones con al menos MS_ENTRE_PETICIONES de separación.
// `proximoTurno` se reserva antes de esperar, así dos llamadas simultáneas
// (búsqueda + geocodificación inversa) se ordenan una detrás de la otra en vez
// de salir juntas.
let proximoTurno = 0
function esperarTurno() {
  const ahora = Date.now()
  const inicio = Math.max(ahora, proximoTurno)
  proximoTurno = inicio + MS_ENTRE_PETICIONES
  return new Promise((resolver) => setTimeout(resolver, inicio - ahora))
}

async function pedir(ruta, parametros, senal) {
  await esperarTurno()
  if (senal?.aborted) throw errorAbortado()

  const url = new URL(BASE + ruta)
  url.search = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
    // Nombres en español cuando OSM los tiene traducidos.
    'accept-language': 'es',
    ...parametros,
  }).toString()

  const respuesta = await conTimeout(
    fetch(url, { headers: { Accept: 'application/json' }, signal: senal }),
    TIMEOUT_MS,
    'La búsqueda de direcciones tardó demasiado.'
  )

  if (!respuesta.ok) throw new Error(`Nominatim respondió ${respuesta.status}`)
  return respuesta.json()
}

function cajaDeBusqueda(centro) {
  if (typeof centro?.lat !== 'number' || typeof centro?.lng !== 'number') return null
  // viewbox va como <lon1>,<lat1>,<lon2>,<lat2> (dos esquinas opuestas).
  return [
    centro.lng - GRADOS_VIEWBOX,
    centro.lat + GRADOS_VIEWBOX,
    centro.lng + GRADOS_VIEWBOX,
    centro.lat - GRADOS_VIEWBOX,
  ].join(',')
}

// Arma las dos líneas que ve el vecino en la lista de resultados: arriba la
// calle con su número (o el nombre del lugar), abajo la localidad y la comuna
// para poder distinguir dos calles que se llaman igual.
function formatearResultado(item, centro) {
  const lat = Number(item.lat)
  const lng = Number(item.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const direccion = item.address || {}
  const partesNombre = (item.display_name || '').split(',').map((p) => p.trim()).filter(Boolean)

  const via = [direccion.road, direccion.house_number].filter(Boolean).join(' ')
  const etiqueta = via || item.name || partesNombre[0] || 'Lugar sin nombre'

  const localidad = CAMPOS_LOCALIDAD.map((campo) => direccion[campo]).find(Boolean)
  const detalle = [localidad, direccion.county, direccion.state]
    .filter(Boolean)
    .filter((parte, i, todas) => parte !== etiqueta && todas.indexOf(parte) === i)
    .join(', ')

  return {
    id: `${item.osm_type || 'x'}-${item.osm_id || item.place_id}`,
    etiqueta,
    detalle,
    coordenadas: { lat, lng },
    // Un resultado de Nominatim con calle y número es un punto preciso; uno que
    // resuelve solo a la localidad ("Iloca") cae en su centro, y ahí el vecino
    // todavía tiene que mover el pin. La UI lo dice distinto en cada caso.
    aproximada: !via,
    distancia: centro?.lat ? distanciaMetros({ lat, lng }, centro) : null,
    origen: 'osm',
  }
}

function normalizarResultados(crudos, centro) {
  const vistos = new Set()

  return (Array.isArray(crudos) ? crudos : [])
    .map((item) => formatearResultado(item, centro))
    .filter(Boolean)
    .filter((r) => r.distancia === null || r.distancia <= RADIO_MAX_METROS)
    .filter((r) => {
      // Nominatim suele devolver el mismo tramo de calle partido en varios
      // registros (uno por segmento). Para el vecino son la misma dirección.
      const clave = `${normalizarTexto(r.etiqueta)}|${normalizarTexto(r.detalle)}`
      if (vistos.has(clave)) return false
      vistos.add(clave)
      return true
    })
    .sort((a, b) => (a.distancia ?? Infinity) - (b.distancia ?? Infinity))
    .slice(0, LIMITE_RESULTADOS)
}

// Busca una dirección escrita a mano y devuelve candidatos con coordenadas,
// acotados a la comuna del tenant. Lanza si falla la red; devuelve [] si no hay
// resultados (que es un caso normal, no un error).
export async function buscarDirecciones({ texto, municipio, senal }) {
  const consulta = (texto || '').trim()
  if (consulta.length < 3) return []

  const comuna = nombreComuna(municipio)
  const centro = municipio?.centro_mapa
  const clave = `${municipio?.id || ''}|${normalizarTexto(consulta)}`
  if (cacheBusquedas.has(clave)) return cacheBusquedas.get(clave)

  const caja = cajaDeBusqueda(centro)
  const parametrosBase = {
    countrycodes: 'cl',
    limit: String(LIMITE_RESULTADOS * 2),
    ...(caja ? { viewbox: caja } : {}),
  }

  // Dos intentos, en este orden y solo si el primero viene vacío:
  //  1. con la comuna pegada al final — es lo que hace que "los aromos 123"
  //     resuelva a la calle del vecino y no a una homónima de otra región;
  //  2. el texto tal cual — necesario en zona rural, donde el camino existe en
  //     OSM pero no está asociado a la comuna (ej. "Ruta J-60"), y pegarle el
  //     nombre de la comuna hace que Nominatim no encuentre nada.
  const yaTraeComuna = comuna && normalizarTexto(consulta).includes(normalizarTexto(comuna))
  const consultas = comuna && !yaTraeComuna ? [`${consulta}, ${comuna}, Chile`, consulta] : [consulta]

  let resultados = []
  for (const q of consultas) {
    const crudos = await pedir('/search', { ...parametrosBase, q }, senal)
    resultados = normalizarResultados(crudos, centro)
    if (resultados.length > 0) break
  }

  recordar(cacheBusquedas, clave, resultados)
  return resultados
}

function formatearDireccionInversa(item) {
  const direccion = item?.address
  if (!direccion) return null

  const via = [direccion.road, direccion.house_number].filter(Boolean).join(' ')
  const localidad = CAMPOS_LOCALIDAD.map((campo) => direccion[campo]).find(Boolean)

  // En campo abierto, Nominatim contesta solo "Región del Maule, Chile": eso no
  // es una dirección que le sirva a la cuadrilla, así que se prefiere no mostrar
  // nada antes que mostrar algo inútil que además se copiaría al Paso 2.
  if (!via && !localidad) return null

  return [via, localidad].filter(Boolean).join(', ')
}

// Coordenadas → dirección aproximada, para mostrarle al vecino QUÉ lugar marcó
// (confirma que el pin está donde cree) y para sugerir el campo "¿Dónde
// exactamente?" del Paso 2 ya escrito. Devuelve null si no hay nada útil que
// mostrar: es un extra, nunca un requisito para reportar.
export async function obtenerDireccionAproximada({ coordenadas, senal }) {
  if (typeof coordenadas?.lat !== 'number' || typeof coordenadas?.lng !== 'number') return null

  // 4 decimales ≈ 11 m: arrastrar el pin unos metros reusa la respuesta anterior
  // en vez de gastar otra petición.
  const clave = `${coordenadas.lat.toFixed(4)},${coordenadas.lng.toFixed(4)}`
  if (cacheInversas.has(clave)) return cacheInversas.get(clave)

  const item = await pedir(
    '/reverse',
    { lat: String(coordenadas.lat), lon: String(coordenadas.lng), zoom: '18' },
    senal
  )

  const direccion = item?.error ? null : formatearDireccionInversa(item)
  recordar(cacheInversas, clave, direccion)
  return direccion
}
