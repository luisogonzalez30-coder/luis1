// Suma tarifa_hora de cada trabajador asignado × horas — usado tanto para el
// costo estimado (horas_estimadas) como el real (horas_reales), mismo cálculo.
// Compartido entre PanelGestionArea.jsx y ModalDetalleGasto.jsx.
export function calcularCostoManoObra(trabajadoresAsignados, horas) {
  if (!trabajadoresAsignados?.length || !horas) return 0
  return trabajadoresAsignados.reduce((total, t) => total + (t.tarifa_hora || 0), 0) * horas
}

// Umbral de desviación para el cierre de gasto real (FormularioCierreGasto.jsx):
// pasado este margen sobre lo presupuestado, el cierre no se bloquea (una
// equipo en terreno con mala señal igual tiene que poder resolver el
// ticket) pero se marca "a revisar" y exige una justificación de texto.
// MISMO valor replicado en firestore.rules (desviacionSignificativa) para que
// esa marca no dependa solo de la UI — si cambias esto, cambia también allá.
export const UMBRAL_DESVIACION = 0.4

// Compara lo reportado por el equipo contra presupuesto_estimado. Sin
// presupuesto (ej. solicitudes viejas sin este flujo) no hay contra qué
// comparar, así que nunca se marca a revisar por falta de datos.
export function evaluarDesviacion({ horasEstimadas, costoAprox, horasReales, costoTotal }) {
  const horasDesviadas = horasEstimadas > 0 && horasReales > horasEstimadas * (1 + UMBRAL_DESVIACION)
  const costoDesviado = costoAprox > 0 && costoTotal > costoAprox * (1 + UMBRAL_DESVIACION)

  return { requiereRevision: horasDesviadas || costoDesviado, horasDesviadas, costoDesviado }
}
