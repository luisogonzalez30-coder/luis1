import { GRAVEDAD_POR_CATEGORIA } from './categorias'

// Triage automático: clasifica la gravedad de una solicitud según su categoría,
// en el momento en que el residente la envía. Criterio:
//   Alta  -> riesgo para alguien o infracción legal en curso (gas, incendio,
//            ascensor detenido, filtración activa, certificación vencida)
//   Media -> afecta el uso pero sin peligro inmediato
//   Baja  -> estético, o molestia sin riesgo
//
// Paleta de "status" validada (crítico / advertencia / bueno) — fija, no se
// tematiza por condominio. El amarillo tiene bajo contraste contra superficies
// claras por diseño: nunca debe ser el único portador del significado, siempre
// acompañado de ícono o etiqueta (BadgeGravedad siempre escribe "Gravedad X").
export const COLOR_POR_GRAVEDAD = {
  Alta: '#d03b3b', // critical
  Media: '#fab219', // warning
  Baja: '#0ca30c', // good
}

// Orden de prioridad para ordenar listas (menor número = más urgente).
export const ORDEN_GRAVEDAD = { Alta: 0, Media: 1, Baja: 2 }

// Horas desde la creación antes de considerar la solicitud atrasada.
//
// Deliberadamente cortos, y esa es la
// promesa comercial: un ascensor detenido o una filtración activa se miden en
// horas. El residente está adentro del problema, no pasando por al lado.
export const SLA_HORAS = { Alta: 2, Media: 12, Baja: 48 }

const GRAVEDAD_POR_DEFECTO = 'Media'

// Si la categoría no está en el mapa (se agregó una nueva y se olvidó
// clasificarla) cae a "Media" y no a "Baja": asumir que algo no urgente es
// mejor que asumir que no importa.
export function calcularGravedad(categoriaValor) {
  const nivel = GRAVEDAD_POR_CATEGORIA[categoriaValor] || GRAVEDAD_POR_DEFECTO
  return { nivel_gravedad: nivel, color_pin: COLOR_POR_GRAVEDAD[nivel] }
}
