import { useEffect, useState } from 'react'
import { X, User, AlertTriangle, Receipt } from 'lucide-react'
import BadgeEstado from '../common/BadgeEstado'
import BadgeGravedad from '../common/BadgeGravedad'
import EtiquetaUbicacion from '../common/EtiquetaUbicacion'
import GaleriaFotos from '../common/GaleriaFotos'
import ListaSeguimientos from '../common/ListaSeguimientos'
import Boton from '../common/Boton'
import ModalPresupuesto from './ModalPresupuesto'
import FormularioCierreGasto from '../common/FormularioCierreGasto'
import { asignarEquipo, marcarResuelto } from '../../services/solicitudesService'
import { conTimeout } from '../../utils/timeout'
import { formatearFecha, formatearDuracion } from '../../utils/tiempo'
import { calcularCostoManoObra as costoManoObra } from '../../utils/costeo'
import { etiquetaCategoria } from '../../utils/categorias'

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })

// Panel de gestión para el Jefe de Area: a diferencia de PanelAsignacion
// (solo asigna, lo usa el Administrador) y DetalleTarea (solo resuelve, lo usa Terreno),
// este panel cubre todo el ciclo dentro del área del jefe: Pendiente ->
// presupuesto + asigna equipo -> En Proceso -> gasto real + marca resuelto -> Resuelto.
export default function PanelGestionArea({ solicitud, solicitudes = [], equipos = [], onCerrar }) {
  const [equipo, setEquipo] = useState(solicitud.equipo_asignado || '')
  const [mostrarModalPresupuesto, setMostrarModalPresupuesto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const trabajadoresAsignados = solicitud.presupuesto_estimado?.trabajadores_asignados || []

  // El botón "Asignar equipo" ya no asigna directo: abre el modal de
  // presupuesto primero. La solicitud solo pasa a "En Proceso" cuando el
  // modal se guarda (manejarGuardarPresupuesto), no antes.
  async function manejarGuardarPresupuesto(presupuestoEstimado) {
    setError(null)
    setGuardando(true)
    try {
      await conTimeout(
        asignarEquipo(solicitud, equipo, presupuestoEstimado),
        15000,
        'Esto está tardando demasiado. Revisa tu conexión a internet e intenta nuevamente.'
     )
      setMostrarModalPresupuesto(false)
    } catch (err) {
      console.error('[PanelGestionArea] Error al asignar equipo:', err)
      setError(err.message || 'No se pudo asignar el equipo.')
    } finally {
      setGuardando(false)
    }
  }

  async function manejarResolucion(fotoDespues, comprobante, gastoReal) {
    setError(null)
    setGuardando(true)
    try {
      await conTimeout(
        marcarResuelto(solicitud, fotoDespues, comprobante, gastoReal),
        20000,
        'Esto está tardando demasiado. Revisa tu conexión a internet e intenta nuevamente.'
     )
    } catch (err) {
      console.error('[PanelGestionArea] Error al marcar como resuelto:', err)
      setError(err.message || 'No se pudo completar la solicitud.')
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
          <h3 className="text-lg font-semibold text-gray-900">{etiquetaCategoria(solicitud.categoria)}</h3>
          <div className="mt-1 flex gap-1.5">
            <BadgeEstado estado={solicitud.estado} />
            <BadgeGravedad nivel={solicitud.nivel_gravedad} />
          </div>
        </div>
        <button onClick={onCerrar} className="rounded-full p-1 hover:bg-gray-100" aria-label="Cerrar">
          <X size={20} />
        </button>
      </div>

      <EtiquetaUbicacion ubicacion={solicitud.ubicacion} referencia={solicitud.direccion_texto} className="mt-3" />

      <p className="mt-2 text-xs text-gray-400">Ingresado: {formatearFecha(solicitud.fecha_creacion)}</p>
      {solicitud.fecha_asignacion && (
        <p className="text-xs text-gray-400">
          Tiempo de reacción: {formatearDuracion(solicitud.fecha_creacion, solicitud.fecha_asignacion)}
        </p>
     )}

      {solicitud.detalles_adicionales && (
        <p className="mt-2 rounded-lg bg-gray-50 p-2 text-sm text-gray-600">{solicitud.detalles_adicionales}</p>
     )}

      {!solicitud.es_anonimo && (solicitud.nombre_residente || solicitud.contacto_residente) && (
        <div className="mt-2 flex items-start gap-2 rounded-lg bg-blue-50 p-2 text-sm text-blue-800">
          <User size={16} className="mt-0.5 shrink-0" />
          <span>
            {solicitud.nombre_residente || 'Sin nombre'}
            {solicitud.contacto_residente && ` · ${solicitud.contacto_residente}`}
          </span>
        </div>
     )}

      <GaleriaFotos urls={solicitud.fotos_antes_urls} alt="Foto reportada por el residente" className="mt-3" />
      <ListaSeguimientos solicitudId={solicitud.id} />

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
     )}

      {solicitud.estado === 'Pendiente' && (
        <div className="mt-5">
          <label className="mb-1 block text-sm font-medium text-gray-700">Equipo asignada</label>
          {equipos.length === 0 ? (
            <p className="text-sm text-gray-400">
              Tu condominio todavía no tiene equipos configuradas. Contacta al administrador.
            </p>
         ) : (
            <select
              value={equipo}
              onChange={(e) => setEquipo(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2.5"
            >
              <option value="">Selecciona un equipo</option>
              {equipos.map((c) => (
                <option key={c} value={c}>{c}</option>
             ))}
            </select>
         )}

          <Boton
            className="mt-3 w-full"
            cargando={guardando}
            disabled={!equipo}
            onClick={() => setMostrarModalPresupuesto(true)}
          >
            Asignar equipo
          </Boton>
        </div>
     )}

      {solicitud.estado === 'En Proceso' && (
        <div className="mt-5">
          <p className="text-xs font-medium uppercase text-gray-400">Equipo: {solicitud.equipo_asignado}</p>

        </div>
     )}

      {solicitud.estado === 'Resuelto' && (
        <div className="mt-5">
          <div className="rounded-xl bg-green-50 p-4 text-center text-green-800">
            Esta solicitud ya fue marcada como resuelta.
          </div>
          <div className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
            {trabajadoresAsignados.length > 0 && (
              <p>
                Personal ({trabajadoresAsignados.length}): {trabajadoresAsignados.map((t) => t.nombre).join(', ')}
              </p>
           )}
            {solicitud.gasto_real && (
              <>
                <p>Horas reales: {solicitud.gasto_real.horas_reales}h</p>
                <p>
                  Costo mano de obra:{' '}
                  {formatoCLP.format(
                    solicitud.gasto_real.costo_mano_obra ??
                      costoManoObra(trabajadoresAsignados, solicitud.gasto_real.horas_reales)
                 )}
                </p>
                {solicitud.gasto_real.materiales_usados?.length > 0 ? (
                  <div className="mt-1">
                    <p className="font-medium text-gray-700">Materiales usados:</p>
                    <ul className="ml-3 list-disc">
                      {solicitud.gasto_real.materiales_usados.map((m, i) => (
                        <li key={i}>
                          {m.descripcion} — {formatoCLP.format(m.costo)}
                        </li>
                     ))}
                    </ul>
                  </div>
               ) : (
                  <p>Materiales usados: ninguno reportado</p>
               )}
                {solicitud.gasto_real.comprobante_url && (
                  <a
                    href={solicitud.gasto_real.comprobante_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 flex items-center gap-1 text-primary hover:underline"
                  >
                    <Receipt size={12} /> Ver comprobante
                  </a>
               )}
                <p className="mt-1 border-t border-gray-200 pt-1 text-sm font-semibold text-gray-900">
                  Costo final total: {formatoCLP.format(solicitud.gasto_real.costo_final)}
                </p>
                {solicitud.gasto_real.requiere_revision && (
                  <div className="mt-2 rounded-lg bg-orange-50 p-2 text-orange-800">
                    <p className="flex items-center gap-1 font-medium">
                      <AlertTriangle size={12} /> Se salió del presupuesto — revisar
                    </p>
                    {solicitud.gasto_real.justificacion && <p className="mt-0.5">"{solicitud.gasto_real.justificacion}"</p>}
                  </div>
               )}
                {solicitud.gasto_real.cerrado_por && (
                  <p className="mt-1 text-gray-400">Cerrado por: {solicitud.gasto_real.cerrado_por}</p>
               )}
              </>
           )}
          </div>
        </div>
     )}

      {mostrarModalPresupuesto && (
        <ModalPresupuesto
          condominioId={solicitud.condominio_id}
          area={solicitud.area}
          categoria={solicitud.categoria}
          solicitudes={solicitudes}
          guardando={guardando}
          onCancelar={() => setMostrarModalPresupuesto(false)}
          onGuardar={manejarGuardarPresupuesto}
        />
     )}
    </div>
 )
}
