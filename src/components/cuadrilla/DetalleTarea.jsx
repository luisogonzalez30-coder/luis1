import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import BadgeEstado from '../common/BadgeEstado'
import EnlaceGoogleMaps from '../common/EnlaceGoogleMaps'
import GaleriaFotos from '../common/GaleriaFotos'
import ListaSeguimientos from '../common/ListaSeguimientos'
import FormularioCierreGasto from '../common/FormularioCierreGasto'
import { marcarResuelto } from '../../services/incidenciasService'
import { conTimeout } from '../../utils/timeout'
import { formatearFecha } from '../../utils/tiempo'

export default function DetalleTarea({ incidencia, onVolver }) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [resuelto, setResuelto] = useState(incidencia.estado === 'Resuelto')

  const trabajadoresAsignados = incidencia.presupuesto_estimado?.trabajadores_asignados || []

  async function manejarResolucion(fotoDespues, comprobante, gastoReal) {
    setError(null)
    setEnviando(true)
    try {
      await conTimeout(
        marcarResuelto(incidencia, fotoDespues, comprobante, gastoReal),
        20000,
        'Esto está tardando demasiado. Revisa tu conexión a internet e intenta nuevamente.'
      )
      setResuelto(true)
    } catch (err) {
      console.error('[DetalleTarea] Error al marcar como resuelto:', err)
      setError(err.message || 'No se pudo completar la incidencia. Intenta nuevamente.')
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
        <h2 className="text-lg font-semibold text-gray-900">{incidencia.categoria}</h2>
        <BadgeEstado estado={resuelto ? 'Resuelto' : incidencia.estado} />
      </div>

      <p className="mt-1 text-sm text-gray-500">{incidencia.direccion_texto || 'Sin dirección de referencia'}</p>
      <EnlaceGoogleMaps coordenadas={incidencia.coordenadas} />

      <p className="mt-2 text-xs text-gray-400">Ingresado: {formatearFecha(incidencia.fecha_creacion)}</p>
      {trabajadoresAsignados.length > 0 && (
        <p className="text-xs text-gray-400">
          Equipo asignado: {trabajadoresAsignados.map((t) => t.nombre).join(', ')}
        </p>
      )}

      {incidencia.detalles_adicionales && (
        <p className="mt-2 rounded-lg bg-gray-50 p-2 text-sm text-gray-600">{incidencia.detalles_adicionales}</p>
      )}

      {incidencia.fotos_antes_urls?.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 text-xs font-medium uppercase text-gray-400">Foto reportada</p>
          <GaleriaFotos urls={incidencia.fotos_antes_urls} alt="Antes" />
        </div>
      )}

      <ListaSeguimientos incidenciaId={incidencia.id} />

      {resuelto ? (
        <div className="mt-6 rounded-xl bg-green-50 p-4 text-center text-green-800">
          Esta incidencia ya fue marcada como resuelta. ¡Buen trabajo!
        </div>
      ) : (
        <div className="mt-6">
          <FormularioCierreGasto incidencia={incidencia} guardando={enviando} error={error} onResolver={manejarResolucion} />
        </div>
      )}
    </div>
  )
}
