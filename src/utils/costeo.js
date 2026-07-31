// Suma tarifa_hora de cada trabajador asignado × horas — usado tanto para el
// costo estimado (horas_estimadas) como el real (horas_reales), mismo cálculo.
// Compartido entre PanelGestionDepartamento.jsx y ModalDetalleGasto.jsx.
export function calcularCostoManoObra(trabajadoresAsignados, horas) {
  if (!trabajadoresAsignados?.length || !horas) return 0
  return trabajadoresAsignados.reduce((total, t) => total + (t.tarifa_hora || 0), 0) * horas
}
