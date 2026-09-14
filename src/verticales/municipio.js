// Vertical "municipio" — TuMuniAquí, el producto original y el que está en
// producción con Licantén.
//
// Este archivo NO mueve los datos municipales de lugar: el catálogo de
// categorías, el triage y la derivación siguen viviendo en src/utils/
// (categorias.js, gravedad.js, departamento.js), donde los importan más de
// cuarenta archivos. Moverlos habría tocado todo el frontend que hoy está
// atendiendo a un municipio real, a cambio de nada funcional. Acá solo se
// ARMA el paquete con esos datos, para que el resto del sistema pueda pedir
// "el paquete de la vertical X" sin saber de dónde salió cada pieza.
import { CATEGORIAS } from '../utils/categorias'
import { calcularGravedad } from '../utils/gravedad'
import { DEPARTAMENTOS, calcularDepartamento } from '../utils/departamento'

export const VERTICAL_MUNICIPIO = {
  id: 'municipio',
  producto: 'TuMuniAquí',

  // El léxico es lo que cambia en cada pantalla sin cambiar una línea de
  // lógica. Está acá y no en los componentes porque la alternativa era un
  // `if (esCondominio)` repartido en 30 archivos.
  lexico: {
    organizacion: 'municipalidad',
    organizacionCon: 'la municipalidad',
    organizacionPlural: 'municipalidades',
    reportante: 'vecino',
    reportantePlural: 'vecinos',
    reporte: 'reporte',
    reportePlural: 'reportes',
    area: 'departamento',
    areaPlural: 'departamentos',
    equipo: 'cuadrilla',
    equipoPlural: 'cuadrillas',
    zona: 'sector',
    zonaPlural: 'sectores',
    maximaAutoridad: 'Alcalde',
    ubicacionPregunta: '¿Dónde está el problema?',
    ubicacionAyuda: 'Marca el punto en el mapa o busca la dirección.',
  },

  // Cómo se ubica un reporte. 'mapa' = GPS + Leaflet + geocodificación, que es
  // lo correcto para la vía pública de una comuna entera.
  ubicacion: { modo: 'mapa' },

  // Nombre visible de cada rol interno. Los valores internos (ALCALDE_ADMIN,
  // JEFE_DEPARTAMENTO, TERRENO) NO cambian entre verticales: están escritos en
  // firestore.rules, en los documentos de usuarios_municipales y en el RBAC.
  // Renombrarlos exigiría migrar la base y volver a desplegar reglas; ponerles
  // otra etiqueta arriba no cuesta nada y logra lo mismo.
  rolesUI: {
    ALCALDE_ADMIN: 'Alcalde / Administración municipal',
    JEFE_DEPARTAMENTO: 'Jefe de departamento',
    TERRENO: 'Cuadrilla en terreno',
  },

  // Horas desde la creación antes de considerar el reporte atrasado. Replica
  // el umbral que ya usan PanelIndicadores y MetricasPorDepartamento.
  sla: { Alta: 4, Media: 24, Baja: 72 },

  categorias: CATEGORIAS,
  areas: DEPARTAMENTOS,
  calcularGravedad,
  calcularArea: calcularDepartamento,
}
