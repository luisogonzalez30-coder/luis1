import { useState } from 'react'
import { ChevronLeft, Camera, AlertTriangle } from 'lucide-react'
import BadgeEstado from '../common/BadgeEstado'
import EnlaceGoogleMaps from '../common/EnlaceGoogleMaps'
import Boton from '../common/Boton'
import { marcarResuelto } from '../../services/incidenciasService'
import { conTimeout } from '../../utils/timeout'

export default function DetalleTarea({ incidencia, onVolver }) {
  const [fotoDespues, setFotoDespues] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [resuelto, setResuelto] = useState(incidencia.estado === 'Resuelto')

  const previewUrl = fotoDespues ? URL.createObjectURL(fotoDespues) : null

  async function manejarResolucion() {
    setError(null)
    setEnviando(true)
    try {
      await conTimeout(
        marcarResuelto(incidencia, fotoDespues),
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

      {incidencia.detalles_adicionales && (
        <p className="mt-2 rounded-lg bg-gray-50 p-2 text-sm text-gray-600">{incidencia.detalles_adicionales}</p>
      )}

      {incidencia.foto_antes_url && (
        <div className="mt-4">
          <p className="mb-1 text-xs font-medium uppercase text-gray-400">Foto reportada</p>
          <img src={incidencia.foto_antes_url} alt="Antes" className="max-h-56 w-full rounded-xl object-cover" />
        </div>
      )}

      {resuelto ? (
        <div className="mt-6 rounded-xl bg-green-50 p-4 text-center text-green-800">
          Esta incidencia ya fue marcada como resuelta. ¡Buen trabajo!
        </div>
      ) : (
        <div className="mt-6">
          <p className="mb-1 text-xs font-medium uppercase text-gray-400">Foto del trabajo terminado (opcional)</p>

          {previewUrl ? (
            <img src={previewUrl} alt="Después" className="mb-3 max-h-56 w-full rounded-xl object-cover" />
          ) : (
            <label className="mb-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-8 text-gray-500">
              <Camera size={28} />
              <span className="text-sm font-medium">Subir foto de término</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setFotoDespues(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
          )}

          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Boton className="w-full" cargando={enviando} onClick={manejarResolucion}>
            Marcar como Resuelto
          </Boton>
        </div>
      )}
    </div>
  )
}
