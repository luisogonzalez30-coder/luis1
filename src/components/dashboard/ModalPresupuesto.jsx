import { useEffect, useMemo, useState } from 'react'
import Modal from '../common/Modal'
import Boton from '../common/Boton'
import { suscribirTrabajadores } from '../../services/trabajadoresService'

const FORMULARIO_VACIO = { horas_estimadas: '', materiales: '', costo_aprox: '' }

// Presupuesto estimado que el Jefe de Departamento debe completar ANTES de que
// una incidencia pase a "En Proceso" (ver PanelGestionDepartamento.jsx) — parte
// del módulo de Órdenes de Trabajo y Costeo (ver ESTADO_PROYECTO.md). Solo se usa
// acá; el Alcalde sigue asignando cuadrillas sin presupuesto (PanelAsignacion.jsx).
// A diferencia de la v1, acá el Jefe elige de SU roster (trabajadoresService.js)
// quiénes específicamente van a esta incidencia — no solo un número — y el costo
// de mano de obra se calcula automático (tarifa de cada uno × horas estimadas)
// en vez de estimarse a ojo.
export default function ModalPresupuesto({ municipioId, departamento, onGuardar, onCancelar, guardando }) {
  const [trabajadores, setTrabajadores] = useState([])
  const [seleccionados, setSeleccionados] = useState([])
  const [form, setForm] = useState(FORMULARIO_VACIO)

  useEffect(() => {
    const unsubscribe = suscribirTrabajadores(setTrabajadores, municipioId, departamento)
    return unsubscribe
  }, [municipioId, departamento])

  const trabajadoresSeleccionados = trabajadores.filter((t) => seleccionados.includes(t.id))
  const costoManoObra = useMemo(
    () => trabajadoresSeleccionados.reduce((total, t) => total + (t.tarifa_hora || 0), 0) * (Number(form.horas_estimadas) || 0),
    [trabajadoresSeleccionados, form.horas_estimadas]
  )

  const esValido =
    seleccionados.length > 0 &&
    Number(form.horas_estimadas) > 0 &&
    form.materiales.trim().length > 0 &&
    Number(form.costo_aprox) >= 0

  function alternarSeleccion(id) {
    setSeleccionados((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  function manejarSubmit(e) {
    e.preventDefault()
    if (!esValido) return
    onGuardar({
      personal_requerido: seleccionados.length,
      trabajadores_asignados: trabajadoresSeleccionados.map((t) => ({
        id: t.id,
        nombre: t.nombre,
        tarifa_hora: t.tarifa_hora || 0,
      })),
      horas_estimadas: Number(form.horas_estimadas),
      materiales: form.materiales.trim(),
      costo_aprox: Number(form.costo_aprox),
    })
  }

  return (
    <Modal titulo="Presupuesto estimado" onCerrar={onCancelar}>
      <p className="mb-4 text-sm text-gray-500">
        Completa esto antes de asignar la cuadrilla — el ticket pasa a "En Proceso" recién cuando guardes.
      </p>

      <form onSubmit={manejarSubmit}>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Personal asignado {seleccionados.length > 0 && `(${seleccionados.length})`}
        </label>
        {trabajadores.length === 0 ? (
          <p className="mb-3 text-sm text-gray-400">
            Tu departamento todavía no tiene trabajadores cargados — agrégalos primero en "Mi equipo".
          </p>
        ) : (
          <div className="mb-3 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
            {trabajadores.map((t) => (
              <label key={t.id} className="flex items-center gap-2 rounded p-1 text-sm hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={seleccionados.includes(t.id)}
                  onChange={() => alternarSeleccion(t.id)}
                />
                <span className="flex-1">{t.nombre} <span className="text-gray-400">— {t.cargo}</span></span>
                <span className="text-xs text-gray-400">${(t.tarifa_hora || 0).toLocaleString('es-CL')}/h</span>
              </label>
            ))}
          </div>
        )}

        <label className="mb-1 block text-sm font-medium text-gray-700">Horas estimadas</label>
        <input
          type="number"
          min="1"
          value={form.horas_estimadas}
          onChange={(e) => setForm((f) => ({ ...f, horas_estimadas: e.target.value }))}
          className="mb-3 w-full rounded-lg border border-gray-300 p-2.5"
        />

        {costoManoObra > 0 && (
          <p className="mb-3 rounded-lg bg-blue-50 p-2 text-xs text-blue-800">
            Costo de mano de obra (calculado): <strong>${costoManoObra.toLocaleString('es-CL')}</strong>
          </p>
        )}

        <label className="mb-1 block text-sm font-medium text-gray-700">Materiales</label>
        <input
          type="text"
          placeholder="Ej: 2 sacos de asfalto frío, señalética"
          value={form.materiales}
          onChange={(e) => setForm((f) => ({ ...f, materiales: e.target.value }))}
          className="mb-3 w-full rounded-lg border border-gray-300 p-2.5"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">Costo aproximado total (CLP)</label>
        <input
          type="number"
          min="0"
          value={form.costo_aprox}
          onChange={(e) => setForm((f) => ({ ...f, costo_aprox: e.target.value }))}
          className="mb-4 w-full rounded-lg border border-gray-300 p-2.5"
        />

        <Boton type="submit" className="w-full" cargando={guardando} disabled={!esValido}>
          Guardar y asignar cuadrilla
        </Boton>
      </form>
    </Modal>
  )
}
