import { useState } from 'react'
import { X, User } from 'lucide-react'
import BadgeEstado from '../common/BadgeEstado'
import BadgeGravedad from '../common/BadgeGravedad'
import EnlaceGoogleMaps from '../common/EnlaceGoogleMaps'
import GaleriaFotos from '../common/GaleriaFotos'
import Boton from '../common/Boton'
import { asignarCuadrilla } from '../../services/incidenciasService'
import { conTimeout } from '../../utils/timeout'

export default function PanelAsignacion({ incidencia, cuadrillas = [], onCerrar }) {
  const [cuadrilla, setCuadrilla] = useState(incidencia.cuadrilla_asignada || '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  async function manejarAsignar() {
    setError(null)
    setGuardando(true)
    try {
      await conTimeout(
        asignarCuadrilla(incidencia, cuadrilla),
        15000,
        'Esto está tardando demasiado. Revisa tu conexión a internet e intenta nuevamente.'
      )
    } catch (err) {
      console.error('[PanelAsignacion] Error al asignar cuadrilla:', err)
      setError(err.message || 'No se pudo asignar la cuadrilla.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="absolute inset-y-0 right-0 z-[1000] w-full max-w-sm border-l border-gray-200 bg-white p-4 shadow-xl">
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
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <Boton
        className="mt-4 w-full"
        cargando={guardando}
        disabled={!cuadrilla || incidencia.estado === 'Resuelto'}
        onClick={manejarAsignar}
      >
        {incidencia.estado === 'Pendiente' ? 'Asignar cuadrilla' : 'Actualizar asignación'}
      </Boton>
    </div>
  )
}
