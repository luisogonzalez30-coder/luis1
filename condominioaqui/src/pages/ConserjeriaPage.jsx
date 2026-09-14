import { useEffect, useState } from 'react'
import { suscribirSolicitudes } from '../services/solicitudesService'
import { useCondominio } from '../hooks/useCondominio'
import TarjetaTarea from '../components/conserjeria/TarjetaTarea'
import DetalleTarea from '../components/conserjeria/DetalleTarea'
import Spinner from '../components/common/Spinner'
import { useAuth } from '../context/AuthContext'

export default function ConserjeriaPage() {
  const [tareas, setTareas] = useState([])
  const [tareaSeleccionadaId, setTareaSeleccionadaId] = useState(null)
  const { perfil, cerrarSesion } = useAuth()
  const { condominio, cargando, noEncontrado } = useCondominio(perfil?.condominio_id)

  useEffect(() => {
    if (!condominio) return
    const unsubscribe = suscribirSolicitudes(setTareas, 'En Proceso', condominio.id)
    return unsubscribe
  }, [condominio])

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
        Tu usuario no tiene un condominio válida asociada (condominio_id). Contacta al administrador.
      </div>
   )
  }

  const tareaSeleccionada = tareas.find((t) => t.id === tareaSeleccionadaId)

  if (tareaSeleccionada) {
    return <DetalleTarea solicitud={tareaSeleccionada} onVolver={() => setTareaSeleccionadaId(null)} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between bg-white px-4 py-3 shadow-sm">
        <div>
          <h1 className="font-bold text-gray-900">Mis Tareas — {condominio.nombre}</h1>
          {perfil && <p className="text-xs text-gray-400">{perfil.nombre}</p>}
        </div>
        <button onClick={cerrarSesion} className="text-sm text-primary hover:underline">Cerrar sesión</button>
      </header>

      <div className="flex flex-col gap-3 p-4">
        {tareas.length === 0 && (
          <p className="mt-8 text-center text-sm text-gray-400">No tienes tareas asignadas por ahora.</p>
       )}
        {tareas.map((t) => (
          <TarjetaTarea key={t.id} solicitud={t} onClick={() => setTareaSeleccionadaId(t.id)} />
       ))}
      </div>
    </div>
 )
}
