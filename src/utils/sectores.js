import { distanciaMetros } from './distancia'
import { normalizarTexto } from './busqueda'

// Los alcaldes piensan el municipio por territorio —villas, poblaciones,
// sectores rurales— y la pregunta política que se hacen es "¿qué sector estoy
// desatendiendo?", porque desatender un sector se paga en votos. El mapa de
// pines sueltos no responde eso; esta agrupación sí.
//
// Los sectores se definen por municipalidad en municipalidades/{id}.sectores:
//   [{ nombre: 'Villa Los Aromos', lat: -34.99, lng: -72.00, radio_metros: 800 }]
//
// Se eligió centro + radio en vez de polígonos dibujados a mano porque un
// municipio chico puede cargarlo en minutos con Google Maps (clic derecho →
// copiar coordenadas), sin necesitar un editor de mapas ni archivos GeoJSON.
// La contrapartida es que los sectores son circulares y pueden solaparse: si
// dos alcanzan un mismo punto, gana el más cercano al centro.

export const SECTOR_SIN_ASIGNAR = 'Fuera de los sectores definidos'

// Devuelve el nombre del sector al que pertenece una coordenada, o null si no
// cae en ninguno.
export function sectorDeCoordenada(coordenadas, sectores) {
  if (!coordenadas?.lat || !sectores?.length) return null

  let mejor = null
  let mejorDistancia = Infinity

  for (const sector of sectores) {
    if (typeof sector.lat !== 'number' || typeof sector.lng !== 'number') continue
    const distancia = distanciaMetros(coordenadas, { lat: sector.lat, lng: sector.lng })
    if (distancia <= (sector.radio_metros || 0) && distancia < mejorDistancia) {
      mejor = sector.nombre
      mejorDistancia = distancia
    }
  }

  return mejor
}

// Busca sectores por nombre, para el buscador de direcciones del Paso 1
// (components/ciudadano/BuscadorDireccion.jsx).
//
// Existe porque en comuna rural OpenStreetMap no conoce las calles, pero el
// municipio sí cargó sus localidades (ver §33): escribir "Iloca" o "La Pesca"
// tiene que resolver a algo aunque Nominatim no devuelva nada — y resuelve al
// instante, sin red, porque los sectores vienen con el documento del municipio
// que ya está en memoria. El punto que devuelve es el centro del sector, no una
// dirección exacta: por eso van marcados como `aproximada` y la UI le pide al
// vecino mover el pin.
export function buscarSectoresPorNombre(texto, sectores) {
  const consulta = normalizarTexto(texto)
  if (consulta.length < 2 || !sectores?.length) return []

  return sectores
    .filter((s) => typeof s.lat === 'number' && typeof s.lng === 'number')
    .filter((s) => normalizarTexto(s.nombre).includes(consulta))
    .map((s) => ({
      id: `sector-${s.nombre}`,
      etiqueta: s.nombre,
      detalle: 'Sector de la comuna',
      coordenadas: { lat: s.lat, lng: s.lng },
      aproximada: true,
      distancia: null,
      origen: 'sector',
    }))
}

// Agrupa incidencias por sector y calcula lo que le importa al Alcalde de cada
// territorio. Ordena de peor a mejor atendido: primero lo que tiene más
// pendientes, que es donde hay que mirar.
export function agruparPorSector(incidencias, sectores) {
  if (!sectores?.length) return []

  const porNombre = new Map(sectores.map((s) => [s.nombre, { ...s, incidencias: [] }]))
  const sinAsignar = []

  for (const incidencia of incidencias) {
    const nombre = sectorDeCoordenada(incidencia.coordenadas, sectores)
    if (nombre && porNombre.has(nombre)) porNombre.get(nombre).incidencias.push(incidencia)
    else sinAsignar.push(incidencia)
  }

  const resumir = (nombre, lista, sector = null) => {
    const resueltas = lista.filter((i) => i.estado === 'Resuelto').length
    const sinResolver = lista.length - resueltas
    return {
      nombre,
      sector,
      total: lista.length,
      resueltas,
      sinResolver,
      emergencias: lista.filter((i) => i.estado !== 'Resuelto' && i.nivel_gravedad === 'Alta').length,
      // Porcentaje de resolución: el indicador de "qué tan bien atendido está
      // este sector". Sin reportes no se muestra porcentaje (no es 0%, es "no aplica").
      porcentajeResuelto: lista.length ? Math.round((resueltas / lista.length) * 100) : null,
    }
  }

  const grupos = [...porNombre.values()].map((s) => resumir(s.nombre, s.incidencias, s))

  if (sinAsignar.length > 0) {
    grupos.push(resumir(SECTOR_SIN_ASIGNAR, sinAsignar))
  }

  return grupos.sort((a, b) => b.sinResolver - a.sinResolver || b.total - a.total)
}
