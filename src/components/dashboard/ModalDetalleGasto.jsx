import { useMemo } from 'react'
import Modal from '../common/Modal'
import { esDelMesActual, formatearFecha } from '../../utils/tiempo'
import { calcularCostoManoObra } from '../../utils/costeo'

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })

// Detalle línea por línea del gasto que resume ResumenGastoMensual.jsx: cada
// incidencia Resuelta del mes (acotada al mismo filtro de departamento), con
// horas reales, costo de mano de obra calculado, descripción de materiales y
// costo final total — para que el Alcalde vea EN QUÉ se gastó, no solo cuánto.
export default function ModalDetalleGasto({ incidencias, departamento, onCerrar }) {
  const filtradas = useMemo(
    () =>
      incidencias
        .filter((inc) => inc.estado === 'Resuelto' && esDelMesActual(inc.fecha_cierre))
        .filter((inc) => departamento === 'Todos' || inc.departamento === departamento)
        .sort((a, b) => (b.fecha_cierre?.toMillis?.() || 0) - (a.fecha_cierre?.toMillis?.() || 0)),
    [incidencias, departamento]
  )

  const totales = filtradas.reduce(
    (acc, inc) => {
      const trabajadoresAsignados = inc.presupuesto_estimado?.trabajadores_asignados || []
      const horas = inc.gasto_real?.horas_reales || 0
      return {
        horas: acc.horas + horas,
        manoDeObra: acc.manoDeObra + calcularCostoManoObra(trabajadoresAsignados, horas),
        total: acc.total + (inc.gasto_real?.costo_final || 0),
      }
    },
    { horas: 0, manoDeObra: 0, total: 0 }
  )

  return (
    <Modal
      titulo={`Detalle de gasto${departamento !== 'Todos' ? ` — ${departamento}` : ''}`}
      onCerrar={onCerrar}
    >
      {filtradas.length === 0 ? (
        <p className="text-sm text-gray-400">No hay incidencias resueltas este mes en este filtro.</p>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-2 rounded-lg bg-gray-50 p-2 text-center text-xs">
            <div>
              <p className="text-gray-500">Horas hombre</p>
              <p className="font-semibold text-gray-900">{totales.horas}h</p>
            </div>
            <div>
              <p className="text-gray-500">Mano de obra</p>
              <p className="font-semibold text-gray-900">{formatoCLP.format(totales.manoDeObra)}</p>
            </div>
            <div>
              <p className="text-gray-500">Total gastado</p>
              <p className="font-semibold text-gray-900">{formatoCLP.format(totales.total)}</p>
            </div>
          </div>

          <ul className="max-h-96 space-y-2 overflow-y-auto">
            {filtradas.map((inc) => {
              const trabajadoresAsignados = inc.presupuesto_estimado?.trabajadores_asignados || []
              const horas = inc.gasto_real?.horas_reales || 0
              const manoDeObra = calcularCostoManoObra(trabajadoresAsignados, horas)

              return (
                <li key={inc.id} className="rounded-xl border border-gray-200 p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-gray-900">{inc.categoria}</p>
                    <p className="text-xs text-gray-400">{formatearFecha(inc.fecha_cierre)}</p>
                  </div>
                  {departamento === 'Todos' && (
                    <p className="text-xs text-gray-400">{inc.departamento}</p>
                  )}

                  <div className="mt-2 space-y-0.5 text-xs text-gray-600">
                    <p>Horas hombre utilizadas: <span className="font-medium text-gray-900">{horas}h</span></p>
                    {trabajadoresAsignados.length > 0 && (
                      <p>Personal: {trabajadoresAsignados.map((t) => t.nombre).join(', ')}</p>
                    )}
                    {manoDeObra > 0 && (
                      <p>Costo mano de obra: <span className="font-medium text-gray-900">{formatoCLP.format(manoDeObra)}</span></p>
                    )}
                    {inc.presupuesto_estimado?.materiales && (
                      <p>Materiales: {inc.presupuesto_estimado.materiales}</p>
                    )}
                  </div>

                  <p className="mt-2 border-t border-gray-100 pt-1.5 text-sm font-semibold text-gray-900">
                    Costo final: {formatoCLP.format(inc.gasto_real?.costo_final || 0)}
                  </p>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Modal>
  )
}
