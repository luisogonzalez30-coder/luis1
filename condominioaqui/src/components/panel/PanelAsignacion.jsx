import { useState } from 'react'
import { X, User, Check, MessageCircle } from 'lucide-react'
import BadgeEstado from '../common/BadgeEstado'
import BadgeGravedad from '../common/BadgeGravedad'
import EtiquetaUbicacion from '../common/EtiquetaUbicacion'
import GaleriaFotos from '../common/GaleriaFotos'
import ListaSeguimientos from '../common/ListaSeguimientos'
import Boton from '../common/Boton'
import { asignarEquipo } from '../../services/solicitudesService'
import { conTimeout } from '../../utils/timeout'
import { etiquetaCategoria } from '../../utils/categorias'

export default function PanelAsignacion({ solicitud, equipos = [], onCerrar }) {
  const [equipo, setEquipo] = useState(solicitud.equipo_asignado || '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [listo, setListo] = useState(false)

  // Si el equipo elegida es la que ya estaba, no hay nada que guardar. Antes
  // el botón se podía apretar igual y "no hacía nada" a la vista —el usuario lo
  // reportó así el 12-ago-2026— pero por dentro sí escribía, y lo que escribía
  // hacía daño: reseteaba fecha_asignacion. Ese campo es el que mide el tiempo
  // de reacción y alimenta la tarjeta de "atrasados" del panel, así que apretar
  // el botón en un caso viejo lo dejaba pareciendo recién asignado. Un botón que
  // no cambia nada tiene que estar apagado, no silencioso.
  const yaAsignadaAEsta = solicitud.equipo_asignado === equipo
  const sinCambios = yaAsignadaAEsta && solicitud.estado !== 'Pendiente'

  // Solo dígitos con código de país, que es lo que espera wa.me. El contacto se
  // guarda normalizado como "+56912345678" desde la documentación, pero los reportes
  // anteriores traen lo que el residente escribió, así que se limpia igual.
  const telefonoResidente = (solicitud.contacto_residente || '').replace(/\D/g, '')
  const enlaceWhatsapp =
    `https://wa.me/${telefonoResidente}?text=` +
    encodeURIComponent(
      `Hola${solicitud.nombre_residente ? ` ${solicitud.nombre_residente.split(' ')[0]}` : ''}, ` +
        `le escribimos de la administración por su reporte ${solicitud.numero_ticket} ` +
        `(${solicitud.direccion_texto || 'el que nos envió'}). `
   )

  async function manejarAsignar() {
    setError(null)
    setListo(false)
    setGuardando(true)
    try {
      await conTimeout(
        asignarEquipo(solicitud, equipo),
        15000,
        'Esto está tardando demasiado. Revisa tu conexión a internet e intenta nuevamente.'
     )
      // Confirmación explícita: el panel no se cierra solo (el usuario suele
      // seguir mirando la foto), así que sin esto no había forma de saber si la
      // acción se guardó.
      setListo(true)
    } catch (err) {
      console.error('[PanelAsignacion] Error al asignar equipo:', err)
      setError(err.message || 'No se pudo asignar el equipo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    // "fixed" (no "absolute"): así ocupa siempre el alto completo de la pantalla
    // y tiene su propio scroll. Antes quedaba encajado en el contenedor del
    // mapa y, si ese contenedor era bajo, el panel se cortaba y no se podía
    // llegar al botón de asignar.
    <div className="fixed inset-y-0 right-0 z-[1000] flex w-full max-w-sm flex-col overflow-y-auto border-l border-gray-200 bg-white p-4 shadow-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{etiquetaCategoria(solicitud.categoria)}</h3>
          <div className="mt-1 flex gap-1.5">
            <BadgeEstado estado={solicitud.estado} />
            <BadgeGravedad nivel={solicitud.nivel_gravedad} />
          </div>
        </div>
        <button onClick={onCerrar} className="rounded-full p-1 hover:bg-gray-100" aria-label="Cerrar">
          <X size={20} />
        </button>
      </div>

      <EtiquetaUbicacion ubicacion={solicitud.ubicacion} referencia={solicitud.direccion_texto} className="mt-3" />

      {solicitud.detalles_adicionales && (
        <p className="mt-2 rounded-lg bg-gray-50 p-2 text-sm text-gray-600">{solicitud.detalles_adicionales}</p>
     )}

      {!solicitud.es_anonimo && (solicitud.nombre_residente || solicitud.contacto_residente) && (
        <div className="mt-2 flex items-start gap-2 rounded-lg bg-blue-50 p-2 text-sm text-blue-800">
          <User size={16} className="mt-0.5 shrink-0" />
          <span>
            {solicitud.nombre_residente || 'Sin nombre'}
            {solicitud.contacto_residente && ` · ${solicitud.contacto_residente}`}
          </span>
        </div>
     )}

      <GaleriaFotos urls={solicitud.fotos_antes_urls} alt="Foto reportada por el residente" className="mt-3" />
      <ListaSeguimientos solicitudId={solicitud.id} />

      <div className="mt-5">
        <label className="mb-1 block text-sm font-medium text-gray-700">Equipo asignada</label>
        {equipos.length === 0 ? (
          <p className="text-sm text-gray-400">
            Tu condominio todavía no tiene equipos configuradas. Contacta al administrador.
          </p>
       ) : (
          <select
            value={equipo}
            onChange={(e) => setEquipo(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-2.5"
          >
            <option value="">Selecciona un equipo</option>
            {equipos.map((c) => (
              <option key={c} value={c}>{c}</option>
           ))}
          </select>
       )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {listo && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-estado-bueno">
          <Check size={16} className="shrink-0" />
          Asignada a {equipo}. El residente queda informado.
        </p>
     )}

      <Boton
        className="mt-4 w-full"
        cargando={guardando}
        disabled={!equipo || solicitud.estado === 'Resuelto' || sinCambios}
        onClick={manejarAsignar}
      >
        {solicitud.estado === 'Pendiente'
          ? 'Asignar equipo'
          : sinCambios
            ? `Ya está con ${solicitud.equipo_asignado}`
            : `Reasignar a ${equipo}`}
      </Boton>

      {/* Lo que de verdad le falta al panel cuando el caso ya está asignado: una
          forma de hablar con quien reportó. El teléfono estaba ahí arriba pero
          como texto, para copiarlo a mano. Con el mensaje precargado —número de
          ticket y de qué se trata— el usuario no tiene que explicar quién es
          ni buscar el caso. Es un link wa.me, sin backend ni costo de plantilla:
          lo abre la app de WhatsApp del propio usuario. */}
      {telefonoResidente && solicitud.estado !== 'Resuelto' && (
        <a
          href={enlaceWhatsapp}
          target="_blank"
          rel="noreferrer"
          className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-tinta-fuerte/[0.06] px-4 py-3 font-medium text-tinta transition-colors hover:bg-tinta-fuerte/[0.1]"
        >
          <MessageCircle size={18} />
          Escribirle a {solicitud.nombre_residente?.split(' ')[0] || 'quien reportó'}
        </a>
     )}
    </div>
 )
}
