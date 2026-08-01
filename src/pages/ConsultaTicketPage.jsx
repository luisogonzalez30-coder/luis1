import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, AlertTriangle, ArrowLeft, Camera, MessageSquare, Check } from 'lucide-react'
import { buscarTicketPublico } from '../services/ticketsPublicosService'
import { calificarIncidencia } from '../services/incidenciasService'
import { agregarSeguimiento } from '../services/seguimientosService'
import { subirImagen } from '../services/storageService'
import { buscarTicketsPorRutLocal } from '../utils/dispositivo'
import { limpiarRut } from '../utils/rut'
import { CATEGORIAS } from '../utils/categorias'
import BadgeEstado from '../components/common/BadgeEstado'
import BadgeGravedad from '../components/common/BadgeGravedad'
import Boton from '../components/common/Boton'
import EstrellasCalificacion from '../components/common/EstrellasCalificacion'

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
        <h2 className="font-semibold text-gray-900">{ETIQUETA_POR_VALOR[resultado.categoria] || resultado.categoria}</h2>
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
// Tiene DOS formas de buscar: por número de ticket (consulta directa al
// servidor, funciona desde cualquier dispositivo) y por RUT (ver "Consulta de
// tickets por RUT" en ESTADO_PROYECTO.md) — esta segunda NUNCA envía el RUT al
// servidor: solo lee un índice guardado en ESTE dispositivo al momento de
// crear el reporte (utils/dispositivo.js). Guardar el RUT en una consulta
// pública del lado del servidor expondría qué vecino reportó qué a cualquiera
// que probara RUTs al azar — por eso la búsqueda por RUT solo funciona desde
// el mismo celular que se usó para reportar.
export default function ConsultaTicketPage() {
  const [modo, setModo] = useState('ticket') // 'ticket' | 'rut'

  const [numeroTicket, setNumeroTicket] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [noEncontrado, setNoEncontrado] = useState(false)
  const [error, setError] = useState(null)

  const [rut, setRut] = useState('')
  const [resultadosRut, setResultadosRut] = useState(null)

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

  async function manejarBusquedaPorRut(e) {
    e.preventDefault()
    if (!rut.trim()) return

    setBuscando(true)
    setError(null)
    setResultadosRut(null)

    try {
      const numerosTicket = buscarTicketsPorRutLocal(limpiarRut(rut))
      if (numerosTicket.length === 0) {
        setResultadosRut([])
        return
      }
      const tickets = await Promise.all(numerosTicket.map((n) => buscarTicketPublico(n)))
      setResultadosRut(tickets.filter(Boolean))
    } catch (err) {
      console.error('[ConsultaTicketPage] Error al buscar por RUT:', err)
      setError('No se pudo consultar tus reportes. Revisa tu conexión a internet e intenta nuevamente.')
    } finally {
      setBuscando(false)
    }
  }

  // Actualización optimista tras calificar: evita releer el ticket completo
  // (el ciudadano no tiene permiso de lectura sobre incidencias, y el mirror en
  // tickets_publicos es best-effort/asíncrono, no conviene esperarlo para pintar).
  function manejarCalificado(ticketId, calificacion) {
    setResultado((actual) => (actual?.id === ticketId ? { ...actual, calificacion_ciudadano: calificacion } : actual))
    setResultadosRut((actual) => actual?.map((r) => (r.id === ticketId ? { ...r, calificacion_ciudadano: calificacion } : r)) ?? actual)
  }

  function buscarOtro() {
    setNumeroTicket('')
    setResultado(null)
    setNoEncontrado(false)
    setRut('')
    setResultadosRut(null)
    setError(null)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
      <Link to="/" className="mb-4 flex items-center gap-1 text-sm text-gray-500">
        <ArrowLeft size={16} /> Volver al inicio
      </Link>

      <h1 className="text-xl font-bold text-gray-900">Consultar estado de un reporte</h1>

      <div className="mt-4 flex gap-1 rounded-lg bg-gray-100 p-1">
        {[
          { id: 'ticket', etiqueta: 'Por número de ticket' },
          { id: 'rut', etiqueta: 'Por mi RUT' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setModo(tab.id); buscarOtro() }}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors
              ${modo === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab.etiqueta}
          </button>
        ))}
      </div>

      {modo === 'ticket' ? (
        <>
          <p className="mt-4 text-sm text-gray-500">
            Ingresa el número de ticket que recibiste al enviar tu reporte.
          </p>

          <form onSubmit={manejarBusquedaPorTicket} className="mt-4 flex gap-2">
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

          {noEncontrado && (
            <p className="mt-4 rounded-xl bg-gray-100 p-3 text-center text-sm text-gray-600">
              No encontramos ningún reporte con ese número de ticket. Revisa que esté bien escrito.
            </p>
          )}

          {resultado && (
            <>
              <TarjetaResultado resultado={resultado} onCalificado={manejarCalificado} />
              <Boton variante="secundario" className="mt-4 w-full" onClick={buscarOtro}>
                Consultar otro ticket
              </Boton>
            </>
          )}
        </>
      ) : (
        <>
          <p className="mt-4 text-sm text-gray-500">
            Busca los reportes que hiciste con tu RUT — solo funciona desde el mismo celular con el que reportaste.
          </p>

          <form onSubmit={manejarBusquedaPorRut} className="mt-4 flex gap-2">
            <input
              type="text"
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              placeholder="12.345.678-9"
              className="w-full rounded-lg border border-gray-300 p-2.5"
            />
            <Boton type="submit" cargando={buscando} disabled={!rut.trim()}>
              <Search size={18} />
            </Boton>
          </form>

          {resultadosRut?.length === 0 && (
            <p className="mt-4 rounded-xl bg-gray-100 p-3 text-center text-sm text-gray-600">
              No encontramos reportes con ese RUT en este celular. Si reportaste desde otro dispositivo, busca por número de ticket.
            </p>
          )}

          {resultadosRut?.map((r) => <TarjetaResultado key={r.id} resultado={r} onCalificado={manejarCalificado} />)}

          {resultadosRut?.length > 0 && (
            <Boton variante="secundario" className="mt-4 w-full" onClick={buscarOtro}>
              Buscar otro RUT
            </Boton>
          )}
        </>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
