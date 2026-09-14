import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LogIn, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Boton from '../components/common/Boton'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)
  const { perfil, iniciarSesion } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Navega recién cuando "perfil" está listo en el contexto, no apenas
  // signInWithEmailAndPassword resuelve. AuthContext carga el perfil (rol,
  // area) en un segundo paso asíncrono (onAuthStateChanged -> getDoc)
  // que casi siempre termina DESPUÉS de que el login ya dio "éxito" — navegar
  // ahí mismo era una carrera: RutaProtegida todavía veía perfil=null y
  // rebotaba de vuelta a /login, obligando a un segundo intento para que
  // esta vez sí encontrara el perfil ya cargado.
  useEffect(() => {
    if (perfil) {
      const destino = location.state?.desde || '/dashboard'
      navigate(destino, { replace: true })
    }
  }, [perfil, navigate, location.state])

  async function manejarSubmit(e) {
    e.preventDefault()
    setError(null)
    setCargando(true)
    try {
      await iniciarSesion(email, password)
      // La navegación ocurre en el useEffect de arriba, cuando "perfil" cargue.
    } catch (err) {
      setError(err.message)
      setCargando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form onSubmit={manejarSubmit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-gray-900">Acceso Usuarios</h1>
        <p className="mb-6 text-sm text-gray-500">Administración, Comité y Conserjería</p>

        <label className="mb-1 block text-sm font-medium text-gray-700">Correo</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-lg border border-gray-300 p-2.5"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">Contraseña</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border border-gray-300 p-2.5"
        />

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
       )}

        <Boton type="submit" className="w-full" cargando={cargando}>
          <LogIn size={18} />
          Ingresar
        </Boton>
      </form>
    </div>
 )
}
