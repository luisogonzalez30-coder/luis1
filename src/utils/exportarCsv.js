import { etiquetaCategoria } from './categorias'
import { formatearFecha } from './tiempo'

function celda(valor) {
  const texto = String(valor ?? '')
  // Escapa comillas dobles y envuelve en comillas si el valor tiene coma, comilla o salto de línea.
  const escapado = texto.replace(/"/g, '""')
  return /[",\n]/.test(texto) ? `"${escapado}"` : escapado
}

const COLUMNAS = [
  { titulo: 'Ticket', obtener: (inc) => inc.numero_ticket },
  { titulo: 'Categoría', obtener: (inc) => etiquetaCategoria(inc.categoria) },
  { titulo: 'Departamento', obtener: (inc) => inc.departamento },
  { titulo: 'Gravedad', obtener: (inc) => inc.nivel_gravedad },
  { titulo: 'Estado', obtener: (inc) => inc.estado },
  { titulo: 'Cuadrilla', obtener: (inc) => inc.cuadrilla_asignada },
  { titulo: 'Dirección', obtener: (inc) => inc.direccion_texto },
  { titulo: 'Fecha creación', obtener: (inc) => formatearFecha(inc.fecha_creacion) },
  { titulo: 'Fecha cierre', obtener: (inc) => formatearFecha(inc.fecha_cierre) },
  { titulo: 'Horas reales', obtener: (inc) => inc.gasto_real?.horas_reales ?? '' },
  { titulo: 'Costo mano de obra (CLP)', obtener: (inc) => inc.gasto_real?.costo_mano_obra ?? '' },
  {
    titulo: 'Materiales usados',
    obtener: (inc) =>
      inc.gasto_real?.materiales_usados?.map((m) => `${m.descripcion} ($${m.costo})`).join('; ') ?? '',
  },
  { titulo: 'Costo final (CLP)', obtener: (inc) => inc.gasto_real?.costo_final ?? '' },
  { titulo: 'Requiere revisión', obtener: (inc) => (inc.gasto_real?.requiere_revision ? 'Sí' : 'No') },
  { titulo: 'Justificación', obtener: (inc) => inc.gasto_real?.justificacion ?? '' },
  { titulo: 'Cerrado por', obtener: (inc) => inc.gasto_real?.cerrado_por ?? '' },
]

// Exporta un array de incidencias a un .csv y dispara la descarga en el navegador.
// Sin librerías nuevas: un CSV simple se abre bien en Excel/Google Sheets.
export function exportarIncidenciasCsv(incidencias, nombreArchivo = 'incidencias.csv') {
  const encabezado = COLUMNAS.map((col) => celda(col.titulo)).join(',')
  const filas = incidencias.map((inc) => COLUMNAS.map((col) => celda(col.obtener(inc))).join(','))
  // ﻿ (BOM UTF-8) para que Excel en Windows no rompa las tildes/ñ.
  const contenido = '﻿' + [encabezado, ...filas].join('\r\n')

  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  enlace.click()
  URL.revokeObjectURL(url)
}
