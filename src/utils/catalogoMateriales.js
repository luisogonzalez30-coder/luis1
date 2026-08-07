// Base real para presupuestar (ModalPresupuesto.jsx): en vez de que el Jefe de
// Departamento escriba un costo aproximado a ojo, se construye un catálogo con
// lo que las cuadrillas YA reportaron al cerrar otras incidencias
// (gasto_real.materiales_usados, ver FormularioCierreGasto.jsx) — no es una
// lista mantenida a mano, es el historial real de compras del municipio.
// Sin queries nuevas: los dashboards ya traen todas las incidencias del
// municipio suscritas (ver DashboardDepartamentoPage.jsx), esto solo las
// resume del lado del cliente.
export function construirCatalogoMateriales(incidencias) {
  const porDescripcion = new Map()

  ;[...incidencias]
    .filter((inc) => inc.estado === 'Resuelto' && inc.gasto_real?.materiales_usados?.length)
    .sort((a, b) => (b.fecha_cierre?.toMillis?.() || 0) - (a.fecha_cierre?.toMillis?.() || 0))
    .forEach((inc) => {
      inc.gasto_real.materiales_usados.forEach((m) => {
        const clave = m.descripcion.trim().toLowerCase()
        // Ya viene ordenado de más reciente a más antiguo: la primera
        // aparición de cada material es su precio conocido más reciente.
        if (!clave || porDescripcion.has(clave)) return
        porDescripcion.set(clave, { descripcion: m.descripcion.trim(), costo: m.costo, fecha: inc.fecha_cierre })
      })
    })

  return [...porDescripcion.values()]
}

// Precio de referencia para un texto ya escrito (coincidencia exacta salvo
// mayúsculas/espacios) — usado para mostrar "Último precio real: $X" mientras
// el Jefe de Departamento completa una línea de material.
export function buscarPrecioReferencia(catalogo, descripcion) {
  const clave = descripcion.trim().toLowerCase()
  if (!clave) return null
  return catalogo.find((item) => item.descripcion.trim().toLowerCase() === clave) || null
}

// Promedio de horas y costo final de trabajos YA resueltos de la misma
// categoría — el otro fundamento posible al presupuestar: "los últimos N
// baches costaron en promedio $X". null si no hay suficiente historial.
export function promedioHistoricoPorCategoria(incidencias, categoria) {
  const comparables = incidencias.filter(
    (inc) => inc.estado === 'Resuelto' && inc.categoria === categoria && inc.gasto_real
  )
  if (comparables.length === 0) return null

  const horas = comparables.reduce((total, inc) => total + (inc.gasto_real.horas_reales || 0), 0) / comparables.length
  const costo = comparables.reduce((total, inc) => total + (inc.gasto_real.costo_final || 0), 0) / comparables.length

  return { horas, costo, muestras: comparables.length }
}
