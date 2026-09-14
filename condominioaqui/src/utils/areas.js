import { AREAS, AREA_POR_CATEGORIA, AREA_POR_DEFECTO } from './categorias'

// Derivación automática al área responsable: al crear una solicitud se decide
// sola según la categoría, sin que el residente tenga que elegir. Pedirle a
// alguien que reporta una filtración a las 23:00 que además sepa si eso lo ve
// Mantención o un proveedor externo es garantizar que llegue mal derivado.
export { AREAS }

export function calcularArea(categoriaValor) {
  return AREA_POR_CATEGORIA[categoriaValor] || AREA_POR_DEFECTO
}
