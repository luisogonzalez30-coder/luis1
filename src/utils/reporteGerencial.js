import { esDelMesActual, horasDesde, promedioHoras } from './tiempo'
import { CATEGORIAS } from './categorias'

const ETIQUETA_CATEGORIA = Object.fromEntries(CATEGORIAS.map((c) => [c.valor, c.etiqueta]))

// Cuántos reportes lista la tabla. Un PDF de 40 páginas no lo lee nadie; el
// histórico completo ya se exporta a CSV desde el mismo panel.
const MAX_FILAS = 30

const DIAS_SEMANA = 7

// Reporte gerencial en PDF: lo que el Alcalde necesita para una reunión, en un
// clic y sin pedirle nada a nadie.
//
// Por qué jsPDF y no imprimir con el navegador, como sí hace la Cuenta Pública
// (§31): son dos documentos distintos. La Cuenta Pública es un informe anual con
// gráficos, y ahí imprimir gana porque los gráficos en canvas salen cortados o
// en blanco al pasar por una librería de PDF. Esto es texto y una tabla, sin un
// solo gráfico, así que jsPDF da un archivo idéntico en cualquier computador,
// sin depender del diálogo de impresión ni de los márgenes del navegador.
//
// La librería se carga con import dinámico: pesa ~350 kB y solo hace falta el
// día que alguien aprieta el botón.

function formatearHoras(horas) {
  if (horas == null) return 'Sin datos'
  return horas < 24 ? `${Math.round(horas)} horas` : `${(horas / 24).toFixed(1)} días`
}

function formatearFecha(timestamp) {
  if (!timestamp?.toDate) return '—'
  return timestamp.toDate().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Color de la municipalidad, para que el documento salga con su identidad y no
// con un azul genérico. jsPDF necesita la tripleta RGB.
function colorInstitucional(municipio) {
  const hex = (municipio?.color_primario || '#1D4ED8').replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return [29, 78, 216]
  const n = parseInt(hex, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function calcularResumenGerencial(incidencias) {
  const corteSemana = Date.now() - DIAS_SEMANA * 24 * 3600 * 1000

  const resueltas = incidencias.filter((i) => i.estado === 'Resuelto')
  const pendientes = incidencias.filter((i) => i.estado === 'Pendiente')
  const enProceso = incidencias.filter((i) => i.estado === 'En Proceso')

  const resueltasSemana = resueltas.filter(
    (i) => i.fecha_cierre?.toDate && i.fecha_cierre.toDate().getTime() >= corteSemana
  )
  const recibidasSemana = incidencias.filter(
    (i) => i.fecha_creacion?.toDate && i.fecha_creacion.toDate().getTime() >= corteSemana
  )

  return {
    total: incidencias.length,
    pendientes: pendientes.length,
    enProceso: enProceso.length,
    resueltas: resueltas.length,
    resueltasSemana: resueltasSemana.length,
    recibidasSemana: recibidasSemana.length,
    resueltasMes: resueltas.filter((i) => esDelMesActual(i.fecha_cierre)).length,
    emergencias: incidencias.filter((i) => i.estado !== 'Resuelto' && i.nivel_gravedad === 'Alta').length,
    // promedioHoras descarta intervalos incoherentes: un tiempo negativo en un
    // documento que el Alcalde muestra en una reunión destruye la credibilidad
    // del resto del informe (misma lección que §31).
    tiempoRespuesta: promedioHoras(recibidasSemana, (i) => i.fecha_creacion, (i) => i.fecha_asignacion),
    tiempoResolucion: promedioHoras(resueltasSemana, (i) => i.fecha_creacion, (i) => i.fecha_cierre),
    atrasados: pendientes.filter((i) => horasDesde(i.fecha_creacion) > 4).length,
  }
}

export async function generarReporteGerencial({ incidencias, municipio, generadoPor }) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const color = colorInstitucional(municipio)
  const anchoPagina = doc.internal.pageSize.getWidth()
  const margen = 16

  const r = calcularResumenGerencial(incidencias)
  const ahora = new Date()

  // --- Encabezado institucional ---------------------------------------------
  doc.setFillColor(...color)
  doc.rect(0, 0, anchoPagina, 30, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(municipio?.nombre || 'Municipalidad', margen, 14)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Reporte de gestión de incidencias urbanas', margen, 21)

  doc.setFontSize(8)
  doc.text(
    `Generado el ${ahora.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })} a las ${ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`,
    margen,
    26.5
  )

  // --- Bloque de indicadores ------------------------------------------------
  let y = 42

  doc.setTextColor(24, 24, 27)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Resumen de los últimos 7 días', margen, y)
  y += 7

  const tarjetas = [
    ['Reportes resueltos', String(r.resueltasSemana)],
    ['Reportes recibidos', String(r.recibidasSemana)],
    ['Tiempo promedio de respuesta', formatearHoras(r.tiempoRespuesta)],
    ['Tiempo promedio de resolución', formatearHoras(r.tiempoResolucion)],
  ]

  const anchoTarjeta = (anchoPagina - margen * 2 - 9) / 4
  tarjetas.forEach(([etiqueta, valor], i) => {
    const x = margen + i * (anchoTarjeta + 3)
    doc.setDrawColor(228, 228, 231)
    doc.setFillColor(250, 250, 250)
    doc.roundedRect(x, y, anchoTarjeta, 20, 2, 2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...color)
    doc.text(valor, x + 3, y + 9)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(113, 113, 122)
    // splitTextToSize evita que una etiqueta larga se salga de la tarjeta.
    doc.text(doc.splitTextToSize(etiqueta, anchoTarjeta - 6), x + 3, y + 14.5)
  })

  y += 28

  // --- Estado actual --------------------------------------------------------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(24, 24, 27)
  doc.text('Estado actual del municipio', margen, y)
  y += 3

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2, textColor: [63, 63, 70] },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold', textColor: [24, 24, 27] } },
    body: [
      ['Reportes sin resolver', `${r.pendientes + r.enProceso}`],
      ['   · Esperando asignación de cuadrilla', `${r.pendientes}`],
      ['   · Con cuadrilla, en ejecución', `${r.enProceso}`],
      ['Emergencias activas (gravedad Alta sin resolver)', `${r.emergencias}`],
      ['Reportes atrasados (más de 4 h sin cuadrilla)', `${r.atrasados}`],
      ['Resueltos en el mes en curso', `${r.resueltasMes}`],
      ['Resueltos desde que existe la plataforma', `${r.resueltas} de ${r.total}`],
    ],
    margin: { left: margen, right: margen },
  })

  y = doc.lastAutoTable.finalY + 10

  // --- Tabla de últimos reportes -------------------------------------------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(24, 24, 27)
  doc.text(`Últimos reportes recibidos`, margen, y)
  y += 3

  const ultimos = [...incidencias]
    .sort((a, b) => (b.fecha_creacion?.seconds || 0) - (a.fecha_creacion?.seconds || 0))
    .slice(0, MAX_FILAS)

  autoTable(doc, {
    startY: y,
    head: [['Fecha', 'Categoría', 'Dirección de referencia', 'Dirección municipal', 'Gravedad', 'Estado']],
    body: ultimos.map((inc) => [
      formatearFecha(inc.fecha_creacion),
      ETIQUETA_CATEGORIA[inc.categoria] || inc.categoria || '—',
      inc.direccion_texto || 'Sin referencia',
      inc.departamento || '—',
      inc.nivel_gravedad || '—',
      inc.estado || '—',
    ]),
    styles: { fontSize: 7.5, cellPadding: 2, textColor: [63, 63, 70], overflow: 'linebreak' },
    headStyles: { fillColor: color, textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 32 },
      3: { cellWidth: 32 },
      4: { cellWidth: 17 },
      5: { cellWidth: 20 },
    },
    margin: { left: margen, right: margen },
  })

  // --- Pie de página, en todas las páginas ----------------------------------
  const paginas = doc.internal.getNumberOfPages()
  for (let i = 1; i <= paginas; i += 1) {
    doc.setPage(i)
    const alto = doc.internal.pageSize.getHeight()
    doc.setDrawColor(228, 228, 231)
    doc.line(margen, alto - 12, anchoPagina - margen, alto - 12)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(161, 161, 170)
    doc.text(
      `${municipio?.nombre || ''} · Documento interno de gestión${generadoPor ? ` · Generado por ${generadoPor}` : ''}`,
      margen,
      alto - 7
    )
    doc.text(`Página ${i} de ${paginas}`, anchoPagina - margen, alto - 7, { align: 'right' })
  }

  const fechaArchivo = ahora.toISOString().slice(0, 10)
  doc.save(`reporte-gestion-${municipio?.id || 'municipio'}-${fechaArchivo}.pdf`)
}
