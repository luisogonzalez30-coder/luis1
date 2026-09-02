import {
  TrafficCone,
  Lightbulb,
  Trash2,
  Trees,
  Droplets,
  Building2,
  ShieldAlert,
  LandPlot,
  CircleEllipsis,
} from 'lucide-react'

// Ícono por grupo de categorías, para la cuadrícula del selector.
//
// Va junto al color (utils/coloresGrupo.js) y no en su lugar: el color solo
// funciona para quien lo distingue y con buena luz, y esto se usa en la calle.
// Con ícono + color + nombre escrito, el grupo se reconoce por tres vías
// independientes — que es la misma regla que ya seguía el resto de la app
// (ningún color carga solo con el significado).
//
// Se eligieron íconos de objeto concreto, no abstracciones: un cono de tránsito
// se reconoce sin leer, una "flecha de flujo" no. Para "Otros" sí va un símbolo
// abstracto, porque el grupo lo es.
const ICONO_POR_GRUPO = {
  'Vialidad y Tránsito': TrafficCone,
  'Alumbrado Público': Lightbulb,
  'Aseo y Ornato': Trash2,
  'Áreas Verdes y Medio Ambiente': Trees,
  'Agua y Servicios Básicos': Droplets,
  'Infraestructura y Edificación': Building2,
  'Seguridad y Convivencia': ShieldAlert,
  'Espacios Públicos': LandPlot,
  Otros: CircleEllipsis,
}

export function iconoDeGrupo(nombreGrupo) {
  return ICONO_POR_GRUPO[nombreGrupo] || CircleEllipsis
}
