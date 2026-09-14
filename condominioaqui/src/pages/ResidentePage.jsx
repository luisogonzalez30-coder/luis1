import { useParams } from 'react-router-dom'
import { AlertTriangle, MapPinOff } from 'lucide-react'
import { useCondominio } from '../hooks/useCondominio'
import Spinner from '../components/common/Spinner'
import FormularioResidente from '../components/residente/FormularioResidente'

export default function ResidentePage() {
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

  // Sin BarraNavegacion a propósito: mientras se está llenando el formulario,
  // el botón "Reportar" de esa barra queda fijo en pantalla sin hacer nada
  // (ya se está ahí) — confundía a la gente, que lo tocaba pensando que era
  // el paso siguiente en vez de "Siguiente" (que sí está en el formulario).
  // Las demás pantallas (estado, transparencia) sí la mantienen.
  return <FormularioResidente condominio={condominio} />
}
