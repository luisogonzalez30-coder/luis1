import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { restaurarTemaPorDefecto } from '../utils/tema'

// Página neutra en "/". El formulario ciudadano vive en "/:municipioSlug" — cada
// municipalidad reparte su propio link a sus vecinos, así que aquí no hay nada
// específico de un tenant.
export default function LandingPage() {
  useEffect(() => {
    restaurarTemaPorDefecto()
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-6 text-center">
      <MapPin size={40} className="text-primary" />
      <h1 className="text-xl font-bold text-gray-900">Reporte de Incidencias Urbanas</h1>
      <p className="max-w-sm text-sm text-gray-500">
        Este portal se accede a través del link entregado por tu municipalidad
        (por ejemplo: <span className="font-mono">tuapp.cl/tu-comuna</span>).
      </p>
      <Link to="/estado" className="text-sm font-medium text-primary hover:underline">
        ¿Ya reportaste? Consulta el estado de tu ticket
      </Link>
    </div>
  )
}
