import { useParams } from 'react-router-dom'
import { AlertTriangle, MapPinOff } from 'lucide-react'
import { useMunicipio } from '../hooks/useMunicipio'
import Spinner from '../components/common/Spinner'
import FormularioCiudadano from '../components/ciudadano/FormularioCiudadano'

export default function CiudadanoPage() {
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
          No encontramos la municipalidad "<span className="font-medium">{municipioSlug}</span>".
          Revisa el link que te compartieron.
        </p>
      </div>
    )
  }

  // Sin BarraNavegacion a propósito: mientras se está llenando el formulario,
  // el botón "Reportar" de esa barra queda fijo en pantalla sin hacer nada
  // (ya se está ahí) — confundía a la gente, que lo tocaba pensando que era
  // el paso siguiente en vez de "Siguiente" (que sí está en el formulario).
  // Las demás pantallas (estado, transparencia) sí la mantienen.
  return <FormularioCiudadano municipio={municipio} />
}
