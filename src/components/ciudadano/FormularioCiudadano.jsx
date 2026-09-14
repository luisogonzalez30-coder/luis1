import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Send, AlertTriangle } from 'lucide-react'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useDireccionInversa } from '../../hooks/useDireccionInversa'
import { crearIncidencia, generarIdIncidencia, votarIncidencia } from '../../services/incidenciasService'
import { buscarActivosPorCategoria, suscribirTicketsActivos, suscribirUltimosTickets } from '../../services/ticketsPublicosService'
import { conTimeout } from '../../utils/timeout'
import { generarNumeroTicket } from '../../utils/ticket'
import { guardarReportePendiente } from '../../utils/colaOffline'
import {
  obtenerIdDispositivo,
  registrarVotoLocal,
  yaVotoPorIncidencia,
  registrarReporteLocal,
  segundosParaPoderReportar,
} from '../../utils/dispositivo'
import { distanciaMetros } from '../../utils/distancia'
import { sugerirCategoria, esElMismoProblema } from '../../services/iaService'
import { esWhatsappValido, normalizarWhatsapp } from '../../utils/telefono'
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
  const [nombreCiudadano, setNombreCiudadano] = useState('')
  const [contactoCiudadano, setContactoCiudadano] = useState('')
  const [sinConexion, setSinConexion] = useState(typeof navigator !== 'undefined' && !navigator.onLine)
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState(null)
  const [ticket, setTicket] = useState(null)
  const [pendienteSincronizar, setPendienteSincronizar] = useState(false)
  const [fotoDescartadaOffline, setFotoDescartadaOffline] = useState(false)

  const [incidenciasActivas, setIncidenciasActivas] = useState([])
  const [buscandoDuplicado, setBuscandoDuplicado] = useState(false)
  const [ultimosReportes, setUltimosReportes] = useState([])
  const [duplicadoDetectado, setDuplicadoDetectado] = useState(null)
  const [votandoDuplicado, setVotandoDuplicado] = useState(false)
  const [esVotoExistente, setEsVotoExistente] = useState(false)

  // Revisión de la categoría mirando la foto. Es opcional de punta a punta: si
  // la IA está apagada esto se queda en null y el formulario no cambia en nada.
  const [sugerenciaCategoria, setSugerenciaCategoria] = useState(null)
  const [revisandoFoto, setRevisandoFoto] = useState(false)
  // Para no volver a preguntar por la misma foto si el vecino navega entre
  // pasos: cada llamada cuesta plata y la respuesta sería idéntica.
  const fotoRevisadaRef = useRef(null)

  const [coordenadas, setCoordenadas] = useState(null)
  // Dirección que el vecino eligió en el buscador del Paso 1 (ver
  // BuscadorDireccion.jsx). Se guarda aparte de la geocodificación inversa
  // porque le gana: si eligió "Los Aromos 320" de la lista, esa es la dirección
  // que quiso decir, aunque el punto reverse-geocodifique con otro nombre.
  const [direccionElegida, setDireccionElegida] = useState(null)
  // Punto al que el mapa tiene que moverse, con un `id` que cambia en cada
  // pedido: solo lo fijan el GPS y el buscador, nunca un toque en el mapa (ver
  // CentradorMapa en MapaSeleccionUbicacion.jsx).
  const [enfoqueMapa, setEnfoqueMapa] = useState(null)
  const { coordenadas: coordenadasGPS, cargando, error, obtenerUbicacion } = useGeolocation()

  // La geocodificación inversa solo corre cuando el punto lo puso el GPS o un
  // toque en el mapa: si el vecino eligió la dirección de la lista, ya la
  // sabemos y preguntarla de nuevo sería gastar una petición al aire.
  const { direccion: direccionInversa, cargando: buscandoDireccion } = useDireccionInversa(coordenadas, {
    activo: !direccionElegida,
  })
  const direccionDelPunto = direccionElegida?.texto || direccionInversa

  // El GPS es una de las tres formas de fijar la ubicación (las otras son
  // escribir la dirección y tocar el mapa a mano, ambas en PasoUbicacion);
  // cuando el GPS responde, adopta esa posición como la actual y lleva el mapa
  // ahí. La dirección elegida a mano se descarta: el punto ya es otro.
  useEffect(() => {
    if (!coordenadasGPS) return
    setCoordenadas(coordenadasGPS)
    setDireccionElegida(null)
    setEnfoqueMapa({ ...coordenadasGPS, zoom: 17, id: Date.now() })
  }, [coordenadasGPS])

  // Un toque o un arrastre en el mapa es la ubicación más precisa que hay (el
  // vecino está señalando el problema con el dedo), así que invalida la
  // dirección que se hubiera elegido antes en el buscador.
  function fijarCoordenadasDesdeMapa(nuevas) {
    setCoordenadas(nuevas)
    setDireccionElegida(null)
  }

  function elegirDireccionBuscada(resultado) {
    setCoordenadas(resultado.coordenadas)
    setDireccionElegida({ texto: resultado.etiqueta, aproximada: resultado.aproximada })
    // Un sector o una localidad se muestran más alejados a propósito: el punto
    // exacto está en algún lugar alrededor de ese centro, y el vecino necesita
    // ver el entorno para poder mover el pin.
    setEnfoqueMapa({ ...resultado.coordenadas, zoom: resultado.aproximada ? 15 : 17, id: Date.now() })
  }

  // La foto es obligatoria SALVO que el celular esté sin señal: las fotos no se
  // pueden guardar en la cola offline (un File no cabe en localStorage, ver §10),
  // así que exigirla dejaría a un vecino en zona sin cobertura sin poder reportar.
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

  // El campo "¿Dónde exactamente?" del Paso 2 llega escrito con la dirección del
  // punto marcado: es la misma información que el vecino ya dio en el Paso 1, y
  // volver a pedírsela a mano es la clase de fricción que hace que abandone el
  // formulario. Sigue siendo editable, y de hecho se espera que la complete
  // ("frente a la escuela").
  //
  // El ref es lo que garantiza que su texto nunca se sobreescriba: en cuanto
  // toca el campo, deja de aceptar sugerencias. Va en ref y no en estado porque
  // lo lee el efecto de abajo, que no debe volver a correr cuando el vecino
  // escribe.
  const direccionEditadaAMano = useRef(false)
  const [direccionAutocompletada, setDireccionAutocompletada] = useState(false)

  function cambiarDireccionTexto(valor) {
    direccionEditadaAMano.current = true
    setDireccionAutocompletada(false)
    setDireccionTexto(valor)
  }

  useEffect(() => {
    if (!direccionDelPunto || direccionEditadaAMano.current) return
    setDireccionTexto(direccionDelPunto)
    setDireccionAutocompletada(true)
  }, [direccionDelPunto])

  // Ya nada es opcional en el formulario (decisión del usuario, ver §29): la
  // municipalidad necesita saber DÓNDE exactamente, QUÉ pasa, cómo se ve, y a
  // quién llamar. La única excepción es la foto sin señal (ver arriba).
  const contactoValido = esWhatsappValido(contactoCiudadano)
  const datosCompletos = nombreCiudadano.trim().length >= 2 && contactoValido
  const fotoLista = fotos.length > 0 || sinConexion

  const puedeAvanzar = {
    1: Boolean(coordenadas),
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
        `No pudimos guardar tu reporte en este dispositivo para reintentar más tarde. Anota este número y contacta a la municipalidad directamente: ${numeroTicket}`
      )
      return
    }

    // Para el vecino esto ya fue "enviar un reporte", así que corre el mismo
    // enfriamiento aunque todavía esté en la cola offline.
    registrarReporteLocal()
    setFotoDescartadaOffline(tieneFotos)
    setPendienteSincronizar(true)
    setTicket(numeroTicket)
  }

  async function manejarEnvio() {
    if (!puedeAvanzar) return
    setErrorEnvio(null)

    // Enfriamiento anti-spam: se avisa acá para no mandar al vecino contra un
    // "permiso denegado" incomprensible. El límite real lo aplica el servidor
    // (firestore.rules), esto es solo el mensaje amable — ver §28.
    const esperar = segundosParaPoderReportar()
    if (esperar > 0) {
      setErrorEnvio(
        `Acabas de enviar un reporte. Espera ${esperar} segundo${esperar === 1 ? '' : 's'} antes de enviar otro.`
      )
      return
    }

    setEnviando(true)

    const idDocumento = generarIdIncidencia()
    const datosReporte = {
      categoria,
      coordenadas,
      direccionTexto,
      detallesAdicionales,
      municipioId: municipio.id,
      nombreCiudadano: nombreCiudadano.trim(),
      // Siempre en formato "+569XXXXXXXX", venga como venga escrito — así el bot
      // puede mandarle WhatsApp y buscar sus reportes sin normalizar de nuevo.
      contactoCiudadano: normalizarWhatsapp(contactoCiudadano),
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
        crearIncidencia({ ...datosReporte, fotosAntes: fotos }),
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
        // sin decir por qué. Al vecino eso no le dice nada —lo vio en pantalla
        // el 10-ago-2026 y parecía un error de la app— así que se traduce a la
        // causa que de verdad ocurre: el enfriamiento anti-spam de 60 s (§28).
        // El motivo técnico queda en la consola para poder diagnosticar.
        console.error('[FormularioCiudadano] Firestore rechazó la escritura del reporte:', err)
        setErrorEnvio(
          'No pudimos registrar tu reporte. Si acabas de enviar otro, espera un minuto e intenta de nuevo. ' +
            'Si vuelve a pasar, avísale a la municipalidad.'
        )
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
    setNombreCiudadano('')
    setContactoCiudadano('')
    setErrorEnvio(null)
    setTicket(null)
    setPendienteSincronizar(false)
    setFotoDescartadaOffline(false)
    setCoordenadas(null)
    setDireccionElegida(null)
    setSugerenciaCategoria(null)
    setRevisandoFoto(false)
    fotoRevisadaRef.current = null
    setEnfoqueMapa(null)
    direccionEditadaAMano.current = false
    setDireccionAutocompletada(false)
    setDuplicadoDetectado(null)
    setEsVotoExistente(false)
  }

  // Cuando el vecino sube su primera foto, se le pide a la IA que mire si la
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
        // Si el vecino ya cambió de foto mientras esto respondía, se descarta:
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
    // escribe el vecino dispararía una llamada nueva. Se usa el texto que haya
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

  // Elige, de una lista de tickets, el más cercano dentro del radio de duplicado.
  function masCercanoDentroDelRadio(tickets) {
    const candidatos = tickets
      .filter((t) => t.categoria === categoria && t.coordenadas?.lat && t.coordenadas?.lng)
      .map((t) => ({ ticket: t, distancia: distanciaMetros(coordenadas, t.coordenadas) }))
      .filter((c) => c.distancia <= RADIO_DUPLICADO_METROS)
      .sort((a, b) => a.distancia - b.distancia)

    return candidatos[0]?.ticket || null
  }

  // Busca un reporte activo de la MISMA categoría a menos de 50 m.
  //
  // Preferimos preguntarle al servidor acotando por categoría: la ventana que
  // alimenta el mapa mezcla todas las categorías, así que de los tickets
  // cargados solo una fracción sirve para comparar, y agrandarla para
  // compensar le cuesta lecturas a CADA visita (ver MAX_TICKETS_ACTIVOS).
  //
  // Si esa consulta no se puede hacer —el índice compuesto todavía se está
  // construyendo— devuelve null, y ahí sí caemos a la ventana del mapa. Peor
  // que la consulta acotada, pero es exactamente lo que había antes: se pierde
  // precisión, no funcionalidad.
  // Candidatos cercanos que NO son de la categoría elegida. Son los que la
  // comparación por categoría exacta deja pasar.
  function cercanosDeOtraCategoria() {
    return incidenciasActivas
      .filter((t) => t.categoria !== categoria && t.coordenadas?.lat && t.coordenadas?.lng)
      .map((t) => ({ ticket: t, distancia: distanciaMetros(coordenadas, t.coordenadas) }))
      .filter((c) => c.distancia <= RADIO_DUPLICADO_METROS)
      .sort((a, b) => a.distancia - b.distancia)
  }

  async function buscarDuplicadoCercano() {
    const porCategoria = await buscarActivosPorCategoria(municipio?.id, categoria)
    const mismoNombre = masCercanoDentroDelRadio(porCategoria || incidenciasActivas)
    if (mismoNombre) return mismoNombre

    // El hueco que esto cierra: hasta acá solo se comparan reportes de la MISMA
    // categoría, así que si un vecino reporta "Bache" y otro "Pavimento
    // deteriorado" sobre el mismo hoyo, salen dos tickets y la cuadrilla va dos
    // veces. Como Haversine ya filtró por cercanía, a la IA solo le llegan uno o
    // dos finalistas — por eso esto cuesta centavos y no corre en la mayoría de
    // los reportes.
    const candidatos = cercanosDeOtraCategoria()
    if (candidatos.length === 0) return null

    const candidato = candidatos[0]
    const veredicto = await esElMismoProblema({
      nuevo: {
        categoria,
        descripcion: detallesAdicionales,
        direccion: direccionTexto,
      },
      // Del reporte que ya existe solo van los campos PÚBLICOS. En particular
      // NO va `detalles_adicionales`: ese campo está deliberadamente fuera de
      // tickets_publicos porque es texto libre y puede mencionar personas (ver
      // datosTicketPublico en ticketsPublicosService.js). Pedirlo acá habría
      // devuelto siempre vacío, y peor, habría invitado a "arreglarlo"
      // agregándolo — que sería filtrarle datos personales a un tercero.
      // La comparación funciona igual con categoría, lugar y distancia.
      existente: {
        categoria: candidato.ticket.categoria,
        direccion: candidato.ticket.direccion_texto || '',
        distancia_metros: candidato.distancia,
      },
    })

    // Sin veredicto (IA apagada, caída o en duda) se sigue como antes: se crea
    // un reporte nuevo. Nunca se fusiona por defecto — juntar dos problemas
    // reales en un solo ticket hace que uno de los dos no se arregle nunca.
    return veredicto?.esElMismo ? candidato.ticket : null
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
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-gradient-to-b from-primary/[0.04] to-transparent px-4 py-6">
      <header className="mb-6">
        <EncabezadoMunicipio municipio={municipio} tituloDefecto="Reportar Incidencia Urbana" />
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
                coordenadas={coordenadas}
                cargando={cargando}
                error={error}
                onObtenerUbicacion={obtenerUbicacion}
                onCambiarCoordenadas={fijarCoordenadasDesdeMapa}
                onElegirDireccion={elegirDireccionBuscada}
                municipio={municipio}
                sinConexion={sinConexion}
                enfoqueMapa={enfoqueMapa}
                direccionAproximada={direccionDelPunto}
                buscandoDireccion={buscandoDireccion}
                pedirAjustarPin={Boolean(direccionElegida?.aproximada)}
                incidenciasCercanas={incidenciasActivas}
                ultimosReportes={ultimosReportes}
              />
            )}
            {paso === 2 && (
              <PasoCategoria
                categoria={categoria}
                direccionTexto={direccionTexto}
                detallesAdicionales={detallesAdicionales}
                direccionAutocompletada={direccionAutocompletada}
                onCambiarCategoria={setCategoria}
                onCambiarDireccion={cambiarDireccionTexto}
                onCambiarDetalles={setDetallesAdicionales}
              />
            )}
            {paso === 3 && (
              <PasoFoto
                fotos={fotos}
                onCambiarFotos={setFotos}
                nombreCiudadano={nombreCiudadano}
                contactoCiudadano={contactoCiudadano}
                onCambiarNombre={setNombreCiudadano}
                onCambiarContacto={setContactoCiudadano}
                sinConexion={sinConexion}
                municipioSlug={municipio.id}
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
          desde donde el vecino entrega sus datos (Ley 21.719). */}
      <nav className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-1 border-t border-borde pt-4 text-xs text-tinta-tenue">
        <Link to={`/${municipio.id}/privacidad`} className="hover:text-primary hover:underline">
          Política de privacidad
        </Link>
        <Link to={`/${municipio.id}/terminos`} className="hover:text-primary hover:underline">
          Términos de servicio
        </Link>
      </nav>
    </div>
  )
}
