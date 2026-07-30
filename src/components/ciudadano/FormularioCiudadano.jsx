import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Send, AlertTriangle } from 'lucide-react'
import { useGeolocation } from '../../hooks/useGeolocation'
import { crearIncidencia, generarIdIncidencia } from '../../services/incidenciasService'
import { conTimeout } from '../../utils/timeout'
import { generarNumeroTicket } from '../../utils/ticket'
import { guardarReportePendiente } from '../../utils/colaOffline'
import Boton from '../common/Boton'
import EncabezadoMunicipio from '../common/EncabezadoMunicipio'
import PasoUbicacion from './PasoUbicacion'
import PasoCategoria from './PasoCategoria'
import PasoFoto from './PasoFoto'
import TicketConfirmacion from './TicketConfirmacion'

const TOTAL_PASOS = 3

export default function FormularioCiudadano({ municipio }) {
  const [paso, setPaso] = useState(1)
  const [categoria, setCategoria] = useState('')
  const [direccionTexto, setDireccionTexto] = useState('')
  const [detallesAdicionales, setDetallesAdicionales] = useState('')
  const [foto, setFoto] = useState(null)
  const [quiereDejarDatos, setQuiereDejarDatos] = useState(false)
  const [nombreCiudadano, setNombreCiudadano] = useState('')
  const [contactoCiudadano, setContactoCiudadano] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState(null)
  const [ticket, setTicket] = useState(null)
  const [pendienteSincronizar, setPendienteSincronizar] = useState(false)
  const [fotoDescartadaOffline, setFotoDescartadaOffline] = useState(false)

  const [coordenadas, setCoordenadas] = useState(null)
  const { coordenadas: coordenadasGPS, cargando, error, obtenerUbicacion } = useGeolocation()

  // El GPS es una de las dos formas de fijar la ubicación (la otra es tocar el mapa
  // a mano en PasoUbicacion); cuando el GPS responde, adopta esa posición como la actual.
  useEffect(() => {
    if (coordenadasGPS) setCoordenadas(coordenadasGPS)
  }, [coordenadasGPS])

  const previewUrl = useMemo(() => (foto ? URL.createObjectURL(foto) : null), [foto])

  const puedeAvanzar = {
    1: Boolean(coordenadas),
    2: Boolean(categoria),
    3: true, // la foto es opcional
  }[paso]

  function encolarSinConexion(datosReporte, tieneFoto) {
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

    setFotoDescartadaOffline(tieneFoto)
    setPendienteSincronizar(true)
    setTicket(numeroTicket)
  }

  async function manejarEnvio() {
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
      esAnonimo: !quiereDejarDatos,
      idDocumento,
    }

    // Pre-chequeo rápido: si el dispositivo ya sabe que no tiene red, no vale la
    // pena ni intentar (ahorra los 15s del timeout). No reemplaza el timeout de
    // más abajo: en zona rural es común estar "conectado" a una red sin salida
    // real a internet, algo que navigator.onLine no detecta.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      encolarSinConexion(datosReporte, Boolean(foto))
      setEnviando(false)
      return
    }

    try {
      const { numeroTicket } = await conTimeout(
        crearIncidencia({ ...datosReporte, fotoAntes: foto }),
        15000,
        'Esto está tardando demasiado. Revisa tu conexión a internet e intenta nuevamente.'
      )
      setTicket(numeroTicket)
    } catch (err) {
      if (err.esTimeout) {
        // La foto NO se persiste en la cola offline (un File no cabe razonablemente
        // en localStorage) — el reporte se guarda igual, sin ella.
        encolarSinConexion(datosReporte, Boolean(foto))
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
    setFoto(null)
    setQuiereDejarDatos(false)
    setNombreCiudadano('')
    setContactoCiudadano('')
    setErrorEnvio(null)
    setTicket(null)
    setPendienteSincronizar(false)
    setFotoDescartadaOffline(false)
    setCoordenadas(null)
  }

  if (ticket) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
        <div className="w-full">
          <TicketConfirmacion
            numeroTicket={ticket}
            pendienteSincronizar={pendienteSincronizar}
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
        {paso === 1 && (
          <PasoUbicacion
            coordenadas={coordenadas}
            cargando={cargando}
            error={error}
            onObtenerUbicacion={obtenerUbicacion}
            onCambiarCoordenadas={setCoordenadas}
            centroPorDefecto={municipio?.centro_mapa}
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
            foto={foto}
            previewUrl={previewUrl}
            onCambiarFoto={setFoto}
            quiereDejarDatos={quiereDejarDatos}
            nombreCiudadano={nombreCiudadano}
            contactoCiudadano={contactoCiudadano}
            onCambiarQuiereDejarDatos={setQuiereDejarDatos}
            onCambiarNombre={setNombreCiudadano}
            onCambiarContacto={setContactoCiudadano}
          />
        )}
      </main>

      {errorEnvio && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{errorEnvio}</span>
        </div>
      )}

      <footer className="mt-6 flex gap-3">
        {paso > 1 && (
          <Boton variante="secundario" onClick={() => setPaso((p) => p - 1)}>
            <ChevronLeft size={18} />
            Atrás
          </Boton>
        )}

        {paso < TOTAL_PASOS ? (
          <Boton className="flex-1" disabled={!puedeAvanzar} onClick={() => setPaso((p) => p + 1)}>
            Siguiente
            <ChevronRight size={18} />
          </Boton>
        ) : (
          <Boton className="flex-1" cargando={enviando} onClick={manejarEnvio}>
            <Send size={18} />
            Enviar reporte
          </Boton>
        )}
      </footer>
    </div>
  )
}
