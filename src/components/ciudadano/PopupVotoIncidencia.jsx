import { useState } from 'react'
import { ThumbsUp, CheckCircle2 } from 'lucide-react'
import BadgeEstado from '../common/BadgeEstado'
import BadgeGravedad from '../common/BadgeGravedad'
import Boton from '../common/Boton'
import { votarIncidencia } from '../../services/incidenciasService'
import { obtenerIdDispositivo, yaVotoPorIncidencia, registrarVotoLocal } from '../../utils/dispositivo'
import { etiquetaCategoria } from '../../utils/categorias'

// Contenido del popup al tocar el pin de OTRO reporte ya existente en el mapa
// ciudadano (ver MapaSeleccionUbicacion.jsx): info pública del ticket + botón
// para votar "+1" si a este vecino también le afecta, en vez de crear un
// reporte duplicado.
export default function PopupVotoIncidencia({ ticket }) {
  const [votado, setVotado] = useState(() => yaVotoPorIncidencia(ticket.incidencia_id))
  const [votando, setVotando] = useState(false)
  const [error, setError] = useState(null)

  async function manejarVoto() {
    setError(null)
    setVotando(true)
    try {
      await votarIncidencia({
        incidenciaId: ticket.incidencia_id,
        numeroTicket: ticket.id,
        dispositivoId: obtenerIdDispositivo(),
      })
      registrarVotoLocal(ticket.incidencia_id)
      setVotado(true)
    } catch (err) {
      console.error('[PopupVotoIncidencia] Error al votar:', err)
      setError('No se pudo registrar tu voto. Intenta nuevamente.')
    } finally {
      setVotando(false)
    }
  }

  const upvotes = ticket.upvotes || 1

  return (
    <div className="w-52">
      <strong className="text-sm text-gray-900">{etiquetaCategoria(ticket.categoria)}</strong>

      <div className="mt-1 flex gap-1">
        <BadgeEstado estado={ticket.estado} />
        <BadgeGravedad nivel={ticket.nivel_gravedad} />
      </div>

      {ticket.fotos_antes_urls?.[0] && (
        <img
          src={ticket.fotos_antes_urls[0]}
          alt="Foto del reporte"
          className="mt-2 h-24 w-full rounded-lg object-cover"
        />
      )}

      <p className="mt-2 text-xs text-gray-500">
        {upvotes} {upvotes === 1 ? 'persona reportó esto' : 'personas reportaron esto'}
      </p>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {votado ? (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-green-50 px-2 py-1.5 text-xs text-green-800">
          <CheckCircle2 size={14} /> Ya te sumaste a este reporte
        </div>
      ) : (
        <Boton className="mt-2 w-full text-xs" cargando={votando} onClick={manejarVoto}>
          <ThumbsUp size={14} />
          ¡A mí también me afecta! (+1)
        </Boton>
      )}
    </div>
  )
}
