import { useMemo, useState } from 'react'
import { AlertTriangle, Receipt } from 'lucide-react'
import Modal from '../common/Modal'
import { esDelMesActual, formatearFecha } from '../../utils/tiempo'
import { calcularCostoManoObra } from '../../utils/costeo'

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })

// Detalle línea por línea del gasto que resume ResumenGastoMensual.jsx: cada
// incidencia Resuelta del mes (acotada al mismo filtro de departamento), con
// horas reales, costo de mano de obra calculado, materiales ítem por ítem
// (no un solo número) y costo final total — para que el Alcalde vea EN QUÉ se
// gastó, no solo cuánto. Se destacan y se pueden aislar con el filtro de abajo
// dos tipos de alerta, que son distintas a propósito: gasto_real.requiere_revision
// (lo que gastó la cuadrilla se alejó del presupuesto) y
// presupuesto_estimado.requiere_revision (el presupuesto YA se alejó del
// promedio histórico antes de gastar nada — ver ModalPresupuesto.jsx). Un
// presupuesto inflado a propósito nunca dispararía la primera alerta, por eso
// hace falta la segunda.
function tieneAlerta(inc) {
  return Boolean(inc.gasto_real?.requiere_revision || inc.presupuesto_estimado?.requiere_revision)
}

export default function ModalDetalleGasto({ incidencias, departamento, onCerrar }) {
  const [soloRevision, setSoloRevision] = useState(false)

  const filtradas = useMemo(
    () =>
      incidencias
        .filter((inc) => inc.estado === 'Resuelto' && esDelMesActual(inc.fecha_cierre))
        .filter((inc) => departamento === 'Todos' || inc.departamento === departamento)
        .filter((inc) => !soloRevision || tieneAlerta(inc))
        .sort((a, b) => (b.fecha_cierre?.toMillis?.() || 0) - (a.fecha_cierre?.toMillis?.() || 0)),
    [incidencias, departamento, soloRevision]
  )

  const totalARevisar = useMemo(
    () =>
      incidencias.filter(
        (inc) =>
          inc.estado === 'Resuelto' &&
          esDelMesActual(inc.fecha_cierre) &&
          (departamento === 'Todos' || inc.departamento === departamento) &&
          tieneAlerta(inc)
      ).length,
    [incidencias, departamento]
  )

  const totales = filtradas.reduce(
    (acc, inc) => {
      const trabajadoresAsignados = inc.presupuesto_estimado?.trabajadores_asignados || []
      const horas = inc.gasto_real?.horas_reales || 0
      return {
        horas: acc.horas + horas,
        manoDeObra: acc.manoDeObra + (inc.gasto_real?.costo_mano_obra ?? calcularCostoManoObra(trabajadoresAsignados, horas)),
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
      {totalARevisar > 0 && (
        <label className="mb-3 flex items-center gap-2 rounded-lg bg-orange-50 p-2 text-xs font-medium text-orange-800">
          <input type="checkbox" checked={soloRevision} onChange={(e) => setSoloRevision(e.target.checked)} />
          <AlertTriangle size={14} />
          {totalARevisar} {totalARevisar === 1 ? 'caso tiene una alerta' : 'casos tienen alguna alerta'} (presupuesto o cierre) — mostrar solo esos
        </label>
      )}

      {filtradas.length === 0 ? (
        <p className="text-sm text-gray-400">
          {soloRevision ? 'Ninguno de los cierres de este filtro quedó marcado a revisar.' : 'No hay incidencias resueltas este mes en este filtro.'}
        </p>
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
              const manoDeObra = inc.gasto_real?.costo_mano_obra ?? calcularCostoManoObra(trabajadoresAsignados, horas)
              const materialesUsados = inc.gasto_real?.materiales_usados

              return (
                <li
                  key={inc.id}
                  className={`rounded-xl border p-3 text-sm ${
                    tieneAlerta(inc) ? 'border-orange-300 bg-orange-50/40' : 'border-gray-200'
                  }`}
                >
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
                    {materialesUsados?.length > 0 ? (
                      <div>
                        <p>Materiales usados:</p>
                        <ul className="ml-3 list-disc">
                          {materialesUsados.map((m, i) => (
                            <li key={i}>
                              {m.descripcion} — {formatoCLP.format(m.costo)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p>Materiales usados: ninguno reportado</p>
                    )}
                    {inc.gasto_real?.comprobante_url && (
                      <a
                        href={inc.gasto_real.comprobante_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <Receipt size={12} /> Ver comprobante
                      </a>
                    )}
                    {inc.gasto_real?.cerrado_por && <p>Cerrado por: {inc.gasto_real.cerrado_por}</p>}
                  </div>

                  {inc.presupuesto_estimado?.requiere_revision && (
                    <div className="mt-2 rounded-lg bg-orange-100 p-2 text-xs text-orange-800">
                      <p className="flex items-center gap-1 font-medium">
                        <AlertTriangle size={12} /> El presupuesto ya se alejaba del promedio histórico
                      </p>
                      <p className="mt-0.5">
                        {inc.presupuesto_estimado.justificacion ? `"${inc.presupuesto_estimado.justificacion}"` : 'Sin justificación registrada.'}
                      </p>
                    </div>
                  )}

                  {inc.gasto_real?.requiere_revision && (
                    <div className="mt-2 rounded-lg bg-orange-100 p-2 text-xs text-orange-800">
                      <p className="flex items-center gap-1 font-medium">
                        <AlertTriangle size={12} /> Se salió del presupuesto
                      </p>
                      <p className="mt-0.5">
                        {inc.gasto_real.justificacion ? `"${inc.gasto_real.justificacion}"` : 'Sin justificación registrada.'}
                      </p>
                    </div>
                  )}

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
