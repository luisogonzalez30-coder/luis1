// Color por grupo de categorías, para que el vecino ubique su problema por
// color y no tenga que leer las 58 opciones (ver §29 en ESTADO_PROYECTO.md).
//
// Paleta categórica de la skill `dataviz`, en su ORDEN FIJO — el orden es el
// mecanismo de seguridad para daltonismo, no algo cosmético: cada par de
// grupos vecinos en la lista está validado para ser distinguible. No reordenar
// ni inventar un color nuevo sin volver a correr el validador.
//
// Validado con `scripts/validate_palette.js --mode light --surface #ffffff`:
// todos los chequeos PASS (peor par adyacente ΔE 9.1 protan, 19.6 visión
// normal). El WARN de contraste está cubierto porque el nombre del grupo
// SIEMPRE se muestra escrito al lado del color — el color nunca carga solo con
// la identidad, que es justo la condición que pide la skill.
//
// "Otros" no lleva color de la paleta a propósito: son 8 slots categóricos y un
// noveno grupo, y la regla es que el noveno cae en "Other" con un neutro.
const COLOR_POR_GRUPO = {
  'Vialidad y Tránsito': '#2a78d6',
  'Alumbrado Público': '#eb6834',
  'Aseo y Ornato': '#1baf7a',
  'Áreas Verdes y Medio Ambiente': '#eda100',
  'Agua y Servicios Básicos': '#e87ba4',
  'Infraestructura y Edificación': '#008300',
  'Seguridad y Convivencia': '#4a3aa7',
  'Espacios Públicos': '#e34948',
  Otros: '#898781',
}

const COLOR_NEUTRO = '#898781'

export function colorDeGrupo(nombreGrupo) {
  return COLOR_POR_GRUPO[nombreGrupo] || COLOR_NEUTRO
}
