import { normalizarTexto } from './busqueda'

// Ubicación dentro de un condominio (vertical CondominioAquí).
//
// En un condominio la ubicación es una coordenada: el problema puede estar en
// cualquier punto de un condominio de 300 km². En un condominio el terreno
// completo cabe en una manzana y la pregunta es otra — "¿qué torre, qué piso,
// qué unidad?" — que un GPS con 15 metros de error no puede responder: no
// distingue el piso 3 del piso 12, ni el estacionamiento 40 del 41.
//
// Por eso esta vertical NO usa el mapa para ubicar. Usa la estructura real del
// condominio, declarada en su documento de tenant:
//
//   condominios/{slug} = {
//     vertical: 'condominio',
//     torres: [
//       { nombre: 'Torre A', pisos: 12, unidades_por_piso: 4 },   // genera A-101 … A-1204
//       { nombre: 'Casas', unidades: ['Casa 1', 'Casa 2'] },      // lista explícita
//     ],
//     espacios_comunes: ['Hall de acceso', 'Piscina', 'Quincho', ...],
//   }
//
// Las dos formas conviven porque los condominios chilenos son las dos cosas:
// torres con numeración regular, y conjuntos de casas donde la numeración no
// sigue ninguna regla y hay que escribirla a mano.

export const TIPO_UNIDAD = 'unidad'
export const TIPO_COMUN = 'espacio_comun'

// Genera las unidades de una torre. Con `unidades` explícito, las devuelve tal
// cual (respeta la numeración rara del conjunto de casas). Con `pisos` +
// `unidades_por_piso`, arma la numeración chilena habitual: piso 1 → 101, 102…
function unidadesDeTorre(torre) {
  if (Array.isArray(torre?.unidades) && torre.unidades.length) {
    return torre.unidades.map(String)
  }

  const pisos = Number(torre?.pisos) || 0
  const porPiso = Number(torre?.unidades_por_piso) || 0
  if (!pisos || !porPiso) return []

  const primerPiso = Number.isFinite(Number(torre?.primer_piso)) ? Number(torre.primer_piso) : 1
  const generadas = []

  for (let piso = primerPiso; piso < primerPiso + pisos; piso++) {
    for (let n = 1; n <= porPiso; n++) {
      generadas.push(`${piso}${String(n).padStart(2, '0')}`)
    }
  }

  return generadas
}

// Aplana la estructura del condominio en una lista plana de ubicaciones
// elegibles: cada unidad de cada torre, más cada espacio común. Es lo que
// consume el selector del residente y el filtro del administrador.
//
// El `id` es estable (no depende del orden) porque se guarda dentro de la
// solicitud: si mañana el administrador agrega una torre, los reportes viejos
// tienen que seguir apuntando a la misma unidad.
export function listarUbicaciones(condominio) {
  const ubicaciones = []

  for (const torre of condominio?.torres || []) {
    if (!torre?.nombre) continue
    for (const unidad of unidadesDeTorre(torre)) {
      ubicaciones.push({
        id: `u:${torre.nombre}:${unidad}`,
        tipo: TIPO_UNIDAD,
        torre: torre.nombre,
        unidad,
        etiqueta: `${torre.nombre} · ${unidad}`,
      })
    }
  }

  for (const espacio of condominio?.espacios_comunes || []) {
    if (!espacio) continue
    ubicaciones.push({
      id: `c:${espacio}`,
      tipo: TIPO_COMUN,
      espacio_comun: espacio,
      etiqueta: espacio,
    })
  }

  return ubicaciones
}

// Lista de torres con sus unidades, para el selector en dos pasos (primero la
// torre, después la unidad). Un condominio de 6 torres × 20 pisos × 4 son 480
// unidades: mostrarlas todas juntas en una lista es inservible en un celular.
export function torresConUnidades(condominio) {
  return (condominio?.torres || [])
    .filter((t) => t?.nombre)
    .map((torre) => ({ nombre: torre.nombre, unidades: unidadesDeTorre(torre) }))
    .filter((t) => t.unidades.length > 0)
}

export function etiquetaUbicacion(ubicacion) {
  if (!ubicacion) return ''
  if (ubicacion.tipo === TIPO_COMUN) return ubicacion.espacio_comun || ''
  if (ubicacion.torre && ubicacion.unidad) return `${ubicacion.torre} · ${ubicacion.unidad}`
  return ubicacion.etiqueta || ''
}

export function ubicacionValida(ubicacion) {
  if (!ubicacion) return false
  if (ubicacion.tipo === TIPO_COMUN) return Boolean(ubicacion.espacio_comun)
  return Boolean(ubicacion.torre && ubicacion.unidad)
}

// Busca por nombre de torre, número de unidad o espacio común. Mismo criterio
// que el buscador de direcciones del condominio: sin tildes y sin distinguir
// mayúsculas, porque nadie escribe "Hall de Acceso" con la tilde puesta.
export function buscarUbicaciones(texto, condominio, limite = 20) {
  const consulta = normalizarTexto(texto || '').trim()
  if (consulta.length < 1) return []

  return listarUbicaciones(condominio)
    .filter((u) => normalizarTexto(u.etiqueta).includes(consulta))
    .slice(0, limite)
}

// Cuántas unidades tiene el condominio. Es el número con el que se cobra la
// suscripción (precio por unidad al mes) y el denominador de todos los
// indicadores del panel del administrador.
export function totalUnidades(condominio) {
  return torresConUnidades(condominio).reduce((suma, t) => suma + t.unidades.length, 0)
}
