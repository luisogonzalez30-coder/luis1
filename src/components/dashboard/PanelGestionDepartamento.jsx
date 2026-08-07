import { useEffect, useState } from 'react'
import { X, User, AlertTriangle, MapPin, Receipt } from 'lucide-react'
import BadgeEstado from '../common/BadgeEstado'
import BadgeGravedad from '../common/BadgeGravedad'
import EnlaceGoogleMaps from '../common/EnlaceGoogleMaps'
import GaleriaFotos from '../common/GaleriaFotos'
import ListaSeguimientos from '../common/ListaSeguimientos'
import Boton from '../common/Boton'
import ModalPresupuesto from './ModalPresupuesto'
import FormularioCierreGasto from '../common/FormularioCierreGasto'
import MapaSeleccionUbicacion from '../ciudadano/MapaSeleccionUbicacion'
import { asignarCuadrilla, marcarResuelto } from '../../services/incidenciasService'
import { suscribirUbicacionesCuadrilla, actualizarUbicacionCuadrilla } from '../../services/ubicacionesCuadrillaService'
import { conTimeout } from '../../utils/timeout'
import { formatearFecha, formatearDuracion } from '../../utils/tiempo'
import { calcularCostoManoObra as costoManoObra } from '../../utils/costeo'

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })

// Panel de gestión para el Jefe de Departamento: a diferencia de PanelAsignacion
// (solo asigna, lo usa el Alcalde) y DetalleTarea (solo resuelve, lo usa Terreno),
// este panel cubre todo el ciclo dentro del departamento del jefe: Pendiente ->
// presupuesto + asigna cuadrilla -> En Proceso -> gasto real + marca resuelto -> Resuelto.
export default function PanelGestionDepartamento({ incidencia, incidencias = [], cuadrillas = [], onCerrar }) {
  const [cuadrilla, setCuadrilla] = useState(incidencia.cuadrilla_asignada || '')
  const [mostrarModalPresupuesto, setMostrarModalPresupuesto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [ubicacionesCuadrilla, setUbicacionesCuadrilla] = useState([])
  const [editandoUbicacion, setEditandoUbicacion] = useState(false)
  const [guardandoUbicacion, setGuardandoUbicacion] = useState(false)

  const trabajadoresAsignados = incidencia.presupuesto_estimado?.trabajadores_asignados || []

  useEffect(() => {
    if (incidencia.estado !== 'En Proceso') return
    const unsubscribe = suscribirUbicacionesCuadrilla(setUbicacionesCuadrilla, incidencia.municipio_id)
    return unsubscribe
  }, [incidencia.municipio_id, incidencia.estado])

  const ubicacionCuadrilla = ubicacionesCuadrilla.find((u) => u.cuadrilla === incidencia.cuadrilla_asignada)

  async function manejarGuardarUbicacion(coordenadas) {
    setGuardandoUbicacion(true)
    try {
      await actualizarUbicacionCuadrilla({
        municipioId: incidencia.municipio_id,
        cuadrilla: incidencia.cuadrilla_asignada,
        coordenadas,
      })
      setEditandoUbicacion(false)
    } catch (err) {
      console.error('[PanelGestionDepartamento] Error al guardar ubicación de cuadrilla:', err)
    } finally {
      setGuardandoUbicacion(false)
    }
  }

  // El botón "Asignar cuadrilla" ya no asigna directo: abre el modal de
  // presupuesto primero. La incidencia solo pasa a "En Proceso" cuando el
  // modal se guarda (manejarGuardarPresupuesto), no antes.
  async function manejarGuardarPresupuesto(presupuestoEstimado) {
    setError(null)
    setGuardando(true)
    try {
      await conTimeout(
        asignarCuadrilla(incidencia, cuadrilla, presupuestoEstimado),
        15000,
        'Esto está tardando demasiado. Revisa tu conexión a internet e intenta nuevamente.'
      )
      setMostrarModalPresupuesto(false)
    } catch (err) {
      console.error('[PanelGestionDepartamento] Error al asignar cuadrilla:', err)
      setError(err.message || 'No se pudo asignar la cuadrilla.')
    } finally {
      setGuardando(false)
    }
  }

  async function manejarResolucion(fotoDespues, comprobante, gastoReal) {
    setError(null)
    setGuardando(true)
    try {
      await conTimeout(
        marcarResuelto(incidencia, fotoDespues, comprobante, gastoReal),
        20000,
        'Esto está tardando demasiado. Revisa tu conexión a internet e intenta nuevamente.'
      )
    } catch (err) {
      console.error('[PanelGestionDepartamento] Error al marcar como resuelto:', err)
      setError(err.message || 'No se pudo completar la incidencia.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    // "fixed" (no "absolute"): alto completo de pantalla y scroll propio, para
    // que el panel no se corte cuando el contenedor del mapa es bajo — ver el
    // mismo cambio en PanelAsignacion.jsx.
    <div className="fixed inset-y-0 right-0 z-[1000] w-full max-w-sm overflow-y-auto border-l border-gray-200 bg-white p-4 shadow-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{incidencia.categoria}</h3>
          <div className="mt-1 flex gap-1.5">
            <BadgeEstado estado={incidencia.estado} />
            <BadgeGravedad nivel={incidencia.nivel_gravedad} />
          </div>
        </div>
        <button onClick={onCerrar} className="rounded-full p-1 hover:bg-gray-100" aria-label="Cerrar">
          <X size={20} />
        </button>
      </div>

      <p className="mt-3 text-sm text-gray-500">{incidencia.direccion_texto || 'Sin dirección de referencia'}</p>
      <EnlaceGoogleMaps coordenadas={incidencia.coordenadas} />

      <p className="mt-2 text-xs text-gray-400">Ingresado: {formatearFecha(incidencia.fecha_creacion)}</p>
      {incidencia.fecha_asignacion && (
        <p className="text-xs text-gray-400">
          Tiempo de reacción: {formatearDuracion(incidencia.fecha_creacion, incidencia.fecha_asignacion)}
        </p>
      )}

      {incidencia.detalles_adicionales && (
        <p className="mt-2 rounded-lg bg-gray-50 p-2 text-sm text-gray-600">{incidencia.detalles_adicionales}</p>
      )}

      {!incidencia.es_anonimo && (incidencia.nombre_ciudadano || incidencia.contacto_ciudadano) && (
        <div className="mt-2 flex items-start gap-2 rounded-lg bg-blue-50 p-2 text-sm text-blue-800">
          <User size={16} className="mt-0.5 shrink-0" />
          <span>
            {incidencia.nombre_ciudadano || 'Sin nombre'}
            {incidencia.contacto_ciudadano && ` · ${incidencia.contacto_ciudadano}`}
          </span>
        </div>
      )}

      <GaleriaFotos urls={incidencia.fotos_antes_urls} alt="Foto reportada por el ciudadano" className="mt-3" />
      <ListaSeguimientos incidenciaId={incidencia.id} />

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {incidencia.estado === 'Pendiente' && (
        <div className="mt-5">
          <label className="mb-1 block text-sm font-medium text-gray-700">Cuadrilla asignada</label>
          {cuadrillas.length === 0 ? (
            <p className="text-sm text-gray-400">
              Tu municipalidad todavía no tiene cuadrillas configuradas. Contacta al administrador.
            </p>
          ) : (
            <select
              value={cuadrilla}
              onChange={(e) => setCuadrilla(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2.5"
            >
              <option value="">Selecciona una cuadrilla</option>
              {cuadrillas.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          <Boton
            className="mt-3 w-full"
            cargando={guardando}
            disabled={!cuadrilla}
            onClick={() => setMostrarModalPresupuesto(true)}
          >
            Asignar cuadrilla
          </Boton>
        </div>
      )}

      {incidencia.estado === 'En Proceso' && (
        <div className="mt-5">
          <p className="text-xs font-medium uppercase text-gray-400">Cuadrilla: {incidencia.cuadrilla_asignada}</p>

          <div className="mt-1">
            {ubicacionCuadrilla?.coordenadas && !editandoUbicacion && (
              <EnlaceGoogleMaps coordenadas={ubicacionCuadrilla.coordenadas} />
            )}
            {!editandoUbicacion && (
              <button
                onClick={() => setEditandoUbicacion(true)}
                className="mt-1 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <MapPin size={12} />
                {ubicacionCuadrilla?.coordenadas ? 'Actualizar ubicación de la cuadrilla' : 'Marcar ubicación de la cuadrilla'}
              </button>
            )}
            {editandoUbicacion && (
              <div className="mt-2">
                <p className="mb-1 text-xs text-gray-500">Toca el mapa donde está trabajando la cuadrilla ahora.</p>
                <MapaSeleccionUbicacion
                  coordenadas={ubicacionCuadrilla?.coordenadas}
                  centroPorDefecto={incidencia.coordenadas}
                  onCambiar={manejarGuardarUbicacion}
                />
                <button
                  onClick={() => setEditandoUbicacion(false)}
                  disabled={guardandoUbicacion}
                  className="mt-1 text-xs text-gray-500 hover:underline"
                >
                  {guardandoUbicacion ? 'Guardando...' : 'Listo'}
                </button>
              </div>
            )}
          </div>

          <div className="mt-3">
            {/* Sin prop "error": ya se muestra en el bloque global de arriba. */}
            <FormularioCierreGasto incidencia={incidencia} guardando={guardando} onResolver={manejarResolucion} />
          </div>
        </div>
      )}

      {incidencia.estado === 'Resuelto' && (
        <div className="mt-5">
          <div className="rounded-xl bg-green-50 p-4 text-center text-green-800">
            Esta incidencia ya fue marcada como resuelta.
          </div>
          <div className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
            {trabajadoresAsignados.length > 0 && (
              <p>
                Personal ({trabajadoresAsignados.length}): {trabajadoresAsignados.map((t) => t.nombre).join(', ')}
              </p>
            )}
            {incidencia.gasto_real && (
              <>
                <p>Horas reales: {incidencia.gasto_real.horas_reales}h</p>
                <p>
                  Costo mano de obra:{' '}
                  {formatoCLP.format(
                    incidencia.gasto_real.costo_mano_obra ??
                      costoManoObra(trabajadoresAsignados, incidencia.gasto_real.horas_reales)
                  )}
                </p>
                {incidencia.gasto_real.materiales_usados?.length > 0 ? (
                  <div className="mt-1">
                    <p className="font-medium text-gray-700">Materiales usados:</p>
                    <ul className="ml-3 list-disc">
                      {incidencia.gasto_real.materiales_usados.map((m, i) => (
                        <li key={i}>
                          {m.descripcion} — {formatoCLP.format(m.costo)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p>Materiales usados: ninguno reportado</p>
                )}
                {incidencia.gasto_real.comprobante_url && (
                  <a
                    href={incidencia.gasto_real.comprobante_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 flex items-center gap-1 text-primary hover:underline"
                  >
                    <Receipt size={12} /> Ver comprobante
                  </a>
                )}
                <p className="mt-1 border-t border-gray-200 pt-1 text-sm font-semibold text-gray-900">
                  Costo final total: {formatoCLP.format(incidencia.gasto_real.costo_final)}
                </p>
                {incidencia.gasto_real.requiere_revision && (
                  <div className="mt-2 rounded-lg bg-orange-50 p-2 text-orange-800">
                    <p className="flex items-center gap-1 font-medium">
                      <AlertTriangle size={12} /> Se salió del presupuesto — revisar
                    </p>
                    {incidencia.gasto_real.justificacion && <p className="mt-0.5">"{incidencia.gasto_real.justificacion}"</p>}
                  </div>
                )}
                {incidencia.gasto_real.cerrado_por && (
                  <p className="mt-1 text-gray-400">Cerrado por: {incidencia.gasto_real.cerrado_por}</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {mostrarModalPresupuesto && (
        <ModalPresupuesto
          municipioId={incidencia.municipio_id}
          departamento={incidencia.departamento}
          categoria={incidencia.categoria}
          incidencias={incidencias}
          guardando={guardando}
          onCancelar={() => setMostrarModalPresupuesto(false)}
          onGuardar={manejarGuardarPresupuesto}
        />
      )}
    </div>
  )
}
