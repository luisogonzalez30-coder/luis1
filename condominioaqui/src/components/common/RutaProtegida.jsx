import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Spinner from './Spinner'

// Protege rutas de usuarios: exige sesión iniciada y, opcionalmente, un rol específico.
// rolesPermitidos=null significa "cualquier usuario con perfil válido".
export default function RutaProtegida({ children, rolesPermitidos = null }) {
  const { usuario, perfil, cargando } = useAuth()
  const location = useLocation()

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
   )
  }

  if (!usuario || !perfil) {
    return <Navigate to="/login" replace state={{ desde: location.pathname }} />
  }

  if (rolesPermitidos && !rolesPermitidos.includes(perfil.rol)) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center text-gray-500">
        No tienes permiso para acceder a esta sección con el rol "{perfil.rol}".
      </div>
   )
  }

  return children
}
