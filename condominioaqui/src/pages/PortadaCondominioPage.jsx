import { useParams, Link } from 'react-router-dom'
import { MapPin, Search, LogIn, ArrowRight, AlertTriangle, MapPinOff } from 'lucide-react'
import { useCondominio } from '../hooks/useCondominio'
import Spinner from '../components/common/Spinner'

// Portada de cada condominio ("/:condominioSlug"): a diferencia de LandingPage
// (el hub neutro en "/", sin tenant), esta SÍ conoce el condominio por la URL,
// así que aplica su tema (useCondominio ya llama a aplicarTema) y muestra su
// logo grande en vez del pin genérico. El formulario de reporte, que antes
// vivía directo en esta ruta, se corrió un nivel adentro
// ("/:condominioSlug/reportar") para que esta portada pueda mostrar las 3
// opciones primero — ver ResidentePage.jsx y BarraNavegacion.jsx.
export default function PortadaCondominioPage() {
  const { condominioSlug } = useParams()
  const { condominio, cargando, noEncontrado, error } = useCondominio(condominioSlug)

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
   )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertTriangle size={32} className="text-red-500" />
        <p className="text-sm text-gray-600">{error}</p>
      </div>
   )
  }

  if (noEncontrado) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <MapPinOff size={32} className="text-gray-400" />
        <p className="text-sm text-gray-600">
          No encontramos el condominio "<span className="font-medium">{condominioSlug}</span>".
          Revisa el link que te compartieron.
        </p>
      </div>
   )
  }

  const enlaces = [
    {
      to: `/${condominioSlug}/reportar`,
      icono: MapPin,
      titulo: 'Reportar un problema',
      descripcion: 'Filtraciones, ascensores, ruidos, luces quemadas — sin crear cuenta ni instalar nada.',
    },
    {
      to: `/${condominioSlug}/estado`,
      icono: Search,
      titulo: '¿Ya reportaste? Consulta tu ticket',
      descripcion: 'Revisa el estado de un reporte con el número que recibiste.',
    },
    {
      to: '/login',
      icono: LogIn,
      titulo: 'Acceso usuarios',
      descripcion: 'Dashboard del condominio — Administrador, Jefes de Area y Terreno.',
    },
  ]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 px-6 py-10 text-center">
      <div className="flex flex-col items-center gap-2">
        {condominio.logo_url ? (
          <img
            src={condominio.logo_url}
            alt={condominio.nombre}
            className="h-24 w-24 rounded-3xl bg-white object-contain p-2 shadow-sm ring-1 ring-black/5"
          />
       ) : (
          <MapPin size={40} className="text-primary" />
       )}
        <h1 className="text-lg font-bold text-gray-900">CondominioAquí</h1>
        <p className="max-w-sm text-sm text-gray-500">{condominio.nombre}</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        {enlaces.map(({ to, icono: Icono, titulo, descripcion }) => (
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
