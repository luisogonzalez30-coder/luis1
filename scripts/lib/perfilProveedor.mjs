// Perfil comercial con el que se filtran y puntúan las oportunidades de
// Mercado Público. Es el único archivo que hay que editar para cambiar el
// enfoque de la caza: la lógica de scoring no se toca.

/**
 * Palabras clave del rubro. Se buscan en el nombre y la descripción de cada
 * licitación / orden de compra, sin tildes y en minúscula.
 *
 * `peso` alto = match que casi seguro es negocio nuestro.
 * `peso` bajo = match tangencial, sirve para no perder de vista al comprador
 * pero no para salir corriendo a cotizar.
 */
export const PALABRAS_CLAVE = [
  // Núcleo: exactamente lo que hace el producto
  { termino: 'reporte de incidencias', peso: 10 },
  { termino: 'incidencias urbanas', peso: 10 },
  { termino: 'atencion ciudadana', peso: 9 },
  { termino: 'atencion de publico', peso: 6 },
  { termino: 'oirs', peso: 9 },
  { termino: 'reclamos y sugerencias', peso: 9 },
  { termino: 'solicitudes ciudadanas', peso: 9 },
  { termino: 'mesa de ayuda', peso: 7 },
  { termino: 'gestion de tickets', peso: 8 },
  { termino: 'ordenes de trabajo', peso: 7 },
  { termino: 'cuadrillas', peso: 7 },
  { termino: 'servicios municipales', peso: 6 },
  { termino: 'aseo y ornato', peso: 6 },
  { termino: 'alumbrado publico', peso: 5 },

  // Adyacente: mismo comprador, mismo presupuesto, se puede entrar por ahí
  { termino: 'gobierno digital', peso: 7 },
  { termino: 'transformacion digital', peso: 7 },
  { termino: 'plataforma web', peso: 6 },
  { termino: 'aplicacion movil', peso: 6 },
  { termino: 'sistema informatico', peso: 6 },
  { termino: 'desarrollo de software', peso: 8 },
  { termino: 'mantencion de software', peso: 7 },
  { termino: 'soporte informatico', peso: 5 },
  { termino: 'georreferenciacion', peso: 6 },
  { termino: 'sistema de informacion geografica', peso: 6 },
  { termino: 'sig municipal', peso: 7 },
  { termino: 'smart city', peso: 6 },
  { termino: 'ciudad inteligente', peso: 6 },
  { termino: 'digitalizacion', peso: 5 },
  { termino: 'licenciamiento de software', peso: 5 },
  { termino: 'saas', peso: 5 },
  { termino: 'cloud', peso: 3 },
]

/**
 * Términos que descartan la oportunidad aunque haya pegado alguna palabra
 * clave. Sin esto, "adquisición de equipos computacionales" y "cableado
 * estructurado" copan el listado y esconden lo que sí es vendible.
 */
export const EXCLUSIONES = [
  'computadores',
  'notebooks',
  'impresoras',
  'toner',
  'cartuchos',
  'cableado estructurado',
  'fibra optica',
  'servidores fisicos',
  'ups ',
  'aire acondicionado',
  'camaras de televigilancia',
  'camaras de seguridad',
  'drones',
  'mobiliario',
  'vehiculos',
  'combustible',
  'utiles de aseo',
  'construccion de',
  'reposicion de',
  'mejoramiento de aceras',
  'pavimentacion',
]

/**
 * Códigos UNSPSC del rubro, para cuando se pide la ficha completa de una
 * licitación (los items traen CodigoCategoria). Complementan a las palabras
 * clave: a veces el nombre es genérico pero el item está bien clasificado.
 */
export const UNSPSC = {
  81111500: 'Ingeniería de software o hardware',
  81111800: 'Sistemas de gestión de información',
  43230000: 'Software',
  43232300: 'Software de gestión de datos',
  81112200: 'Servicios de datos / hosting',
  81112000: 'Servicios de tecnología de la información',
  80101500: 'Consultoría de gestión de negocios',
}

/**
 * Compradores prioritarios. El producto se vende a municipios, así que un
 * comprador municipal vale más que un ministerio aunque el texto matchee
 * igual de bien.
 */
export const COMPRADORES_PRIORITARIOS = [
  'municipalidad',
  'municipal',
  'corporacion municipal',
  'gobierno regional',
  'delegacion presidencial',
  'subdere',
  'serviu',
]

/**
 * Regiones de interés. Vacío = todo Chile. Se compara contra el campo de
 * región del comprador, sin tildes y en minúscula.
 */
export const REGIONES = []

/** Umbral de puntaje bajo el cual una oportunidad ni se muestra. */
export const PUNTAJE_MINIMO = 5
