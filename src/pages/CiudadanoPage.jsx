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

  return <FormularioCiudadano municipio={municipio} />
}
