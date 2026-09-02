import { AlertTriangle, ThumbsUp, Plus } from 'lucide-react'
import Boton from '../common/Boton'
import BadgeEstado from '../common/BadgeEstado'
import BadgeGravedad from '../common/BadgeGravedad'
import { etiquetaCategoria } from '../../utils/categorias'

// Se muestra al avanzar del paso de categoría si hay un reporte activo de la
// MISMA categoría a menos de 50m (ver distanciaMetros en utils/distancia.js,
// invocado desde FormularioCiudadano.jsx) — evita que dos vecinos creen
// tickets separados para el mismo problema.
export default function AvisoPosibleDuplicado({ ticket, votando, onSumarme, onCrearNuevo }) {
  const upvotes = ticket.upvotes || 1

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-tinta-fuerte">¿Ya reportado?</h2>
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
        <span>Parece que alguien ya reportó esto cerca de aquí. ¿Quieres sumarte al reporte existente o crear uno nuevo?</span>
      </div>

      <div className="rounded-xl border border-borde p-3">
        <strong className="text-sm text-tinta-fuerte">{etiquetaCategoria(ticket.categoria)}</strong>
        <div className="mt-1 flex gap-1.5">
          <BadgeEstado estado={ticket.estado} />
          <BadgeGravedad nivel={ticket.nivel_gravedad} />
        </div>
        {ticket.fotos_antes_urls?.[0] && (
          <img
            src={ticket.fotos_antes_urls[0]}
            alt="Foto del reporte existente"
            className="mt-2 h-32 w-full rounded-lg object-cover"
          />
        )}
        <p className="mt-2 text-xs text-tinta-suave">
          {upvotes} {upvotes === 1 ? 'persona reportó esto' : 'personas reportaron esto'}
        </p>
      </div>

      <Boton onClick={onSumarme} cargando={votando} className="w-full">
        <ThumbsUp size={18} />
        Sumarme a este reporte
      </Boton>
      <Boton onClick={onCrearNuevo} variante="secundario" disabled={votando} className="w-full">
        <Plus size={18} />
        Crear uno nuevo de todas formas
      </Boton>
    </div>
  )
}
