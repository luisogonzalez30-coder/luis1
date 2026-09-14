import { etiquetaCategoria } from './categorias'

// Quita tildes, espacios de sobra y pasa a minúscula: el residente escribe "licanten"
// o "iloca" sin acentos y desde el teclado del celular, y igual tiene que
// encontrar "Conserjería". Se usa en el buscador de unidades (ver
// utils/unidades.js) y en los filtros de los paneles.
export function normalizarTexto(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Búsqueda de texto libre en los Dashboards: compara contra los campos que un
// usuario probablemente recuerde de una solicitud (ticket, dirección,
// categoría en su forma legible, detalles, equipo) — no contra datos del
// residente (nombre/contacto/RUT), que no son un criterio de búsqueda útil acá.
export function coincideTexto(solicitud, textoBusqueda) {
  const texto = textoBusqueda.trim().toLowerCase()
  if (!texto) return true

  const campos = [
    solicitud.numero_ticket,
    solicitud.direccion_texto,
    solicitud.detalles_adicionales,
    solicitud.equipo_asignado,
    etiquetaCategoria(solicitud.categoria),
  ]

  return campos.some((campo) => campo?.toLowerCase().includes(texto))
}
