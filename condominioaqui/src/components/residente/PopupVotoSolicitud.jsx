import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ThumbsUp, CheckCircle2, Copy, Check } from 'lucide-react'
import BadgeEstado from '../common/BadgeEstado'
import BadgeGravedad from '../common/BadgeGravedad'
import Boton from '../common/Boton'
import { votarSolicitud } from '../../services/solicitudesService'
import { obtenerIdDispositivo, yaVotoPorSolicitud, registrarVotoLocal } from '../../utils/dispositivo'
import { etiquetaCategoria } from '../../utils/categorias'
import { formatearNumeroTicket } from '../../utils/ticket'

// Contenido del popup al tocar el pin de OTRO reporte ya existente en el mapa
// residente (ver MapaSeleccionUbicacion.jsx): info pública del ticket + botón
// para votar "+1" si a este residente también le afecta, en vez de crear un
// reporte duplicado.
//
// Al sumarse se muestra el número de ticket, igual que al crear un reporte
// propio (TicketConfirmacion.jsx). Antes no se mostraba y el residente quedaba sin
// nada que anotar: se había sumado a algo que después no podía consultar en
// /estado. Sumarse tiene que dejarlo tan capaz de hacer seguimiento como
// reportar, o la opción se siente como un callejón sin salida y termina creando
// el duplicado que esto venía a evitar.
export default function PopupVotoSolicitud({ ticket }) {
  const [votado, setVotado] = useState(() => yaVotoPorSolicitud(ticket.solicitud_id))
  const [votando, setVotando] = useState(false)
  const [error, setError] = useState(null)
  const [copiado, setCopiado] = useState(false)

  async function manejarVoto() {
    setError(null)
    setVotando(true)
    try {
      await votarSolicitud({
        solicitudId: ticket.solicitud_id,
        numeroTicket: ticket.id,
        dispositivoId: obtenerIdDispositivo(),
      })
      registrarVotoLocal(ticket.solicitud_id)
      setVotado(true)
    } catch (err) {
      console.error('[PopupVotoSolicitud] Error al votar:', err)
      setError('No se pudo registrar tu voto. Intenta nuevamente.')
    } finally {
      setVotando(false)
    }
  }

  // navigator.clipboard no existe en contextos no seguros ni en algunos
  // navegadores antiguos, y en iOS puede rechazar la escritura. Si falla, el
  // número sigue visible y se puede anotar a mano: copiar es una comodidad,
  // no el único camino.
  async function copiarNumero() {
    try {
      await navigator.clipboard.writeText(ticket.id)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Sin aviso de error a propósito: el número está ahí para leerlo.
    }
  }

  const upvotes = ticket.upvotes || 1

  return (
    <div className="w-56">
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
        <div className="mt-2">
          <div className="flex items-center gap-1.5 rounded-lg bg-green-50 px-2 py-1.5 text-xs text-green-800">
            <CheckCircle2 size={14} className="shrink-0" /> Ya te sumaste a este reporte
          </div>

          {ticket.id && (
            <div className="mt-2 rounded-xl bg-primary/5 px-3 py-2.5 text-center ring-1 ring-primary/20">
              <p className="text-[11px] text-gray-500">Número de este reporte</p>
              <p className="mt-0.5 text-xl font-bold tracking-[0.15em] text-primary">
                {formatearNumeroTicket(ticket.id)}
              </p>

              <button
                type="button"
                onClick={copiarNumero}
                className="toque mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                {copiado ? <Check size={12} /> : <Copy size={12} />}
                {copiado ? 'Copiado' : 'Copiar'}
              </button>
            </div>
         )}

          <Link
            to="/estado"
            className="mt-2 block text-center text-xs font-medium text-primary hover:underline"
          >
            Consultar su estado
          </Link>
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
