import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Search, LogIn, ArrowRight } from 'lucide-react'
import { restaurarTemaPorDefecto } from '../utils/tema'

// Página neutra en "/", pensada como "hub" con un solo link fácil de compartir
// (flyer, WhatsApp, etc.) que sirve tanto para residentes como para usuarios.
// El botón "Reportar" apunta directo a "/demo" — hoy es la única condominio
// activa. Si en el futuro se suman más condominios, este botón debería
// volver a ser un selector de condominio en vez de un link fijo (el formulario
// residente en sí sigue viviendo en "/:condominioSlug", eso no cambió).
const ENLACES = [
  {
    to: '/demo',
    icono: MapPin,
    titulo: 'Reportar un problema',
    descripcion: 'Filtraciones, ascensores, ruidos, luces quemadas — sin crear cuenta ni instalar nada.',
  },
  {
    to: '/estado',
    icono: Search,
    titulo: '¿Ya reportaste? Consulta tu ticket',
    descripcion: 'Revisa el estado de un reporte con el número que recibiste.',
  },
  {
    to: '/login',
    icono: LogIn,
    titulo: 'Acceso del equipo',
    descripcion: 'Panel del condominio — Administración, Comité y Conserjería.',
  },
]

export default function LandingPage() {
  useEffect(() => {
    restaurarTemaPorDefecto()
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 px-6 py-10 text-center">
      <div className="flex flex-col items-center gap-2">
        <MapPin size={40} className="text-primary" />
        <h1 className="text-xl font-bold text-gray-900">TuCondoAquí</h1>
        <p className="max-w-sm text-sm text-gray-500">Condominio Demo</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        {ENLACES.map(({ to, icono: Icono, titulo, descripcion }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-primary"
          >
            <Icono size={22} className="shrink-0 text-primary" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">{titulo}</p>
              <p className="text-xs text-gray-500">{descripcion}</p>
            </div>
            <ArrowRight size={18} className="shrink-0 text-gray-300" />
          </Link>
       ))}
      </div>
    </div>
 )
}
