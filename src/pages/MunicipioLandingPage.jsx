import { useParams, Link } from 'react-router-dom'
import { MapPin, Search, LogIn, ArrowRight, AlertTriangle, MapPinOff } from 'lucide-react'
import { useMunicipio } from '../hooks/useMunicipio'
import Spinner from '../components/common/Spinner'

// Portada de cada municipalidad ("/:municipioSlug"): a diferencia de LandingPage
// (el hub neutro en "/", sin tenant), esta SÍ conoce el municipio por la URL,
// así que aplica su tema (useMunicipio ya llama a aplicarTema) y muestra su
// logo grande en vez del pin genérico. El formulario de reporte, que antes
// vivía directo en esta ruta, se corrió un nivel adentro
// ("/:municipioSlug/reportar") para que esta portada pueda mostrar las 3
// opciones primero — ver CiudadanoPage.jsx y BarraNavegacion.jsx.
export default function MunicipioLandingPage() {
  const { municipioSlug } = useParams()
  const { municipio, cargando, noEncontrado, error } = useMunicipio(municipioSlug)

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
        <AlertTriangle size={32} className="text-rose-500" />
        <p className="text-sm text-tinta">{error}</p>
      </div>
    )
  }

  if (noEncontrado) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <MapPinOff size={32} className="text-tinta-tenue" />
        <p className="text-sm text-tinta">
          No encontramos la municipalidad "<span className="font-medium">{municipioSlug}</span>".
          Revisa el link que te compartieron.
        </p>
      </div>
    )
  }

  const enlaces = [
    {
      to: `/${municipioSlug}/reportar`,
      icono: MapPin,
      titulo: 'Reportar una incidencia',
      descripcion: 'Baches, luminarias, basurales y más — sin necesidad de crear cuenta.',
    },
    {
      to: `/${municipioSlug}/estado`,
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-6 py-10 text-center">
      <div className="flex flex-col items-center gap-2">
        {municipio.logo_url ? (
          <img
            src={municipio.logo_url}
            alt={municipio.nombre}
            className="h-24 w-24 rounded-3xl bg-white object-contain p-2 shadow-sm ring-1 ring-black/5"
          />
        ) : (
          <MapPin size={40} className="text-primary" />
        )}
        <h1 className="text-lg font-bold text-tinta-fuerte">TuMuniAquí</h1>
        <p className="max-w-sm text-sm text-tinta-suave">{municipio.nombre}</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        {enlaces.map(({ to, icono: Icono, titulo, descripcion }) => (
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
