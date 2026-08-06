import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Search, AlertTriangle, ArrowLeft, Camera, MessageSquare, Check } from 'lucide-react'
import { buscarTicketPublico } from '../services/ticketsPublicosService'
import { calificarIncidencia } from '../services/incidenciasService'
import { agregarSeguimiento } from '../services/seguimientosService'
import { subirImagen } from '../services/storageService'
import { CATEGORIAS } from '../utils/categorias'
import { formatearNumeroTicket } from '../utils/ticket'
import BadgeEstado from '../components/common/BadgeEstado'
import BadgeGravedad from '../components/common/BadgeGravedad'
import Boton from '../components/common/Boton'
import EstrellasCalificacion from '../components/common/EstrellasCalificacion'
import BarraNavegacion from '../components/ciudadano/BarraNavegacion'

const ETIQUETA_POR_VALOR = Object.fromEntries(CATEGORIAS.map((c) => [c.valor, c.etiqueta]))

function formatearFecha(timestamp) {
  if (!timestamp?.toDate) return '—'
  return timestamp.toDate().toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
}

// Formulario para que el ciudadano agregue más información a un reporte que ya
// existe (ej. "el problema empeoró"). No requiere login — ver agregarSeguimiento.
// Al no poder releer lo enviado (el ciudadano no tiene permiso de lectura sobre
// incidencias), la confirmación es puramente del lado del cliente tras el envío.
function FormularioSeguimiento({ incidenciaId }) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [archivo, setArchivo] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState(null)

  async function manejarEnvio(e) {
    e.preventDefault()
    if (!texto.trim() && !archivo) return

    setEnviando(true)
    setError(null)
    try {
      const fotoUrl = archivo ? await subirImagen(archivo, `incidencias/${incidenciaId}/seguimientos`) : ''
      await agregarSeguimiento(incidenciaId, { texto: texto.trim(), fotoUrl })
      setEnviado(true)
      setTexto('')
      setArchivo(null)
    } catch (err) {
      console.error('[ConsultaTicketPage] Error al agregar seguimiento:', err)
      setError(err.message || 'No se pudo enviar. Intenta nuevamente.')
    } finally {
      setEnviando(false)
    }
  }

  if (enviado) {
    return (
      <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-green-50 p-2 text-sm text-green-700">
        <Check size={16} /> ¡Gracias! Se agregó tu información al reporte.
      </p>
    )
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <MessageSquare size={15} /> Agregar información a este reporte
      </button>
    )
  }

  return (
    <form onSubmit={manejarEnvio} className="mt-3 rounded-lg border border-gray-200 p-3">
      <label className="mb-1 block text-xs font-medium text-gray-700">¿Hay algo más que quieras contarnos?</label>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="Ej: El problema empeoró, ahora también..."
        className="w-full rounded-lg border border-gray-300 p-2 text-sm"
      />

      <label className="mt-2 flex cursor-pointer items-center gap-1.5 text-xs text-gray-500">
        <Camera size={14} />
        {archivo ? archivo.name : 'Adjuntar una foto (opcional)'}
        <input type="file" accept="image/*" capture="environment" onChange={(e) => setArchivo(e.target.files?.[0] || null)} className="hidden" />
      </label>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-2 flex gap-2">
        <Boton type="submit" cargando={enviando} disabled={!texto.trim() && !archivo} className="flex-1">
          Enviar
        </Boton>
        <button type="button" onClick={() => setAbierto(false)} className="px-2 text-sm text-gray-500">
          Cancelar
        </button>
      </div>
    </form>
  )
}

function TarjetaResultado({ resultado, onCalificado }) {
  const [enviandoCalificacion, setEnviandoCalificacion] = useState(false)

  async function calificar(estrellas) {
    if (enviandoCalificacion) return
    setEnviandoCalificacion(true)
    try {
      await calificarIncidencia({ incidenciaId: resultado.incidencia_id, numeroTicket: resultado.id, calificacion: estrellas })
      onCalificado(resultado.id, estrellas)
    } catch (err) {
      console.error('[ConsultaTicketPage] Error al calificar:', err)
    } finally {
      setEnviandoCalificacion(false)
    }
  }

  return (
    <div className="mt-5 rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-gray-900">{ETIQUETA_POR_VALOR[resultado.categoria] || resultado.categoria}</h2>
          <p className="text-xs text-gray-400">N° {formatearNumeroTicket(resultado.id)}</p>
        </div>
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

      {resultado.estado === 'Resuelto' && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          {resultado.calificacion_ciudadano ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Tu calificación:</p>
              <EstrellasCalificacion valor={resultado.calificacion_ciudadano} soloLectura />
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">¿Quedó bien resuelto?</p>
              <EstrellasCalificacion valor={0} onSeleccionar={calificar} />
            </div>
          )}
        </div>
      )}

      <FormularioSeguimiento incidenciaId={resultado.incidencia_id} />
    </div>
  )
}

// Página pública ("/estado"), sin login y sin tenant en la URL: el ticket público
// ya trae su propio municipio_id, así que un mismo formulario sirve para
// cualquier municipalidad. Solo lee de tickets_publicos (campos no sensibles),
// nunca de incidencias directamente.
//
// Se busca solo por número de ticket. La búsqueda por RUT se eliminó el
// 02-ago-2026 junto con el campo RUT (§29): quien perdió su número lo recupera
// escribiéndole "mis reportes" al WhatsApp de la municipalidad, y el bot le
// responde únicamente a ese teléfono — más simple para el vecino y sin pedirle
// un dato personal sensible.
export default function ConsultaTicketPage() {
  // Solo viene definido en la ruta con comuna ("/:municipioSlug/estado"); en
  // "/estado" a secas queda undefined y la página funciona igual que siempre.
  const { municipioSlug } = useParams()
  const [numeroTicket, setNumeroTicket] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [noEncontrado, setNoEncontrado] = useState(false)
  const [error, setError] = useState(null)

  async function manejarBusquedaPorTicket(e) {
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

  // Actualización optimista tras calificar: evita releer el ticket completo
  // (el ciudadano no tiene permiso de lectura sobre incidencias, y el mirror en
  // tickets_publicos es best-effort/asíncrono, no conviene esperarlo para pintar).
  function manejarCalificado(ticketId, calificacion) {
    setResultado((actual) => (actual?.id === ticketId ? { ...actual, calificacion_ciudadano: calificacion } : actual))
  }

  function buscarOtro() {
    setNumeroTicket('')
    setResultado(null)
    setNoEncontrado(false)
    setError(null)
  }

  return (
    <>
    <div
      className={`mx-auto flex min-h-screen max-w-md flex-col px-4 py-6 ${
        municipioSlug ? 'pb-[calc(var(--alto-barra-inferior)+env(safe-area-inset-bottom,0px))]' : ''
      }`}
    >
      <Link
        to={municipioSlug ? `/${municipioSlug}` : '/'}
        className="mb-4 flex items-center gap-1 text-sm text-tinta-suave hover:text-primary"
      >
        <ArrowLeft size={16} /> {municipioSlug ? 'Volver' : 'Volver al inicio'}
      </Link>

      <h1 className="text-xl font-bold text-gray-900">Consultar estado de un reporte</h1>
      <p className="mt-2 text-sm text-gray-500">
        Ingresa el número que recibiste al enviar tu reporte.
      </p>

      <form onSubmit={manejarBusquedaPorTicket} className="mt-4 flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={numeroTicket}
          onChange={(e) => setNumeroTicket(e.target.value)}
          placeholder="482 173"
          className="w-full rounded-2xl border border-gray-300 p-3 text-lg tracking-widest transition-shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <Boton type="submit" cargando={buscando} disabled={!numeroTicket.trim()}>
          <Search size={18} />
        </Boton>
      </form>

      {noEncontrado && (
        <p className="mt-4 rounded-2xl bg-gray-100 p-3 text-center text-sm text-gray-600">
          No encontramos ningún reporte con ese número. Revisa que esté bien escrito.
        </p>
      )}

      {resultado && (
        <>
          <TarjetaResultado resultado={resultado} onCalificado={manejarCalificado} />
          <Boton variante="secundario" className="mt-4 w-full" onClick={buscarOtro}>
            Consultar otro número
          </Boton>
        </>
      )}

      {!resultado && (
        <div className="mt-6 flex items-start gap-2 rounded-2xl bg-primary/5 p-4 text-sm text-gray-700">
          <MessageSquare size={18} className="mt-0.5 shrink-0 text-primary" />
          <span>
            <strong>¿Perdiste tu número?</strong> Escríbele <strong>"mis reportes"</strong> por WhatsApp
            a la municipalidad desde el mismo teléfono con el que reportaste, y te reenviamos tus
            números con el estado de cada uno.
          </span>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-estado-critico/[0.07] p-3 text-sm text-estado-critico">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>

    {/* La barra solo aparece en la ruta con comuna (/:slug/estado). En "/estado"
        a secas no hay tenant, así que no habría a dónde apuntar las pestañas. */}
    {municipioSlug && <BarraNavegacion municipioSlug={municipioSlug} />}
    </>
  )
}
