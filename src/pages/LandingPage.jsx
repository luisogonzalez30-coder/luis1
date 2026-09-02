import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Search, LogIn, ArrowRight } from 'lucide-react'
import { restaurarTemaPorDefecto } from '../utils/tema'

// Página neutra en "/", pensada como "hub" con un solo link fácil de compartir
// (flyer, WhatsApp, etc.) que sirve tanto para vecinos como para funcionarios.
// El botón "Reportar" apunta directo a "/demo" — hoy es la única municipalidad
// activa. Si en el futuro se suman más municipalidades, este botón debería
// volver a ser un selector de comuna en vez de un link fijo (el formulario
// ciudadano en sí sigue viviendo en "/:municipioSlug", eso no cambió).
const ENLACES = [
  {
    to: '/demo',
    icono: MapPin,
    titulo: 'Reportar una incidencia',
    descripcion: 'Baches, luminarias, basurales y más — sin necesidad de crear cuenta.',
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
    titulo: 'Acceso funcionarios',
    descripcion: 'Dashboard municipal — Alcalde, Jefes de Departamento y Terreno.',
  },
]

export default function LandingPage() {
  useEffect(() => {
    restaurarTemaPorDefecto()
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-6 py-10 text-center">
      <div className="flex flex-col items-center gap-2">
        <MapPin size={40} className="text-primary" />
        <h1 className="text-xl font-bold text-tinta-fuerte">TuMuniAquí</h1>
        <p className="max-w-sm text-sm text-tinta-suave">Municipalidad Demo</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        {ENLACES.map(({ to, icono: Icono, titulo, descripcion }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 rounded-2xl border border-borde bg-white p-4 text-left shadow-sm transition-colors hover:border-primary"
          >
            <Icono size={22} className="shrink-0 text-primary" />
            <div className="flex-1">
              <p className="font-medium text-tinta-fuerte">{titulo}</p>
              <p className="text-xs text-tinta-suave">{descripcion}</p>
            </div>
            <ArrowRight size={18} className="shrink-0 text-tinta-tenue" />
          </Link>
        ))}
      </div>
    </div>
  )
}
