import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, TrendingUp, AlertTriangle } from 'lucide-react'
import Modal from '../common/Modal'
import Boton from '../common/Boton'
import { suscribirTrabajadores } from '../../services/trabajadoresService'
import { construirCatalogoMateriales, buscarPrecioReferencia, promedioHistoricoPorCategoria } from '../../utils/catalogoMateriales'
import { evaluarDesviacion } from '../../utils/costeo'

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
  const [justificacion, setJustificacion] = useState('')
  // "No aplica": hay trabajos donde el costo no se puede estimar de antemano
  // —una filtración que hay que abrir para saber qué se rompió, un árbol caído
  // que no se sabe si necesita camión— y obligar a inventar una cifra es peor
  // que no tenerla: ese número inventado después se promedia con los reales y
  // ensucia toda la comparación histórica. Con esto se asigna la cuadrilla
  // igual y el presupuesto queda explícitamente sin estimar.
  const [sinPresupuesto, setSinPresupuesto] = useState(false)
  const [motivoSinPresupuesto, setMotivoSinPresupuesto] = useState('')

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

  // Mismo control que en el cierre real (FormularioCierreGasto.jsx), pero un
  // paso antes: si ESTE presupuesto ya se aleja mucho del promedio histórico
  // de la categoría, después nada se va a ver "fuera de rango" al cerrar,
  // aunque el gasto real termine siendo absurdo — el presupuesto inflado se
  // vuelve la nueva "normalidad" contra la que se compara. No bloquea (puede
  // ser un caso legítimamente más grande o complejo), pero exige decir por qué.
  // Sin cifra que comparar no hay desviación posible: se pasan ceros para que
  // evaluarDesviacion devuelva false en vez de exigir una justificación que no
  // tendría sentido pedir.
  const { requiereRevision, horasDesviadas, costoDesviado } = evaluarDesviacion({
    horasEstimadas: sinPresupuesto ? 0 : promedioCategoria?.horas || 0,
    costoAprox: sinPresupuesto ? 0 : promedioCategoria?.costo || 0,
    horasReales: sinPresupuesto ? 0 : Number(form.horas_estimadas) || 0,
    costoTotal: sinPresupuesto ? 0 : costoTotal,
  })

  // Con "no aplica" lo único que sigue siendo obligatorio es la cuadrilla: es
  // lo que de verdad hace falta para que el trabajo salga a terreno. Las horas
  // quedan opcionales porque un trabajo de alcance desconocido tampoco tiene
  // duración conocida, y exigirlas devolvería el mismo problema del número
  // inventado.
  const esValido = sinPresupuesto
    ? seleccionados.length > 0
    : seleccionados.length > 0 &&
      Number(form.horas_estimadas) > 0 &&
      !materialesIncompletos &&
      (!requiereRevision || justificacion.trim().length > 0)

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
      horas_estimadas: Number(form.horas_estimadas) || 0,
      // Con "no aplica" los montos van en null, no en 0. Un 0 significa "este
      // trabajo no cuesta nada", que es una afirmación falsa y además se
      // promediaría como tal; null significa "no se estimó", que es la verdad.
      // evaluarDesviacion y firestore.rules ya tratan la ausencia de cifra como
      // "no hay contra qué comparar" (ambos exigen costo_aprox > 0), así que no
      // hace falta tocar nada más.
      presupuesto_no_aplica: sinPresupuesto,
      materiales_estimados: sinPresupuesto
        ? []
        : materialesValidos.map((m) => ({ descripcion: m.descripcion.trim(), costo: Number(m.costo) })),
      costo_materiales_estimado: sinPresupuesto ? null : costoMateriales,
      costo_aprox: sinPresupuesto ? null : costoTotal,
      requiere_revision: sinPresupuesto ? false : requiereRevision,
      justificacion: sinPresupuesto ? null : justificacion.trim() || null,
      motivo_sin_presupuesto: sinPresupuesto ? motivoSinPresupuesto.trim() || null : null,
    })
  }

  return (
    <Modal titulo="Presupuesto estimado" onCerrar={onCancelar}>
      <p className="mb-3 text-sm text-tinta-suave">
        Completa esto antes de asignar la cuadrilla — el ticket pasa a "En Proceso" recién cuando guardes.
      </p>

      {promedioCategoria && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-slate-50 p-2 text-xs text-tinta">
          <TrendingUp size={14} className="mt-0.5 shrink-0" />
          <span>
            Los últimos {promedioCategoria.muestras} trabajos de esta categoría costaron en promedio{' '}
            <strong>{formatoCLP.format(promedioCategoria.costo)}</strong> y tomaron {promedioCategoria.horas.toFixed(1)}h.
          </span>
        </div>
      )}

      <form onSubmit={manejarSubmit}>
        <label className="mb-1 block text-sm font-medium text-tinta">
          Personal asignado {seleccionados.length > 0 && `(${seleccionados.length})`}
        </label>
        {trabajadores.length === 0 ? (
          <p className="mb-3 text-sm text-tinta-tenue">
            Tu departamento todavía no tiene trabajadores cargados — agrégalos primero en "Mi equipo".
          </p>
        ) : (
          <div className="mb-3 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-borde p-2">
            {trabajadores.map((t) => (
              <label key={t.id} className="flex items-center gap-2 rounded p-1 text-sm hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={seleccionados.includes(t.id)}
                  onChange={() => alternarSeleccion(t.id)}
                />
                <span className="flex-1">{t.nombre} <span className="text-tinta-tenue">— {t.cargo}</span></span>
                <span className="text-xs text-tinta-tenue">${(t.tarifa_hora || 0).toLocaleString('es-CL')}/h</span>
              </label>
            ))}
          </div>
        )}

        <label className="toque mb-3 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm ring-1 ring-borde">
          <input
            type="checkbox"
            checked={sinPresupuesto}
            onChange={(e) => setSinPresupuesto(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium text-tinta-fuerte">N/A — no se puede estimar el costo</span>
            <span className="mt-0.5 block text-xs text-tinta-suave">
              Para cuando todavía no se sabe el alcance del trabajo. La cuadrilla se asigna igual y el
              presupuesto queda sin estimar, en vez de anotar una cifra inventada.
            </span>
          </span>
        </label>

        {sinPresupuesto && (
          <div className="mb-3 rounded-lg bg-blue-50 p-2 text-xs text-blue-800">
            Este trabajo no va a entrar en las comparaciones de costo ni en el promedio de la categoría.
            El gasto real se registra igual al cerrarlo.
          </div>
        )}

        <label className="mb-1 block text-sm font-medium text-tinta">
          Horas estimadas {sinPresupuesto && <span className="font-normal text-tinta-tenue">(opcional)</span>}
        </label>
        <input
          type="number"
          min="1"
          value={form.horas_estimadas}
          onChange={(e) => setForm((f) => ({ ...f, horas_estimadas: e.target.value }))}
          className="mb-3 w-full rounded-lg border border-borde p-2.5"
        />

        {!sinPresupuesto && costoManoObra > 0 && (
          <p className="mb-3 rounded-lg bg-blue-50 p-2 text-xs text-blue-800">
            Costo de mano de obra (calculado): <strong>{formatoCLP.format(costoManoObra)}</strong>
          </p>
        )}

        {!sinPresupuesto && (
        <>
        <label className="mb-1 block text-sm font-medium text-tinta">Materiales estimados</label>
        <p className="mb-2 text-xs text-tinta-tenue">
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
                    className="flex-1 rounded-lg border border-borde p-2 text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="$"
                    value={m.costo}
                    onChange={(e) => actualizarMaterial(i, 'costo', e.target.value)}
                    className="w-24 rounded-lg border border-borde p-2 text-sm"
                  />
                  {materiales.length > 1 && (
                    <button
                      type="button"
                      onClick={() => quitarMaterial(i)}
                      className="shrink-0 text-tinta-tenue hover:text-estado-critico"
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

        <div className="mb-4 rounded-lg bg-slate-50 p-2 text-xs text-tinta">
          Costo aproximado total: <strong>{formatoCLP.format(costoTotal)}</strong> (mano de obra + materiales)
        </div>
        </>
        )}

        {sinPresupuesto && (
          <>
            <label className="mb-1 block text-sm font-medium text-tinta">
              Por qué no se puede estimar <span className="font-normal text-tinta-tenue">(opcional)</span>
            </label>
            <textarea
              value={motivoSinPresupuesto}
              onChange={(e) => setMotivoSinPresupuesto(e.target.value)}
              rows={2}
              className="mb-4 w-full rounded-lg border border-borde p-2 text-sm"
              placeholder="Ej: hay que abrir el pavimento para saber qué se rompió"
            />
          </>
        )}

        {requiereRevision && (
          <div className="mb-4 rounded-lg bg-orange-50 p-3 text-xs text-orange-800">
            <p className="mb-1 flex items-center gap-1 font-medium">
              <AlertTriangle size={14} /> Esto se aleja bastante del promedio histórico
            </p>
            {horasDesviadas && <p>Las horas estimadas superan bastante el promedio de esta categoría.</p>}
            {costoDesviado && <p>El costo total estimado supera bastante el promedio de esta categoría.</p>}
            <label className="mb-1 mt-2 block font-medium text-orange-900">Explica por qué este trabajo va a costar más de lo habitual</label>
            <textarea
              value={justificacion}
              onChange={(e) => setJustificacion(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-orange-200 p-2 text-xs"
              placeholder="Ej: hay que reemplazar todo el tramo de vereda, no solo un parche"
            />
          </div>
        )}

        <Boton type="submit" className="w-full" cargando={guardando} disabled={!esValido}>
          Guardar y asignar cuadrilla
        </Boton>
      </form>
    </Modal>
  )
}
