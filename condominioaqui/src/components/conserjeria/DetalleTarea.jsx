import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import BadgeEstado from '../common/BadgeEstado'
import EtiquetaUbicacion from '../common/EtiquetaUbicacion'
import GaleriaFotos from '../common/GaleriaFotos'
import ListaSeguimientos from '../common/ListaSeguimientos'
import FormularioCierreGasto from '../common/FormularioCierreGasto'
import { marcarResuelto } from '../../services/solicitudesService'
import { conTimeout } from '../../utils/timeout'
import { formatearFecha } from '../../utils/tiempo'
import { etiquetaCategoria } from '../../utils/categorias'

export default function DetalleTarea({ solicitud, onVolver }) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [resuelto, setResuelto] = useState(solicitud.estado === 'Resuelto')

  const trabajadoresAsignados = solicitud.presupuesto_estimado?.trabajadores_asignados || []

  async function manejarResolucion(fotoDespues, comprobante, gastoReal) {
    setError(null)
    setEnviando(true)
    try {
      await conTimeout(
        marcarResuelto(solicitud, fotoDespues, comprobante, gastoReal),
        20000,
        'Esto está tardando demasiado. Revisa tu conexión a internet e intenta nuevamente.'
     )
      setResuelto(true)
    } catch (err) {
      console.error('[DetalleTarea] Error al marcar como resuelto:', err)
      setError(err.message || 'No se pudo completar la solicitud. Intenta nuevamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex h-full flex-col p-4">
      <button onClick={onVolver} className="mb-4 flex items-center gap-1 text-sm text-gray-500">
        <ChevronLeft size={18} /> Volver a mis tareas
      </button>

      <div className="flex items-start justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{etiquetaCategoria(solicitud.categoria)}</h2>
        <BadgeEstado estado={resuelto ? 'Resuelto' : solicitud.estado} />
      </div>

      <EtiquetaUbicacion ubicacion={solicitud.ubicacion} referencia={solicitud.direccion_texto} className="mt-1" />

      <p className="mt-2 text-xs text-gray-400">Ingresado: {formatearFecha(solicitud.fecha_creacion)}</p>
      {trabajadoresAsignados.length > 0 && (
        <p className="text-xs text-gray-400">
          Equipo asignado: {trabajadoresAsignados.map((t) => t.nombre).join(', ')}
        </p>
     )}

      {solicitud.detalles_adicionales && (
        <p className="mt-2 rounded-lg bg-gray-50 p-2 text-sm text-gray-600">{solicitud.detalles_adicionales}</p>
     )}

      {solicitud.fotos_antes_urls?.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 text-xs font-medium uppercase text-gray-400">Foto reportada</p>
          <GaleriaFotos urls={solicitud.fotos_antes_urls} alt="Antes" />
        </div>
     )}

      <ListaSeguimientos solicitudId={solicitud.id} />

      {resuelto ? (
        <div className="mt-6 rounded-xl bg-green-50 p-4 text-center text-green-800">
          Esta solicitud ya fue marcada como resuelta. ¡Buen trabajo!
        </div>
     ) : (
        <div className="mt-6">
          <FormularioCierreGasto solicitud={solicitud} guardando={enviando} error={error} onResolver={manejarResolucion} />
        </div>
     )}
    </div>
 )
}
