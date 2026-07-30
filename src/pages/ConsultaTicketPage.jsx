import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, AlertTriangle, ArrowLeft } from 'lucide-react'
import { buscarTicketPublico } from '../services/ticketsPublicosService'
import BadgeEstado from '../components/common/BadgeEstado'
import BadgeGravedad from '../components/common/BadgeGravedad'
import Boton from '../components/common/Boton'

function formatearFecha(timestamp) {
  if (!timestamp?.toDate) return '—'
  return timestamp.toDate().toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
}

// Página pública ("/estado"), sin login y sin tenant en la URL: el ticket público
// ya trae su propio municipio_id, así que un mismo formulario sirve para
// cualquier municipalidad. Solo lee de tickets_publicos (campos no sensibles),
// nunca de incidencias directamente.
export default function ConsultaTicketPage() {
  const [numeroTicket, setNumeroTicket] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [noEncontrado, setNoEncontrado] = useState(false)
  const [error, setError] = useState(null)

  async function manejarBusqueda(e) {
    e.preventDefault()
    if (!numeroTicket.trim()) return

    setBuscando(true)
    setError(null)
    setNoEncontrado(false)
    setResultado(null)

    try {
      const ticket = await buscarTicketPublico(numeroTicket)
      if (ticket) {
        setResultado(ticket)
      } else {
        setNoEncontrado(true)
      }
    } catch (err) {
      console.error('[ConsultaTicketPage] Error al buscar ticket:', err)
      setError('No se pudo consultar el ticket. Revisa tu conexión a internet e intenta nuevamente.')
    } finally {
      setBuscando(false)
    }
  }

  function buscarOtro() {
    setNumeroTicket('')
    setResultado(null)
    setNoEncontrado(false)
    setError(null)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
      <Link to="/" className="mb-4 flex items-center gap-1 text-sm text-gray-500">
        <ArrowLeft size={16} /> Volver al inicio
      </Link>

      <h1 className="text-xl font-bold text-gray-900">Consultar estado de un reporte</h1>
      <p className="mt-1 text-sm text-gray-500">
        Ingresa el número de ticket que recibiste al enviar tu reporte.
      </p>

      <form onSubmit={manejarBusqueda} className="mt-5 flex gap-2">
        <input
          type="text"
          value={numeroTicket}
          onChange={(e) => setNumeroTicket(e.target.value)}
          placeholder="INC-20260729-4F2A"
          className="w-full rounded-lg border border-gray-300 p-2.5 font-mono uppercase tracking-wide"
        />
        <Boton type="submit" cargando={buscando} disabled={!numeroTicket.trim()}>
          <Search size={18} />
        </Boton>
      </form>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {noEncontrado && (
        <p className="mt-4 rounded-xl bg-gray-100 p-3 text-center text-sm text-gray-600">
          No encontramos ningún reporte con ese número de ticket. Revisa que esté bien escrito.
        </p>
      )}

      {resultado && (
        <div className="mt-5 rounded-xl border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-semibold text-gray-900">{resultado.categoria}</h2>
            <BadgeEstado estado={resultado.estado} />
          </div>

          <div className="mt-2">
            <BadgeGravedad nivel={resultado.nivel_gravedad} />
          </div>

          <dl className="mt-4 space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <dt>Reportado el</dt>
              <dd>{formatearFecha(resultado.fecha_creacion)}</dd>
            </div>
            {resultado.estado === 'Resuelto' && (
              <div className="flex justify-between">
                <dt>Resuelto el</dt>
                <dd>{formatearFecha(resultado.fecha_cierre)}</dd>
              </div>
            )}
          </dl>

          <Boton variante="secundario" className="mt-4 w-full" onClick={buscarOtro}>
            Consultar otro ticket
          </Boton>
        </div>
      )}
    </div>
  )
}
