import { useEffect, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { suscribirSeguimientos } from '../../services/seguimientosService'
import { formatearFecha } from '../../utils/tiempo'

// Muestra los comentarios/fotos que el ciudadano fue agregando a un reporte ya
// creado (ver ConsultaTicketPage.jsx). Se usa en los 3 paneles de gestión
// (Alcalde, Jefe de Departamento, Terreno) — no se oculta por rol porque, a
// diferencia del contacto del ciudadano, esto es información operativa sobre
// el problema en sí, útil para cualquiera que vaya a atenderlo.
export default function ListaSeguimientos({ incidenciaId }) {
  const [seguimientos, setSeguimientos] = useState([])

  useEffect(() => {
    if (!incidenciaId) return
    return suscribirSeguimientos(incidenciaId, setSeguimientos)
  }, [incidenciaId])

  if (seguimientos.length === 0) return null

  return (
    <div className="mt-3 rounded-lg border border-gray-200 p-2.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
        <MessageSquare size={13} /> Seguimiento del ciudadano ({seguimientos.length})
      </p>
      <ul className="mt-2 space-y-2">
        {seguimientos.map((s) => (
          <li key={s.id} className="text-sm text-gray-700">
            {s.texto && <p>{s.texto}</p>}
            {s.foto_url && (
              <a href={s.foto_url} target="_blank" rel="noreferrer" className="text-primary underline">
                Ver foto adjunta
              </a>
            )}
            <p className="text-xs text-gray-400">{formatearFecha(s.fecha)}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
