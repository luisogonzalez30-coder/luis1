import { useEffect, useState } from 'react'
import { suscribirIncidencias } from '../services/incidenciasService'
import { useMunicipio } from '../hooks/useMunicipio'
import TarjetaTarea from '../components/cuadrilla/TarjetaTarea'
import DetalleTarea from '../components/cuadrilla/DetalleTarea'
import Spinner from '../components/common/Spinner'
import { useAuth } from '../context/AuthContext'

export default function CuadrillaPage() {
  const [tareas, setTareas] = useState([])
  const [tareaSeleccionadaId, setTareaSeleccionadaId] = useState(null)
  const { perfil, cerrarSesion } = useAuth()
  const { municipio, cargando, noEncontrado } = useMunicipio(perfil?.municipio_id)

  useEffect(() => {
    if (!municipio) return
    const unsubscribe = suscribirIncidencias(setTareas, 'En Proceso', municipio.id)
    return unsubscribe
  }, [municipio])

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (noEncontrado) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center text-gray-500">
        Tu usuario no tiene una municipalidad válida asociada (municipio_id). Contacta al administrador.
      </div>
    )
  }

  const tareaSeleccionada = tareas.find((t) => t.id === tareaSeleccionadaId)

  if (tareaSeleccionada) {
    return <DetalleTarea incidencia={tareaSeleccionada} onVolver={() => setTareaSeleccionadaId(null)} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between bg-white px-4 py-3 shadow-sm">
        <div>
          <h1 className="font-bold text-gray-900">Mis Tareas — {municipio.nombre}</h1>
          {perfil && <p className="text-xs text-gray-400">{perfil.nombre}</p>}
        </div>
        <button onClick={cerrarSesion} className="text-sm text-primary hover:underline">Cerrar sesión</button>
      </header>

      <div className="flex flex-col gap-3 p-4">
        {tareas.length === 0 && (
          <p className="mt-8 text-center text-sm text-gray-400">No tienes tareas asignadas por ahora.</p>
        )}
        {tareas.map((t) => (
          <TarjetaTarea key={t.id} incidencia={t} onClick={() => setTareaSeleccionadaId(t.id)} />
        ))}
      </div>
    </div>
  )
}
