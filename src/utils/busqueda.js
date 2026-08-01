import { CATEGORIAS } from './categorias'

const ETIQUETA_POR_VALOR = Object.fromEntries(CATEGORIAS.map((c) => [c.valor, c.etiqueta]))

// Búsqueda de texto libre en los Dashboards: compara contra los campos que un
// funcionario probablemente recuerde de una incidencia (ticket, dirección,
// categoría en su forma legible, detalles, cuadrilla) — no contra datos del
// ciudadano (nombre/contacto/RUT), que no son un criterio de búsqueda útil acá.
export function coincideTexto(incidencia, textoBusqueda) {
  const texto = textoBusqueda.trim().toLowerCase()
  if (!texto) return true

  const campos = [
    incidencia.numero_ticket,
    incidencia.direccion_texto,
    incidencia.detalles_adicionales,
    incidencia.cuadrilla_asignada,
    ETIQUETA_POR_VALOR[incidencia.categoria] || incidencia.categoria,
  ]

  return campos.some((campo) => campo?.toLowerCase().includes(texto))
}
