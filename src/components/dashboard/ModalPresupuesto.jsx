import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, TrendingUp } from 'lucide-react'
import Modal from '../common/Modal'
import Boton from '../common/Boton'
import { suscribirTrabajadores } from '../../services/trabajadoresService'
import { construirCatalogoMateriales, buscarPrecioReferencia, promedioHistoricoPorCategoria } from '../../utils/catalogoMateriales'

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })

const FORMULARIO_VACIO = { horas_estimadas: '' }
const MATERIAL_VACIO = { descripcion: '', costo: '' }

// Presupuesto estimado que el Jefe de Departamento debe completar ANTES de que
// una incidencia pase a "En Proceso" (ver PanelGestionDepartamento.jsx) — parte
// del módulo de Órdenes de Trabajo y Costeo (ver ESTADO_PROYECTO.md). Solo se usa
// acá; el Alcalde sigue asignando cuadrillas sin presupuesto (PanelAsignacion.jsx).
//
// El costo de mano de obra se calcula automático (tarifa de cada trabajador ×
// horas estimadas), nunca a ojo. Los materiales van ítem por ítem, igual que
// en el cierre real (FormularioCierreGasto.jsx) — y para que ese número no
// salga de la nada, se ofrece el ÚLTIMO PRECIO REAL que ese mismo material
// costó en otro trabajo cerrado (construirCatalogoMateriales, alimentado por
// gasto_real.materiales_usados) y el promedio histórico de trabajos de esta
// misma categoría. Ninguno de los dos es obligatorio de usar — son la
// referencia que antes no existía, no una restricción nueva.
export default function ModalPresupuesto({ municipioId, departamento, categoria, incidencias, onGuardar, onCancelar, guardando }) {
  const [trabajadores, setTrabajadores] = useState([])
  const [seleccionados, setSeleccionados] = useState([])
  const [form, setForm] = useState(FORMULARIO_VACIO)
  const [materiales, setMateriales] = useState([MATERIAL_VACIO])

  useEffect(() => {
    const unsubscribe = suscribirTrabajadores(setTrabajadores, municipioId, departamento)
    return unsubscribe
  }, [municipioId, departamento])

  const catalogo = useMemo(() => construirCatalogoMateriales(incidencias || []), [incidencias])
  const promedioCategoria = useMemo(
    () => promedioHistoricoPorCategoria(incidencias || [], categoria),
    [incidencias, categoria]
  )

  const trabajadoresSeleccionados = trabajadores.filter((t) => seleccionados.includes(t.id))
  const costoManoObra = useMemo(
    () => trabajadoresSeleccionados.reduce((total, t) => total + (t.tarifa_hora || 0), 0) * (Number(form.horas_estimadas) || 0),
    [trabajadoresSeleccionados, form.horas_estimadas]
  )

  const materialesIncompletos = materiales.some(
    (m) => (m.descripcion.trim().length > 0) !== (m.costo !== '' && Number(m.costo) >= 0)
  )
  const materialesValidos = materiales.filter((m) => m.descripcion.trim().length > 0 && Number(m.costo) >= 0)
  const costoMateriales = materialesValidos.reduce((total, m) => total + Number(m.costo), 0)
  const costoTotal = costoManoObra + costoMateriales

  const esValido = seleccionados.length > 0 && Number(form.horas_estimadas) > 0 && !materialesIncompletos

  function alternarSeleccion(id) {
    setSeleccionados((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  function actualizarMaterial(indice, campo, valor) {
    setMateriales((prev) => prev.map((m, i) => (i === indice ? { ...m, [campo]: valor } : m)))
  }

  function agregarMaterial() {
    setMateriales((prev) => [...prev, MATERIAL_VACIO])
  }

  function quitarMaterial(indice) {
    setMateriales((prev) => prev.filter((_, i) => i !== indice))
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
      materiales_estimados: materialesValidos.map((m) => ({ descripcion: m.descripcion.trim(), costo: Number(m.costo) })),
      costo_materiales_estimado: costoMateriales,
      costo_aprox: costoTotal,
    })
  }

  return (
    <Modal titulo="Presupuesto estimado" onCerrar={onCancelar}>
      <p className="mb-3 text-sm text-gray-500">
        Completa esto antes de asignar la cuadrilla — el ticket pasa a "En Proceso" recién cuando guardes.
      </p>

      {promedioCategoria && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
          <TrendingUp size={14} className="mt-0.5 shrink-0" />
          <span>
            Los últimos {promedioCategoria.muestras} trabajos de esta categoría costaron en promedio{' '}
            <strong>{formatoCLP.format(promedioCategoria.costo)}</strong> y tomaron {promedioCategoria.horas.toFixed(1)}h.
          </span>
        </div>
      )}

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
            Costo de mano de obra (calculado): <strong>{formatoCLP.format(costoManoObra)}</strong>
          </p>
        )}

        <label className="mb-1 block text-sm font-medium text-gray-700">Materiales estimados</label>
        <p className="mb-2 text-xs text-gray-400">
          Uno por línea. Si ya se usó antes en otro trabajo, aparece su último precio real como referencia.
        </p>
        <div className="mb-2 space-y-1">
          {materiales.map((m, i) => {
            const referencia = buscarPrecioReferencia(catalogo, m.descripcion)
            return (
              <div key={i}>
                <div className="flex gap-2">
                  <input
                    type="text"
                    list="catalogo-materiales"
                    placeholder="Ej: 2 sacos de asfalto frío"
                    value={m.descripcion}
                    onChange={(e) => actualizarMaterial(i, 'descripcion', e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 p-2 text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="$"
                    value={m.costo}
                    onChange={(e) => actualizarMaterial(i, 'costo', e.target.value)}
                    className="w-24 rounded-lg border border-gray-300 p-2 text-sm"
                  />
                  {materiales.length > 1 && (
                    <button
                      type="button"
                      onClick={() => quitarMaterial(i)}
                      className="shrink-0 text-gray-400 hover:text-estado-critico"
                      aria-label="Quitar material"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
                {referencia && referencia.costo !== Number(m.costo) && (
                  <button
                    type="button"
                    onClick={() => actualizarMaterial(i, 'costo', String(referencia.costo))}
                    className="mt-0.5 text-xs text-primary hover:underline"
                  >
                    Último precio real: {formatoCLP.format(referencia.costo)} — usar este
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <datalist id="catalogo-materiales">
          {catalogo.map((item) => (
            <option key={item.descripcion} value={item.descripcion} />
          ))}
        </datalist>
        <button type="button" onClick={agregarMaterial} className="mb-3 flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          <Plus size={14} /> Agregar material
        </button>

        <div className="mb-4 rounded-lg bg-gray-50 p-2 text-xs text-gray-700">
          Costo aproximado total: <strong>{formatoCLP.format(costoTotal)}</strong> (mano de obra + materiales)
        </div>

        <Boton type="submit" className="w-full" cargando={guardando} disabled={!esValido}>
          Guardar y asignar cuadrilla
        </Boton>
      </form>
    </Modal>
  )
}
