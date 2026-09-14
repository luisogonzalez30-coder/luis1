// Registro de verticales. Un solo despliegue, un solo motor, dos productos:
//
//   municipio  → TuMuniAquí    (comunas; Licantén en producción)
//   condominio → TuCondoAquí   (edificios y condominios; Ley 21.442)
//
// Cómo se elige: el documento del tenant (municipalidades/{slug}) trae el
// campo `vertical`. Si no lo trae —que es el caso de todos los tenants que ya
// existen— se asume 'municipio'. Esa es la razón por la que agregar esta capa
// no requiere migrar ni un solo documento de Licantén.
import { VERTICAL_MUNICIPIO } from './municipio'
import {
  AREAS_CONDOMINIO,
  AREA_POR_CATEGORIA_CONDOMINIO,
  AREA_POR_DEFECTO,
  CATEGORIAS_CONDOMINIO,
  GRAVEDAD_POR_CATEGORIA_CONDOMINIO,
} from './condominio'
import { COLOR_POR_GRAVEDAD } from '../utils/gravedad'

const GRAVEDAD_POR_DEFECTO = 'Media'

export const VERTICAL_CONDOMINIO = {
  id: 'condominio',
  producto: 'TuCondoAquí',

  lexico: {
    organizacion: 'condominio',
    organizacionCon: 'la administración',
    organizacionPlural: 'condominios',
    reportante: 'residente',
    reportantePlural: 'residentes',
    reporte: 'solicitud',
    reportePlural: 'solicitudes',
    area: 'área',
    areaPlural: 'áreas',
    equipo: 'equipo',
    equipoPlural: 'equipos',
    zona: 'torre',
    zonaPlural: 'torres',
    maximaAutoridad: 'Comité de Administración',
    ubicacionPregunta: '¿Dónde está el problema?',
    ubicacionAyuda: 'Elige tu unidad o el espacio común donde ocurre.',
  },

  // 'unidad' = torre/piso/departamento o espacio común, no coordenadas. Un
  // condominio entero cabe en 40 metros: un pin de GPS con 15 m de error no
  // distingue el piso 3 del piso 12, así que el mapa acá no sirve de nada.
  ubicacion: { modo: 'unidad' },

  rolesUI: {
    ALCALDE_ADMIN: 'Administrador del condominio',
    JEFE_DEPARTAMENTO: 'Comité de Administración',
    TERRENO: 'Conserjería y mantención',
  },

  // Plazos mucho más cortos que en un municipio, y esa es justamente la
  // promesa comercial: un ascensor detenido o una filtración activa se miden
  // en horas, no en días.
  sla: { Alta: 2, Media: 12, Baja: 48 },

  categorias: CATEGORIAS_CONDOMINIO,
  areas: AREAS_CONDOMINIO,

  calcularGravedad(categoriaValor) {
    const nivel = GRAVEDAD_POR_CATEGORIA_CONDOMINIO[categoriaValor] || GRAVEDAD_POR_DEFECTO
    return { nivel_gravedad: nivel, color_pin: COLOR_POR_GRAVEDAD[nivel] }
  },

  calcularArea(categoriaValor) {
    return AREA_POR_CATEGORIA_CONDOMINIO[categoriaValor] || AREA_POR_DEFECTO
  },
}

export const VERTICALES = {
  municipio: VERTICAL_MUNICIPIO,
  condominio: VERTICAL_CONDOMINIO,
}

export const VERTICAL_POR_DEFECTO = VERTICAL_MUNICIPIO

// Devuelve el paquete de la vertical de un tenant. Tolera `null` (tenant aún
// cargando) y un `vertical` desconocido: en los dos casos cae a municipio, que
// es lo que ya estaba funcionando antes de que esta capa existiera.
export function verticalDe(tenant) {
  return VERTICALES[tenant?.vertical] || VERTICAL_POR_DEFECTO
}

export function esCondominio(tenant) {
  return verticalDe(tenant).id === 'condominio'
}

// Etiqueta legible de una categoría DENTRO de una vertical. La función
// equivalente de utils/categorias.js solo conoce el catálogo municipal, así
// que mostraría el valor crudo ("Ascensor_detenido") en un condominio.
export function etiquetaCategoriaEn(vertical, valor) {
  const cat = vertical.categorias.find((c) => c.valor === valor)
  return cat?.etiqueta || valor
}

// Horas de SLA para una gravedad. Devuelve `null` si la vertical no define
// plazo para ese nivel, para que quien llame decida si eso es "sin plazo" o
// un error, en vez de comparar contra un número inventado.
export function slaHoras(vertical, nivelGravedad) {
  return vertical.sla?.[nivelGravedad] ?? null
}
