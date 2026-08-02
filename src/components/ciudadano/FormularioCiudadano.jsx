import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Send, AlertTriangle } from 'lucide-react'
import { useGeolocation } from '../../hooks/useGeolocation'
import { crearIncidencia, generarIdIncidencia, votarIncidencia } from '../../services/incidenciasService'
import { suscribirTicketsActivos, suscribirUltimosTickets } from '../../services/ticketsPublicosService'
import { conTimeout } from '../../utils/timeout'
import { generarNumeroTicket } from '../../utils/ticket'
import { guardarReportePendiente } from '../../utils/colaOffline'
import {
  obtenerIdDispositivo,
  registrarVotoLocal,
  yaVotoPorIncidencia,
  registrarTicketPorRut,
} from '../../utils/dispositivo'
import { distanciaMetros } from '../../utils/distancia'
import { esRutValido, formatearRut, limpiarRut } from '../../utils/rut'
import Boton from '../common/Boton'
import EncabezadoMunicipio from '../common/EncabezadoMunicipio'
import PasoUbicacion from './PasoUbicacion'
import PasoCategoria from './PasoCategoria'
import PasoFoto from './PasoFoto'
import TicketConfirmacion from './TicketConfirmacion'
import AvisoPosibleDuplicado from './AvisoPosibleDuplicado'

const TOTAL_PASOS = 3

// Radio de "posible duplicado" (estilo Waze): si hay un reporte activo de la
// MISMA categoría más cerca que esto, se ofrece sumarse en vez de crear uno nuevo.
const RADIO_DUPLICADO_METROS = 50

export default function FormularioCiudadano({ municipio }) {
  const [paso, setPaso] = useState(1)
  const [categoria, setCategoria] = useState('')
  const [direccionTexto, setDireccionTexto] = useState('')
  const [detallesAdicionales, setDetallesAdicionales] = useState('')
  const [fotos, setFotos] = useState([])
  const [quiereDejarDatos, setQuiereDejarDatos] = useState(false)
  const [nombreCiudadano, setNombreCiudadano] = useState('')
  const [rutCiudadano, setRutCiudadano] = useState('')
  const [contactoCiudadano, setContactoCiudadano] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState(null)
  const [ticket, setTicket] = useState(null)
  const [pendienteSincronizar, setPendienteSincronizar] = useState(false)
  const [fotoDescartadaOffline, setFotoDescartadaOffline] = useState(false)

  const [incidenciasActivas, setIncidenciasActivas] = useState([])
  const [ultimosReportes, setUltimosReportes] = useState([])
  const [duplicadoDetectado, setDuplicadoDetectado] = useState(null)
  const [votandoDuplicado, setVotandoDuplicado] = useState(false)
  const [esVotoExistente, setEsVotoExistente] = useState(false)

  const [coordenadas, setCoordenadas] = useState(null)
  const { coordenadas: coordenadasGPS, cargando, error, obtenerUbicacion } = useGeolocation()

  // El GPS es una de las dos formas de fijar la ubicación (la otra es tocar el mapa
  // a mano en PasoUbicacion); cuando el GPS responde, adopta esa posición como la actual.
  useEffect(() => {
    if (coordenadasGPS) setCoordenadas(coordenadasGPS)
  }, [coordenadasGPS])

  // Dos suscripciones acotadas, a propósito separadas (antes era una sola sin
  // límite que traía TODOS los tickets del municipio — ver el comentario de
  // MAX_TICKETS_* en ticketsPublicosService.js):
  //  - activos: pines del mapa + chequeo de duplicados. Excluye resueltos en el
  //    servidor, que son los que crecen sin techo.
  //  - últimos 10: el listado "Últimos reportes de la comuna" del Paso 1, que
  //    sí quiere mostrar también los resueltos (es lo que da confianza).
  // Ambas vienen ya ordenadas por fecha desde Firestore, sin ordenar en memoria.
  useEffect(() => {
    if (!municipio?.id) return
    const cancelarActivos = suscribirTicketsActivos(setIncidenciasActivas, municipio.id)
    const cancelarUltimos = suscribirUltimosTickets(setUltimosReportes, municipio.id, 10)
    return () => {
      cancelarActivos()
      cancelarUltimos()
    }
  }, [municipio?.id])

  const rutEscrito = rutCiudadano.trim().length > 0
  const rutInvalido = quiereDejarDatos && rutEscrito && !esRutValido(rutCiudadano)

  const puedeAvanzar = {
    1: Boolean(coordenadas),
    2: Boolean(categoria),
    3: true, // las fotos son opcionales
  }[paso]

  function encolarSinConexion(datosReporte, tieneFotos) {
    const numeroTicket = generarNumeroTicket()
    const idLocal = guardarReportePendiente({ ...datosReporte, numeroTicketExistente: numeroTicket })

    if (!idLocal) {
      // El dispositivo no pudo guardar en localStorage (modo privado / sin espacio):
      // no hay garantía de reintento automático, hay que ser honestos sobre eso.
      setErrorEnvio(
        `No pudimos guardar tu reporte en este dispositivo para reintentar más tarde. Anota este número y contacta a la municipalidad directamente: ${numeroTicket}`
      )
      return
    }

    if (datosReporte.rutCiudadano) {
      registrarTicketPorRut(limpiarRut(datosReporte.rutCiudadano), numeroTicket)
    }

    setFotoDescartadaOffline(tieneFotos)
    setPendienteSincronizar(true)
    setTicket(numeroTicket)
  }

  async function manejarEnvio() {
    if (rutInvalido) return
    setErrorEnvio(null)
    setEnviando(true)

    const idDocumento = generarIdIncidencia()
    const datosReporte = {
      categoria,
      coordenadas,
      direccionTexto,
      detallesAdicionales,
      municipioId: municipio.id,
      nombreCiudadano: quiereDejarDatos ? nombreCiudadano : '',
      contactoCiudadano: quiereDejarDatos ? contactoCiudadano : '',
      rutCiudadano: quiereDejarDatos && rutEscrito ? formatearRut(rutCiudadano) : '',
      esAnonimo: !quiereDejarDatos,
      idDocumento,
    }

    // Pre-chequeo rápido: si el dispositivo ya sabe que no tiene red, no vale la
    // pena ni intentar (ahorra los 15s del timeout). No reemplaza el timeout de
    // más abajo: en zona rural es común estar "conectado" a una red sin salida
    // real a internet, algo que navigator.onLine no detecta.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      encolarSinConexion(datosReporte, fotos.length > 0)
      setEnviando(false)
      return
    }

    try {
      const { numeroTicket } = await conTimeout(
        crearIncidencia({ ...datosReporte, fotosAntes: fotos }),
        15000,
        'Esto está tardando demasiado. Revisa tu conexión a internet e intenta nuevamente.'
      )
      if (datosReporte.rutCiudadano) {
        registrarTicketPorRut(limpiarRut(datosReporte.rutCiudadano), numeroTicket)
      }
      setTicket(numeroTicket)
    } catch (err) {
      if (err.esTimeout) {
        // Las fotos NO se persisten en la cola offline (un File no cabe razonablemente
        // en localStorage) — el reporte se guarda igual, sin ellas.
        encolarSinConexion(datosReporte, fotos.length > 0)
      } else {
        console.error('[FormularioCiudadano] Error al enviar incidencia:', err)
        setErrorEnvio(err.message || 'No se pudo enviar tu reporte. Revisa tu conexión a internet e intenta nuevamente.')
      }
    } finally {
      setEnviando(false)
    }
  }

  function reiniciarFormulario() {
    setPaso(1)
    setCategoria('')
    setDireccionTexto('')
    setDetallesAdicionales('')
    setFotos([])
    setQuiereDejarDatos(false)
    setNombreCiudadano('')
    setRutCiudadano('')
    setContactoCiudadano('')
    setErrorEnvio(null)
    setTicket(null)
    setPendienteSincronizar(false)
    setFotoDescartadaOffline(false)
    setCoordenadas(null)
    setDuplicadoDetectado(null)
    setEsVotoExistente(false)
  }

  // Busca, entre los reportes activos ya cargados para el mapa, el más cercano
  // de la MISMA categoría dentro del radio de duplicado — reusa los datos que
  // ya tiene el mapa, no dispara ninguna consulta nueva.
  function buscarDuplicadoCercano() {
    const candidatos = incidenciasActivas
      .filter((t) => t.categoria === categoria && t.coordenadas?.lat && t.coordenadas?.lng)
      .map((t) => ({ ticket: t, distancia: distanciaMetros(coordenadas, t.coordenadas) }))
      .filter((c) => c.distancia <= RADIO_DUPLICADO_METROS)
      .sort((a, b) => a.distancia - b.distancia)

    return candidatos[0]?.ticket || null
  }

  function manejarSiguiente() {
    if (paso === 2) {
      const cercano = buscarDuplicadoCercano()
      if (cercano) {
        setDuplicadoDetectado(cercano)
        return
      }
    }
    setPaso((p) => p + 1)
  }

  async function manejarSumarseAExistente() {
    // Si este dispositivo ya había votado por esta incidencia antes (ej. desde
    // el mapa), no hay que votar de nuevo: Firestore igual lo rechazaría
    // (arrayUnion con un ID que ya está no suma nada, así que el conteo no
    // avanza en +1 como exige la regla, y devuelve permission-denied) — acá
    // directamente se salta al ticket sin reintentar el voto.
    if (yaVotoPorIncidencia(duplicadoDetectado.incidencia_id)) {
      setEsVotoExistente(true)
      setTicket(duplicadoDetectado.id)
      return
    }

    setVotandoDuplicado(true)
    try {
      await votarIncidencia({
        incidenciaId: duplicadoDetectado.incidencia_id,
        numeroTicket: duplicadoDetectado.id,
        dispositivoId: obtenerIdDispositivo(),
      })
      registrarVotoLocal(duplicadoDetectado.incidencia_id)
      setEsVotoExistente(true)
      setTicket(duplicadoDetectado.id)
    } catch (err) {
      console.error('[FormularioCiudadano] Error al sumarse al reporte existente:', err)
      setErrorEnvio('No se pudo sumar tu voto. Intenta nuevamente o crea un reporte nuevo.')
      setDuplicadoDetectado(null)
    } finally {
      setVotandoDuplicado(false)
    }
  }

  function manejarCrearNuevo() {
    setDuplicadoDetectado(null)
    setPaso((p) => p + 1)
  }

  if (ticket) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
        <div className="w-full">
          <TicketConfirmacion
            numeroTicket={ticket}
            pendienteSincronizar={pendienteSincronizar}
            esVotoExistente={esVotoExistente}
            onReportarOtra={reiniciarFormulario}
          />
          {fotoDescartadaOffline && (
            <p className="mt-3 text-center text-xs text-amber-700">
              La foto no se pudo guardar sin conexión, pero tu reporte sí quedó registrado.
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
      <header className="mb-6">
        <EncabezadoMunicipio municipio={municipio} tituloDefecto="Reportar Incidencia Urbana" />
        <div className="mt-3 flex gap-1.5">
          {Array.from({ length: TOTAL_PASOS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i + 1 <= paso ? 'bg-primary' : 'bg-gray-200'}`}
            />
          ))}
        </div>
      </header>

      <main className="flex-1">
        {duplicadoDetectado ? (
          <AvisoPosibleDuplicado
            ticket={duplicadoDetectado}
            votando={votandoDuplicado}
            onSumarme={manejarSumarseAExistente}
            onCrearNuevo={manejarCrearNuevo}
          />
        ) : (
          <>
            {paso === 1 && (
              <PasoUbicacion
                coordenadas={coordenadas}
                cargando={cargando}
                error={error}
                onObtenerUbicacion={obtenerUbicacion}
                onCambiarCoordenadas={setCoordenadas}
                centroPorDefecto={municipio?.centro_mapa}
                incidenciasCercanas={incidenciasActivas}
                ultimosReportes={ultimosReportes}
              />
            )}
            {paso === 2 && (
              <PasoCategoria
                categoria={categoria}
                direccionTexto={direccionTexto}
                detallesAdicionales={detallesAdicionales}
                onCambiarCategoria={setCategoria}
                onCambiarDireccion={setDireccionTexto}
                onCambiarDetalles={setDetallesAdicionales}
              />
            )}
            {paso === 3 && (
              <PasoFoto
                fotos={fotos}
                onCambiarFotos={setFotos}
                quiereDejarDatos={quiereDejarDatos}
                nombreCiudadano={nombreCiudadano}
                rutCiudadano={rutCiudadano}
                contactoCiudadano={contactoCiudadano}
                onCambiarQuiereDejarDatos={setQuiereDejarDatos}
                onCambiarNombre={setNombreCiudadano}
                onCambiarRut={setRutCiudadano}
                onCambiarContacto={setContactoCiudadano}
              />
            )}
          </>
        )}
      </main>

      {errorEnvio && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{errorEnvio}</span>
        </div>
      )}

      {!duplicadoDetectado && (
        <footer className="mt-6 flex gap-3">
          {paso > 1 && (
            <Boton variante="secundario" onClick={() => setPaso((p) => p - 1)}>
              <ChevronLeft size={18} />
              Atrás
            </Boton>
          )}

          {paso < TOTAL_PASOS ? (
            <Boton className="flex-1" disabled={!puedeAvanzar} onClick={manejarSiguiente}>
              Siguiente
              <ChevronRight size={18} />
            </Boton>
          ) : (
            <Boton className="flex-1" cargando={enviando} disabled={rutInvalido} onClick={manejarEnvio}>
              <Send size={18} />
              Enviar reporte
            </Boton>
          )}
        </footer>
      )}
    </div>
  )
}
