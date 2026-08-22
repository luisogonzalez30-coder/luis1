// Filtro y puntuación de oportunidades de Mercado Público según el perfil de
// scripts/lib/perfilProveedor.mjs.
//
// Criterio de diseño: la API devuelve miles de licitaciones activas con un
// listado liviano (solo código, nombre, estado y cierre). Pedir la ficha
// completa de todas quemaría la cuota diaria en una corrida. Entonces se
// filtra por texto sobre el listado liviano y recién ahí se pide el detalle de
// las que pasaron el filtro.

import {
  PALABRAS_CLAVE,
  EXCLUSIONES,
  UNSPSC,
  COMPRADORES_PRIORITARIOS,
  REGIONES,
} from './perfilProveedor.mjs'
import { TIPOS } from './mercadoPublico.mjs'

/** Minúsculas, sin tildes, espacios colapsados. */
export const normalizar = (texto = '') =>
  String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Lee un campo que la API expone con nombres distintos según el endpoint
 * (el listado liviano y la ficha completa no siempre coinciden).
 */
const campo = (obj, ...nombres) => {
  for (const n of nombres) {
    const partes = n.split('.')
    let v = obj
    for (const p of partes) v = v?.[p]
    if (v !== undefined && v !== null && v !== '') return v
  }
  return null
}

/**
 * ¿El texto pega con el rubro? Devuelve el puntaje de fit y qué términos
 * pegaron, o null si está excluido.
 */
export const evaluarTexto = texto => {
  const t = normalizar(texto)
  if (!t) return { puntaje: 0, terminos: [] }

  for (const mala of EXCLUSIONES) {
    if (t.includes(normalizar(mala))) return null
  }

  const terminos = []
  let mayorPeso = 0
  for (const { termino, peso } of PALABRAS_CLAVE) {
    if (t.includes(normalizar(termino))) {
      terminos.push(termino)
      mayorPeso = Math.max(mayorPeso, peso)
    }
  }
  // El término más fuerte manda; los demás suman poco para no premiar avisos
  // largos que nombran medio mundo.
  const puntaje = mayorPeso === 0 ? 0 : mayorPeso + Math.min(terminos.length - 1, 3)
  return { puntaje, terminos }
}

const diasHasta = fechaIso => {
  if (!fechaIso) return null
  const f = new Date(fechaIso)
  if (Number.isNaN(f.getTime())) return null
  return Math.ceil((f - Date.now()) / 86_400_000)
}

/**
 * Puntúa una licitación con los cuatro criterios de la metodología: fit de
 * rubro, nivel de competencia, urgencia y recurrencia del comprador.
 *
 * `recurrencia` es un mapa "organismo normalizado → cuántas compras del rubro
 * se le vieron en el histórico". Se arma con el comando `historico`; si no se
 * pasa, ese criterio queda en cero y se avisa en la salida.
 */
export const puntuarLicitacion = (lic, { recurrencia = new Map() } = {}) => {
  const nombre = campo(lic, 'Nombre') ?? ''
  const descripcion = campo(lic, 'Descripcion') ?? ''
  const fit = evaluarTexto(`${nombre} ${descripcion}`)
  if (!fit || fit.puntaje === 0) return null

  const comprador =
    campo(lic, 'Comprador.NombreOrganismo', 'Comprador.NombreUnidad', 'Organismo') ?? ''
  const region = campo(lic, 'Comprador.RegionUnidad', 'Comprador.Region') ?? ''
  const tipo = campo(lic, 'Tipo') ?? ''
  const cierre = campo(lic, 'FechaCierre', 'Fechas.FechaCierre')
  const dias = diasHasta(cierre)

  const razones = []
  let puntaje = fit.puntaje
  razones.push(`rubro: ${fit.terminos.slice(0, 3).join(', ')}`)

  // Competencia: los tramos chicos son donde un proveedor pequeño gana.
  const info = TIPOS[tipo]
  if (info?.chica) {
    puntaje += 4
    razones.push(`monto chico (${tipo}, ${info.tramo})`)
  } else if (info) {
    puntaje -= 2
    razones.push(`tramo grande (${tipo}, ${info.tramo})`)
  }

  // Urgencia: plazo corto = menos competidores alcanzan a armar oferta.
  if (dias !== null) {
    if (dias >= 0 && dias <= 3) {
      puntaje += 3
      razones.push(`cierra en ${dias} día(s)`)
    } else if (dias <= 7) {
      puntaje += 2
      razones.push(`cierra en ${dias} días`)
    } else if (dias > 20) {
      puntaje -= 1
      razones.push(`plazo largo (${dias} días)`)
    }
  }

  // Comprador del segmento objetivo.
  const c = normalizar(comprador)
  if (COMPRADORES_PRIORITARIOS.some(p => c.includes(normalizar(p)))) {
    puntaje += 4
    razones.push('comprador municipal / regional')
  }

  // Recurrencia observada en el histórico de órdenes de compra.
  const vistas = recurrencia.get(c) ?? 0
  if (vistas >= 3) {
    puntaje += 4
    razones.push(`compra el rubro seguido (${vistas} OC en el histórico)`)
  } else if (vistas > 0) {
    puntaje += 2
    razones.push(`ya compró el rubro (${vistas} OC)`)
  }

  // Región, si el perfil la restringe.
  if (REGIONES.length) {
    const r = normalizar(region)
    if (!REGIONES.some(x => r.includes(normalizar(x)))) return null
  }

  return {
    codigo: campo(lic, 'CodigoExterno', 'Codigo'),
    nombre,
    comprador,
    region,
    tipo,
    tramo: info?.tramo ?? '(tipo no reconocido)',
    estado: campo(lic, 'Estado'),
    monto: campo(lic, 'MontoEstimado'),
    moneda: campo(lic, 'Moneda', 'TipoMoneda'),
    cierre,
    dias,
    puntaje,
    razones,
    mecanismo: 'Licitación',
    link: `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=${
      campo(lic, 'CodigoExterno', 'Codigo') ?? ''
    }`,
  }
}

/** Etiqueta Alto/Medio/Bajo a partir del puntaje numérico. */
export const nivel = puntaje => (puntaje >= 16 ? 'Alto' : puntaje >= 10 ? 'Medio' : 'Bajo')

/** Acción concreta según qué hizo subir el puntaje. */
export const accionRecomendada = op => {
  if (op.mecanismo === 'Trato Directo' || op.mecanismo === 'Compra Ágil') {
    return `Contactar a la unidad de compras de ${op.comprador || 'el organismo'} antes de la próxima compra`
  }
  if (op.dias !== null && op.dias >= 0 && op.dias <= 3) return 'Cotizar hoy: cierra en días'
  if (op.dias !== null && op.dias < 0) return 'Cerrada: usar como referencia de precio y comprador'
  if (TIPOS[op.tipo]?.chica) return 'Preparar oferta: tramo chico, competencia baja'
  return 'Revisar bases antes de decidir si vale el esfuerzo'
}

/** Extrae los UNSPSC del rubro presentes en los items de una ficha completa. */
export const unspscDelRubro = ficha => {
  const items = campo(ficha, 'Items.Listado') ?? []
  const encontrados = new Set()
  for (const it of items) {
    const cat = String(campo(it, 'CodigoCategoria', 'Categoria') ?? '')
    for (const codigo of Object.keys(UNSPSC)) {
      // UNSPSC es jerárquico: 81111500 cubre a 81111501, 81111502, etc.
      if (cat.startsWith(String(codigo).replace(/0+$/, ''))) encontrados.add(codigo)
    }
  }
  return [...encontrados]
}

export { campo }
