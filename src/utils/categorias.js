import { CATEGORIAS_CONDOMINIO } from '../verticales/condominio'

// Catálogo de categorías de incidencias urbanas, agrupadas por área municipal
// (Tránsito, Aseo y Ornato, Medio Ambiente, etc. — la división habitual entre
// direcciones dentro de una municipalidad chilena). Centralizado para que el
// Formulario Ciudadano y el Dashboard usen siempre la misma lista.
export const CATEGORIAS = [
  // Vialidad y Tránsito
  { valor: 'Bache', etiqueta: 'Bache en la vía', grupo: 'Vialidad y Tránsito' },
  { valor: 'Semaforo', etiqueta: 'Semáforo con falla', grupo: 'Vialidad y Tránsito' },
  { valor: 'Semaforo_peatonal', etiqueta: 'Semáforo peatonal con falla', grupo: 'Vialidad y Tránsito' },
  { valor: 'Senaletica_vial', etiqueta: 'Señalética vial dañada o faltante', grupo: 'Vialidad y Tránsito' },
  { valor: 'Pavimento_deteriorado', etiqueta: 'Pavimento deteriorado o agrietado', grupo: 'Vialidad y Tránsito' },
  { valor: 'Socavon', etiqueta: 'Socavón / hundimiento de calzada', grupo: 'Vialidad y Tránsito' },
  { valor: 'Vereda_danada', etiqueta: 'Vereda en mal estado', grupo: 'Vialidad y Tránsito' },
  { valor: 'Rampa_accesibilidad', etiqueta: 'Rampa de accesibilidad dañada o faltante', grupo: 'Vialidad y Tránsito' },
  { valor: 'Ciclovia_danada', etiqueta: 'Ciclovía dañada u obstruida', grupo: 'Vialidad y Tránsito' },
  { valor: 'Estacionamiento_irregular', etiqueta: 'Estacionamiento irregular', grupo: 'Vialidad y Tránsito' },
  { valor: 'Anegamiento', etiqueta: 'Anegamiento / calle inundada', grupo: 'Vialidad y Tránsito' },
  { valor: 'Baranda_danada', etiqueta: 'Baranda o barrera de contención dañada', grupo: 'Vialidad y Tránsito' },

  // Alumbrado Público
  { valor: 'Luminaria', etiqueta: 'Luminaria pública apagada', grupo: 'Alumbrado Público' },
  { valor: 'Luminaria_parpadea', etiqueta: 'Luminaria parpadeando', grupo: 'Alumbrado Público' },
  { valor: 'Poste_danado', etiqueta: 'Poste de luz dañado o caído', grupo: 'Alumbrado Público' },
  { valor: 'Cableado_expuesto', etiqueta: 'Cableado eléctrico expuesto', grupo: 'Alumbrado Público' },

  // Aseo y Ornato
  { valor: 'Basural', etiqueta: 'Basural / microbasural', grupo: 'Aseo y Ornato' },
  { valor: 'Escombros', etiqueta: 'Acumulación de escombros', grupo: 'Aseo y Ornato' },
  { valor: 'Contenedor_danado', etiqueta: 'Contenedor de basura dañado o desbordado', grupo: 'Aseo y Ornato' },
  { valor: 'Falta_recoleccion', etiqueta: 'Falta de recolección de basura', grupo: 'Aseo y Ornato' },
  { valor: 'Punto_limpio', etiqueta: 'Punto limpio saturado o dañado', grupo: 'Aseo y Ornato' },
  { valor: 'Grafiti', etiqueta: 'Grafiti / rayado en espacio público', grupo: 'Aseo y Ornato' },
  { valor: 'Mal_olor', etiqueta: 'Mal olor persistente', grupo: 'Aseo y Ornato' },
  { valor: 'Falta_basureros', etiqueta: 'Falta de basureros públicos', grupo: 'Aseo y Ornato' },

  // Áreas Verdes y Medio Ambiente
  { valor: 'Arbol_caido', etiqueta: 'Árbol caído o en riesgo', grupo: 'Áreas Verdes y Medio Ambiente' },
  { valor: 'Poda_necesaria', etiqueta: 'Poda de árboles necesaria', grupo: 'Áreas Verdes y Medio Ambiente' },
  { valor: 'Plaza_mal_estado', etiqueta: 'Plaza o parque en mal estado', grupo: 'Áreas Verdes y Medio Ambiente' },
  { valor: 'Juegos_infantiles', etiqueta: 'Juegos infantiles dañados', grupo: 'Áreas Verdes y Medio Ambiente' },
  { valor: 'Riego_deficiente', etiqueta: 'Riego de áreas verdes deficiente', grupo: 'Áreas Verdes y Medio Ambiente' },
  { valor: 'Ruido_ambiental', etiqueta: 'Contaminación acústica / ruidos molestos', grupo: 'Áreas Verdes y Medio Ambiente' },
  { valor: 'Quema_ilegal', etiqueta: 'Quema ilegal de basura o pastizales', grupo: 'Áreas Verdes y Medio Ambiente' },
  { valor: 'Pasto_alto', etiqueta: 'Pasto sin cortar en áreas verdes', grupo: 'Áreas Verdes y Medio Ambiente' },

  // Agua y Servicios Básicos
  { valor: 'Filtracion_agua', etiqueta: 'Filtración de agua potable', grupo: 'Agua y Servicios Básicos' },
  { valor: 'Alcantarillado', etiqueta: 'Alcantarillado tapado o rebalsado', grupo: 'Agua y Servicios Básicos' },
  { valor: 'Fuga_gas', etiqueta: 'Fuga de gas', grupo: 'Agua y Servicios Básicos' },
  { valor: 'Corte_agua', etiqueta: 'Corte de agua no informado', grupo: 'Agua y Servicios Básicos' },
  { valor: 'Grifo_danado', etiqueta: 'Grifo o llave pública dañada', grupo: 'Agua y Servicios Básicos' },

  // Infraestructura y Edificación
  { valor: 'Sitio_eriazo', etiqueta: 'Sitio eriazo o propiedad abandonada en mal estado', grupo: 'Infraestructura y Edificación' },
  { valor: 'Construccion_irregular', etiqueta: 'Construcción irregular o sin permiso', grupo: 'Infraestructura y Edificación' },
  { valor: 'Muro_riesgo', etiqueta: 'Muro o cierre perimetral en riesgo de derrumbe', grupo: 'Infraestructura y Edificación' },
  { valor: 'Estructura_danada', etiqueta: 'Techumbre o estructura dañada en espacio público', grupo: 'Infraestructura y Edificación' },
  { valor: 'Patente_irregular', etiqueta: 'Local comercial funcionando sin patente', grupo: 'Infraestructura y Edificación' },

  // Seguridad y Convivencia — las relacionadas a delitos llevan avisoSeguridad: true,
  // que dispara un mensaje aclaratorio en el formulario (esto no es una denuncia
  // policial, sigue el mismo criterio que la plataforma oficial "Denuncia Segura").
  { valor: 'Falta_vigilancia', etiqueta: 'Falta de vigilancia / cámara dañada', grupo: 'Seguridad y Convivencia' },
  { valor: 'Animal_abandonado', etiqueta: 'Perro o animal abandonado / en riesgo', grupo: 'Seguridad y Convivencia' },
  { valor: 'Plaga', etiqueta: 'Plaga de roedores o insectos', grupo: 'Seguridad y Convivencia' },
  { valor: 'Foco_delincuencia', etiqueta: 'Foco de delincuencia reportado', grupo: 'Seguridad y Convivencia', avisoSeguridad: true },
  { valor: 'Robo_hurto_frecuente', etiqueta: 'Robos o hurtos frecuentes en el sector', grupo: 'Seguridad y Convivencia', avisoSeguridad: true },
  { valor: 'Consumo_via_publica', etiqueta: 'Consumo de alcohol/drogas en vía pública', grupo: 'Seguridad y Convivencia' },
  { valor: 'Comercio_ambulante', etiqueta: 'Comercio ambulante irregular', grupo: 'Seguridad y Convivencia' },
  { valor: 'Vehiculo_abandonado', etiqueta: 'Vehículo abandonado en la vía pública', grupo: 'Seguridad y Convivencia' },
  { valor: 'Excremento_mascotas', etiqueta: 'Excremento de mascotas no recogido', grupo: 'Seguridad y Convivencia' },

  // Espacios Públicos y Mobiliario Urbano
  { valor: 'Mobiliario_danado', etiqueta: 'Banca o mobiliario urbano dañado', grupo: 'Espacios Públicos' },
  { valor: 'Paradero_danado', etiqueta: 'Paradero de locomoción dañado', grupo: 'Espacios Públicos' },
  { valor: 'Bano_publico', etiqueta: 'Baño público en mal estado', grupo: 'Espacios Públicos' },
  { valor: 'Feria_desorden', etiqueta: 'Desorden en feria libre / vía pública', grupo: 'Espacios Públicos' },

  // Otros
  { valor: 'Ruido_local_comercial', etiqueta: 'Ruido molesto de local comercial', grupo: 'Otros' },
  { valor: 'Publicidad_ilegal', etiqueta: 'Publicidad ilegal (pasacalles, carteles)', grupo: 'Otros' },
  { valor: 'Otro', etiqueta: 'Otro', grupo: 'Otros' },
]

// Mapa valor -> objeto completo {valor, etiqueta, grupo}. Antes cada archivo que
// necesitaba mostrar la categoría legible (en vez del valor interno crudo, tipo
// "Luminaria_parpadea") se armaba su propio Object.fromEntries — se repitió en 6
// lugares y en otros 9 se olvidó directamente, mostrando el valor crudo al
// funcionario en los paneles principales de los 3 dashboards (hallazgo del
// 12-ago-2026, QA previo a la reunión con el Alcalde). Centralizado acá.
export const CATEGORIA_POR_VALOR = Object.fromEntries(CATEGORIAS.map((c) => [c.valor, c]))

// Diccionario SOLO para mostrar: junta las etiquetas de todas las verticales.
// Es distinto de CATEGORIAS, que es el catálogo elegible y sigue siendo el
// municipal — un vecino nunca debe poder elegir "Ascensor detenido". Pero un
// panel que renderiza una incidencia ya creada tiene que poder ponerle nombre
// venga de donde venga, y sin esto mostraría el valor crudo
// ("Ascensor_detenido"), que es exactamente el bug que se arregló el 12-ago.
const ETIQUETA_POR_VALOR = {
  ...Object.fromEntries(CATEGORIAS.map((c) => [c.valor, c.etiqueta])),
  ...Object.fromEntries(CATEGORIAS_CONDOMINIO.map((c) => [c.valor, c.etiqueta])),
}

export function etiquetaCategoria(valor) {
  return ETIQUETA_POR_VALOR[valor] || valor
}

// Agrupa el catálogo plano por "grupo" (Vialidad, Alumbrado, etc.) preservando el
// orden en que aparecen — lo usan tanto el formulario ciudadano como los filtros
// del Dashboard para renderizar <optgroup> en un <select>.
export function agruparCategorias(categorias = CATEGORIAS) {
  const grupos = []
  const indicePorGrupo = new Map()

  for (const cat of categorias) {
    if (!indicePorGrupo.has(cat.grupo)) {
      indicePorGrupo.set(cat.grupo, grupos.length)
      grupos.push({ nombre: cat.grupo, items: [] })
    }
    grupos[indicePorGrupo.get(cat.grupo)].items.push(cat)
  }

  return grupos
}
