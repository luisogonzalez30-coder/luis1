import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Send, AlertTriangle } from 'lucide-react'
import { crearSolicitud, generarIdSolicitud, votarSolicitud } from '../../services/solicitudesService'
import { buscarActivosPorCategoria, suscribirUltimosTickets } from '../../services/ticketsPublicosService'
import { conTimeout } from '../../utils/timeout'
import { generarNumeroTicket } from '../../utils/ticket'
import { guardarReportePendiente } from '../../utils/colaOffline'
import {
  obtenerIdDispositivo,
  registrarVotoLocal,
  yaVotoPorSolicitud,
  registrarReporteLocal,
  segundosParaPoderReportar,
} from '../../utils/dispositivo'
import { TIPO_COMUN, ubicacionValida } from '../../utils/unidades'
import { sugerirCategoria } from '../../services/iaService'
import { esWhatsappValido, normalizarWhatsapp } from '../../utils/telefono'
import Boton from '../common/Boton'
import EncabezadoCondominio from '../common/EncabezadoCondominio'
import PasoUbicacion from './PasoUbicacion'
import PasoCategoria from './PasoCategoria'
import PasoFoto from './PasoFoto'
import TicketConfirmacion from './TicketConfirmacion'
import AvisoPosibleDuplicado from './AvisoPosibleDuplicado'

const TOTAL_PASOS = 3

export default function FormularioResidente({ condominio }) {
  const [paso, setPaso] = useState(1)
  const [categoria, setCategoria] = useState('')
  const [direccionTexto, setDireccionTexto] = useState('')
  const [detallesAdicionales, setDetallesAdicionales] = useState('')
  const [fotos, setFotos] = useState([])
  const [nombreResidente, setNombreResidente] = useState('')
  const [contactoResidente, setContactoResidente] = useState('')
  const [sinConexion, setSinConexion] = useState(typeof navigator !== 'undefined' && !navigator.onLine)
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState(null)
  const [ticket, setTicket] = useState(null)
  const [pendienteSincronizar, setPendienteSincronizar] = useState(false)
  const [fotoDescartadaOffline, setFotoDescartadaOffline] = useState(false)

  const [buscandoDuplicado, setBuscandoDuplicado] = useState(false)
  const [ultimosReportes, setUltimosReportes] = useState([])
  const [duplicadoDetectado, setDuplicadoDetectado] = useState(null)
  const [votandoDuplicado, setVotandoDuplicado] = useState(false)
  const [esVotoExistente, setEsVotoExistente] = useState(false)

  // Revisión de la categoría mirando la foto. Es opcional de punta a punta: si
  // la IA está apagada esto se queda en null y el formulario no cambia en nada.
  const [sugerenciaCategoria, setSugerenciaCategoria] = useState(null)
  const [revisandoFoto, setRevisandoFoto] = useState(false)
  // Para no volver a preguntar por la misma foto si el residente navega entre
  // pasos: cada llamada cuesta plata y la respuesta sería idéntica.
  const fotoRevisadaRef = useRef(null)

  // Dónde ocurre: { tipo, torre, unidad, espacio_comun, etiqueta }.
  //
  // No hay coordenadas, GPS ni geocodificación en este producto, y no es una
  // simplificación: un condominio entero cabe dentro del margen de error del GPS
  // de un celular, que no distingue el piso 3 del 12 ni el estacionamiento 40
  // del 41. Lo que el conserje necesita es la torre y el número, y eso el
  // residente lo sabe de memoria — no hay que deducirlo de un mapa.
  const [ubicacion, setUbicacion] = useState(null)

  // La foto es obligatoria SALVO que el celular esté sin señal: las fotos no se
  // pueden guardar en la cola offline (un File no cabe en localStorage),
  // así que exigirla dejaría a un residente en zona sin cobertura sin poder reportar.
  useEffect(() => {
    const actualizar = () => setSinConexion(!navigator.onLine)
    window.addEventListener('online', actualizar)
    window.addEventListener('offline', actualizar)
    return () => {
      window.removeEventListener('online', actualizar)
      window.removeEventListener('offline', actualizar)
    }
  }, [])

  // Dos suscripciones acotadas, a propósito separadas (antes era una sola sin
  // límite que traía TODOS los tickets del condominio — ver el comentario de
  // MAX_TICKETS_* en ticketsPublicosService.js):
  //  - activos: pines del mapa + chequeo de duplicados. Excluye resueltos en el
  //    servidor, que son los que crecen sin techo.
  //  - últimos 10: el listado "Últimos reportes de la administración" del Paso 1, que
  //    sí quiere mostrar también los resueltos (es lo que da confianza).
  // Ambas vienen ya ordenadas por fecha desde Firestore, sin ordenar en memoria.
  useEffect(() => {
    if (!condominio?.id) return
    return suscribirUltimosTickets(setUltimosReportes, condominio.id, 10)
  }, [condominio?.id])

  // El campo "¿Dónde exactamente?" del Paso 2 llega escrito con la dirección del
  // punto marcado: es la misma información que el residente ya dio en el Paso 1, y
  // volver a pedírsela a mano es la clase de fricción que hace que abandone el
  // formulario. Sigue siendo editable, y de hecho se espera que la complete
  // ("frente a la escuela").
  //
  function cambiarDireccionTexto(valor) {
    setDireccionTexto(valor)
  }

  // Ya nada es opcional en el formulario (decisión del usuario): la
  // condominio necesita saber DÓNDE exactamente, QUÉ pasa, cómo se ve, y a
  // quién llamar. La única excepción es la foto sin señal (ver arriba).
  const contactoValido = esWhatsappValido(contactoResidente)
  const datosCompletos = nombreResidente.trim().length >= 2 && contactoValido
  const fotoLista = fotos.length > 0 || sinConexion

  const puedeAvanzar = {
    1: ubicacionValida(ubicacion),
    2: Boolean(categoria) && direccionTexto.trim().length >= 3 && detallesAdicionales.trim().length >= 5,
    3: fotoLista && datosCompletos,
  }[paso]

  function encolarSinConexion(datosReporte, tieneFotos) {
    const numeroTicket = generarNumeroTicket()
    const idLocal = guardarReportePendiente({ ...datosReporte, numeroTicketExistente: numeroTicket })

    if (!idLocal) {
      // El dispositivo no pudo guardar en localStorage (modo privado / sin espacio):
      // no hay garantía de reintento automático, hay que ser honestos sobre eso.
      setErrorEnvio(
        `No pudimos guardar tu reporte en este dispositivo para reintentar más tarde. Anota este número y avísale a la administración directamente: ${numeroTicket}`
     )
      return
    }

    // Para el residente esto ya fue "enviar un reporte", así que corre el mismo
    // enfriamiento aunque todavía esté en la cola offline.
    registrarReporteLocal()
    setFotoDescartadaOffline(tieneFotos)
    setPendienteSincronizar(true)
    setTicket(numeroTicket)
  }

  async function manejarEnvio() {
    if (!puedeAvanzar) return
    setErrorEnvio(null)

    // Enfriamiento anti-spam: se avisa acá para no mandar al residente contra un
    // "permiso denegado" incomprensible. El límite real lo aplica el servidor
    // (firestore.rules), esto es solo el mensaje amableconst esperar = segundosParaPoderReportar()
    if (esperar > 0) {
      setErrorEnvio(
        `Acabas de enviar un reporte. Espera ${esperar} segundo${esperar === 1 ? '' : 's'} antes de enviar otro.`
     )
      return
    }

    setEnviando(true)

    const idDocumento = generarIdSolicitud()
    const datosReporte = {
      categoria,
      ubicacion,
      direccionTexto,
      detallesAdicionales,
      condominioId: condominio.id,
      nombreResidente: nombreResidente.trim(),
      // Siempre en formato "+569XXXXXXXX", venga como venga escrito — así el bot
      // puede mandarle WhatsApp y buscar sus reportes sin normalizar de nuevo.
      contactoResidente: normalizarWhatsapp(contactoResidente),
      esAnonimo: false,
      idDocumento,
      dispositivoId: obtenerIdDispositivo(),
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
        crearSolicitud({ ...datosReporte, fotosAntes: fotos }),
        15000,
        'Esto está tardando demasiado. Revisa tu conexión a internet e intenta nuevamente.'
     )
      registrarReporteLocal()
      setTicket(numeroTicket)
    } catch (err) {
      if (err.esTimeout) {
        // Las fotos NO se persisten en la cola offline (un File no cabe razonablemente
        // en localStorage) — el reporte se guarda igual, sin ellas.
        encolarSinConexion(datosReporte, fotos.length > 0)
      } else if (err.code === 'permission-denied') {
        // Firestore contesta "Missing or insufficient permissions." en inglés y
        // sin decir por qué. Al residente eso no le dice nada —lo vio en pantalla
        // el 10-ago-2026 y parecía un error de la app— así que se traduce a la
        // causa que de verdad ocurre: el enfriamiento anti-spam de 60 s.
        // El motivo técnico queda en la consola para poder diagnosticar.
        console.error('[FormularioResidente] Firestore rechazó la escritura del reporte:', err)
        setErrorEnvio(
          'No pudimos registrar tu reporte. Si acabas de enviar otro, espera un minuto e intenta de nuevo. ' +
            'Si vuelve a pasar, avísale a la administración.'
       )
      } else {
        console.error('[FormularioResidente] Error al enviar solicitud:', err)
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
    setNombreResidente('')
    setContactoResidente('')
    setErrorEnvio(null)
    setTicket(null)
    setPendienteSincronizar(false)
    setFotoDescartadaOffline(false)
    setUbicacion(null)
    setSugerenciaCategoria(null)
    setRevisandoFoto(false)
    fotoRevisadaRef.current = null
    setDuplicadoDetectado(null)
    setEsVotoExistente(false)
  }

  // Cuando el residente sube su primera foto, se le pide a la IA que mire si la
  // categoría que eligió calza con lo que se ve.
  //
  // Va en el Paso 3 y no en el 2 porque ese es el orden del formulario: la foto
  // llega DESPUÉS de elegir la categoría. Eso resultó ser lo mejor igual — así
  // la IA no adivina en el vacío, sino que revisa una decisión ya tomada, y
  // solo habla cuando discrepa.
  useEffect(() => {
    const foto = fotos[0]

    if (!foto || !categoria) {
      setSugerenciaCategoria(null)
      return
    }

    // Misma foto que ya se revisó: no se vuelve a preguntar.
    if (fotoRevisadaRef.current === foto) return
    fotoRevisadaRef.current = foto

    let vigente = true
    setRevisandoFoto(true)

    sugerirCategoria({ foto, descripcion: detallesAdicionales })
      .then((sugerencia) => {
        // Si el residente ya cambió de foto mientras esto respondía, se descarta:
        // mostrar la sugerencia de una foto que ya no está sería confuso.
        if (vigente) setSugerenciaCategoria(sugerencia)
      })
      .finally(() => {
        if (vigente) setRevisandoFoto(false)
      })

    return () => {
      vigente = false
    }
    // detallesAdicionales queda fuera a propósito: si estuviera, cada tecla que
    // escribe el residente dispararía una llamada nueva. Se usa el texto que haya
    // al momento de subir la foto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotos, categoria])

  function aceptarSugerenciaCategoria(nuevaCategoria) {
    setCategoria(nuevaCategoria)
    setSugerenciaCategoria(null)
  }

  function descartarSugerenciaCategoria() {
    setSugerenciaCategoria(null)
  }

  // Duplicados: el mismo problema reportado por varios residentes.
  //
  // Solo se agrupa lo que ocurre en un ESPACIO COMÚN, y ahí está el 100% del
  // caso real: el ascensor detenido lo reportan cuarenta personas en diez
  // minutos, y sin esto la administración abre cuarenta tickets del mismo
  // ascensor.
  //
  // Lo que ocurre dentro de una unidad no se agrupa nunca, y es una decisión de
  // privacidad, no una limitación pendiente: la torre y el número identifican al
  // hogar, así que no salen de la solicitud (ver datosTicketPublico) y acá no
  // hay con qué compararlos. Tampoco debería haberlo — juntar "ruidos molestos
  // en Torre B · 402" con el reporte de otro vecino sería contarle a un tercero,
  // sin login, quién reclamó de quién.
  async function buscarDuplicadoCercano() {
    if (ubicacion?.tipo !== TIPO_COMUN) return null

    const activos = await buscarActivosPorCategoria(condominio?.id, categoria)
    if (!activos) return null

    return activos.find((t) => t.ubicacion_publica === ubicacion.espacio_comun) || null
  }

  async function manejarSiguiente() {
    if (paso === 2) {
      // El bloqueo va acá y no solo en el botón: la consulta tarda, y sin esto
      // un segundo toque avanzaría de paso saltándose la comprobación entera.
      if (buscandoDuplicado) return
      setBuscandoDuplicado(true)
      try {
        const cercano = await buscarDuplicadoCercano()
        if (cercano) {
          setDuplicadoDetectado(cercano)
          return
        }
      } finally {
        setBuscandoDuplicado(false)
      }
    }
    setPaso((p) => p + 1)
  }

  async function manejarSumarseAExistente() {
    // Si este dispositivo ya había votado por esta solicitud antes (ej. desde
    // el mapa), no hay que votar de nuevo: Firestore igual lo rechazaría
    // (arrayUnion con un ID que ya está no suma nada, así que el conteo no
    // avanza en +1 como exige la regla, y devuelve permission-denied) — acá
    // directamente se salta al ticket sin reintentar el voto.
    if (yaVotoPorSolicitud(duplicadoDetectado.solicitud_id)) {
      setEsVotoExistente(true)
      setTicket(duplicadoDetectado.id)
      return
    }

    setVotandoDuplicado(true)
    try {
      await votarSolicitud({
        solicitudId: duplicadoDetectado.solicitud_id,
        numeroTicket: duplicadoDetectado.id,
        dispositivoId: obtenerIdDispositivo(),
      })
      registrarVotoLocal(duplicadoDetectado.solicitud_id)
      setEsVotoExistente(true)
      setTicket(duplicadoDetectado.id)
    } catch (err) {
      console.error('[FormularioResidente] Error al sumarse al reporte existente:', err)
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
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-gradient-to-b from-primary/[0.04] to-transparent px-4 py-6">
      <header className="mb-6">
        <EncabezadoCondominio condominio={condominio} tituloDefecto="Reportar Solicitud Urbana" />
        <div className="mt-4 flex gap-1.5">
          {Array.from({ length: TOTAL_PASOS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i + 1 <= paso ? 'bg-gradient-to-r from-primary to-primary-dark' : 'bg-gray-200'
              }`}
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
                condominio={condominio}
                ubicacion={ubicacion}
                onCambiar={setUbicacion}
                ultimosReportes={ultimosReportes}
              />
           )}
            {paso === 2 && (
              <PasoCategoria
                categoria={categoria}
                direccionTexto={direccionTexto}
                detallesAdicionales={detallesAdicionales}
                onCambiarCategoria={setCategoria}
                onCambiarDireccion={cambiarDireccionTexto}
                onCambiarDetalles={setDetallesAdicionales}
              />
           )}
            {paso === 3 && (
              <PasoFoto
                fotos={fotos}
                onCambiarFotos={setFotos}
                nombreResidente={nombreResidente}
                contactoResidente={contactoResidente}
                onCambiarNombre={setNombreResidente}
                onCambiarContacto={setContactoResidente}
                sinConexion={sinConexion}
                condominioSlug={condominio.id}
                categoria={categoria}
                sugerenciaCategoria={sugerenciaCategoria}
                revisandoFoto={revisandoFoto}
                onAceptarSugerencia={aceptarSugerenciaCategoria}
                onDescartarSugerencia={descartarSugerenciaCategoria}
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
            <Boton
              className="flex-1"
              disabled={!puedeAvanzar}
              cargando={buscandoDuplicado}
              onClick={manejarSiguiente}
            >
              Siguiente
              <ChevronRight size={18} />
            </Boton>
         ) : (
            <Boton className="flex-1" cargando={enviando} disabled={!puedeAvanzar} onClick={manejarEnvio}>
              <Send size={18} />
              Enviar reporte
            </Boton>
         )}
        </footer>
     )}

      {/* Transparencia y consulta de reportes ya viven en la barra inferior;
          acá quedan solo los textos legales, que tienen que ser alcanzables
          desde donde el residente entrega sus datos (Ley 21.719). */}
      <nav className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-1 border-t border-borde pt-4 text-xs text-tinta-tenue">
        <Link to={`/${condominio.id}/privacidad`} className="hover:text-primary hover:underline">
          Política de privacidad
        </Link>
        <Link to={`/${condominio.id}/terminos`} className="hover:text-primary hover:underline">
          Términos de servicio
        </Link>
      </nav>
    </div>
 )
}
