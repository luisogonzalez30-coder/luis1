// Color por grupo de categorías, para que el residente ubique su problema por
// color y no tenga que leer las 84 opciones de corrido.
//
// Paleta categórica validada, en su ORDEN FIJO — el orden es el mecanismo de
// seguridad para daltonismo, no algo cosmético: cada par de grupos vecinos en la
// lista está validado para ser distinguible. No reordenar ni inventar un color
// nuevo sin volver a validar la paleta.
//
// Por eso los colores NO siguen afinidad semántica: que "Agua" haya quedado azul
// es coincidencia de haber sido el primer grupo, y no es un criterio que se
// pueda seguir en el siguiente. Si se agrega un grupo, va al final y toma el
// color que corresponde por posición.
//
// Son 8 slots categóricos. El noveno grupo cae en el neutro a propósito, que es
// la regla de la paleta — y "Administración y Cuentas" es el candidato correcto
// para ese lugar: es el cajón administrativo, no una familia de problemas
// físicos como las otras ocho.
//
// El contraste del amarillo y del rosado contra blanco es bajo por diseño, y
// está cubierto porque el nombre del grupo SIEMPRE se muestra escrito al lado
// del color: el color nunca carga solo con la identidad.
const COLOR_POR_GRUPO = {
  'Agua y Filtraciones': '#2a78d6',
  'Electricidad e Iluminación': '#eb6834',
  'Ascensores y Accesos': '#1baf7a',
  'Gas e Incendios': '#eda100',
  'Aseo y Áreas Verdes': '#e87ba4',
  'Convivencia y Estacionamientos': '#008300',
  'Estructura y Espacios Comunes': '#4a3aa7',
  Seguridad: '#e34948',
  'Administración y Cuentas': '#898781',
}

const COLOR_NEUTRO = '#898781'

export function colorDeGrupo(nombreGrupo) {
  return COLOR_POR_GRUPO[nombreGrupo] || COLOR_NEUTRO
}
