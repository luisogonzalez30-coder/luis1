import { useState } from 'react'
import { X, MapPin, Clock, CheckCircle2, ThumbsUp, Users } from 'lucide-react'
import BadgeEstado from '../common/BadgeEstado'
import BadgeGravedad from '../common/BadgeGravedad'
import EnlaceGoogleMaps from '../common/EnlaceGoogleMaps'
import GaleriaFotos from '../common/GaleriaFotos'
import Boton from '../common/Boton'
import { CATEGORIA_POR_VALOR } from '../../utils/categorias'
import { colorDeGrupo } from '../../utils/coloresGrupo'
import { formatearNumeroTicket } from '../../utils/ticket'
import { votarIncidencia } from '../../services/incidenciasService'
import { obtenerIdDispositivo, yaVotoPorIncidencia, registrarVotoLocal } from '../../utils/dispositivo'

function fechaLarga(timestamp) {
  if (!timestamp?.toDate) return null
  return timestamp.toDate().toLocaleString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Ficha completa de un reporte de la comuna, al tocarlo en "Últimos reportes"
// (§29). Muestra lo que el vecino necesita para saber si es SU problema:
// dónde exactamente, cuándo, en qué va, y cuánta gente lo ha reportado — más
// el botón para sumarse en vez de crear un duplicado.
export default function DetalleReporte({ ticket, onCerrar }) {
  const [votado, setVotado] = useState(() => yaVotoPorIncidencia(ticket.incidencia_id))
  const [votando, setVotando] = useState(false)
  const [error, setError] = useState(null)

  const info = CATEGORIA_POR_VALOR[ticket.categoria]
  const color = colorDeGrupo(info?.grupo)
  const apoyos = ticket.upvotes || 1
  const creado = fechaLarga(ticket.fecha_creacion)
  const cerrado = fechaLarga(ticket.fecha_cierre)

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
      console.error('[DetalleReporte] Error al votar:', err)
      setError('No se pudo registrar tu apoyo. Intenta nuevamente.')
    } finally {
      setVotando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/40 sm:items-center" onClick={onCerrar}>
      <div
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 w-full rounded-t-3xl" style={{ backgroundColor: color }} aria-hidden="true" />

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold leading-tight text-gray-900">
                {info?.etiqueta || ticket.categoria}
              </h3>
              <p className="mt-0.5 text-xs text-gray-400">
                {info?.grupo} · N° {formatearNumeroTicket(ticket.id)}
              </p>
            </div>
            <button
              onClick={onCerrar}
              className="shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <BadgeEstado estado={ticket.estado} />
            <BadgeGravedad nivel={ticket.nivel_gravedad} />
          </div>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-start gap-2.5">
              <MapPin size={17} className="mt-0.5 shrink-0 text-gray-400" />
              <div className="min-w-0">
                <p className="text-gray-700">{ticket.direccion_texto || 'Sin referencia escrita'}</p>
                <EnlaceGoogleMaps coordenadas={ticket.coordenadas} />
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Clock size={17} className="mt-0.5 shrink-0 text-gray-400" />
              <div>
                <p className="text-gray-700">Reportado el {creado || '—'}</p>
                {cerrado && <p className="text-green-700">Resuelto el {cerrado}</p>}
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Users size={17} className="mt-0.5 shrink-0 text-gray-400" />
              <p className="text-gray-700">
                {apoyos === 1 ? '1 vecino reportó esto' : `${apoyos} vecinos reportaron esto`}
              </p>
            </div>
          </div>

          {ticket.fotos_antes_urls?.length > 0 && (
            <GaleriaFotos urls={ticket.fotos_antes_urls} alt="Foto del reporte" className="mt-4" />
          )}

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          {ticket.estado !== 'Resuelto' && (
            votado ? (
              <div className="mt-4 flex items-center justify-center gap-1.5 rounded-2xl bg-green-50 px-3 py-2.5 text-sm text-green-800">
                <CheckCircle2 size={16} /> Ya te sumaste a este reporte
              </div>
            ) : (
              <Boton className="mt-4 w-full" cargando={votando} onClick={manejarVoto}>
                <ThumbsUp size={16} />
                A mí también me afecta
              </Boton>
            )
          )}
        </div>
      </div>
    </div>
  )
}
