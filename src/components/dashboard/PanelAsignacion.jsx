import { useState } from 'react'
import { X, User, Check, MessageCircle, Signpost } from 'lucide-react'
import BadgeEstado from '../common/BadgeEstado'
import BadgeGravedad from '../common/BadgeGravedad'
import EnlaceGoogleMaps from '../common/EnlaceGoogleMaps'
import GaleriaFotos from '../common/GaleriaFotos'
import ListaSeguimientos from '../common/ListaSeguimientos'
import Boton from '../common/Boton'
import { asignarCuadrilla } from '../../services/incidenciasService'
import { conTimeout } from '../../utils/timeout'
import { etiquetaCategoria } from '../../utils/categorias'

export default function PanelAsignacion({ incidencia, cuadrillas = [], onCerrar }) {
  const [cuadrilla, setCuadrilla] = useState(incidencia.cuadrilla_asignada || '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [listo, setListo] = useState(false)

  // Si la cuadrilla elegida es la que ya estaba, no hay nada que guardar. Antes
  // el botón se podía apretar igual y "no hacía nada" a la vista —el usuario lo
  // reportó así el 12-ago-2026— pero por dentro sí escribía, y lo que escribía
  // hacía daño: reseteaba fecha_asignacion. Ese campo es el que mide el tiempo
  // de reacción y alimenta la tarjeta de "atrasados" del panel, así que apretar
  // el botón en un caso viejo lo dejaba pareciendo recién asignado. Un botón que
  // no cambia nada tiene que estar apagado, no silencioso.
  const yaAsignadaAEsta = incidencia.cuadrilla_asignada === cuadrilla
  const sinCambios = yaAsignadaAEsta && incidencia.estado !== 'Pendiente'

  // Solo dígitos con código de país, que es lo que espera wa.me. El contacto se
  // guarda normalizado como "+56912345678" desde §29, pero los reportes
  // anteriores traen lo que el vecino escribió, así que se limpia igual.
  const telefonoVecino = (incidencia.contacto_ciudadano || '').replace(/\D/g, '')
  const enlaceWhatsapp =
    `https://wa.me/${telefonoVecino}?text=` +
    encodeURIComponent(
      `Hola${incidencia.nombre_ciudadano ? ` ${incidencia.nombre_ciudadano.split(' ')[0]}` : ''}, ` +
        `le escribimos de la municipalidad por su reporte ${incidencia.numero_ticket} ` +
        `(${incidencia.direccion_texto || 'el que nos envió'}). `
    )

  async function manejarAsignar() {
    setError(null)
    setListo(false)
    setGuardando(true)
    try {
      await conTimeout(
        asignarCuadrilla(incidencia, cuadrilla),
        15000,
        'Esto está tardando demasiado. Revisa tu conexión a internet e intenta nuevamente.'
      )
      // Confirmación explícita: el panel no se cierra solo (el funcionario suele
      // seguir mirando la foto), así que sin esto no había forma de saber si la
      // acción se guardó.
      setListo(true)
    } catch (err) {
      console.error('[PanelAsignacion] Error al asignar cuadrilla:', err)
      setError(err.message || 'No se pudo asignar la cuadrilla.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    // "fixed" (no "absolute"): así ocupa siempre el alto completo de la pantalla
    // y tiene su propio scroll. Antes quedaba encajado en el contenedor del
    // mapa y, si ese contenedor era bajo, el panel se cortaba y no se podía
    // llegar al botón de asignar.
    <div className="fixed inset-y-0 right-0 z-[1000] flex w-full max-w-sm flex-col overflow-y-auto border-l border-borde bg-white p-4 shadow-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-tinta-fuerte">{etiquetaCategoria(incidencia.categoria)}</h3>
          <div className="mt-1 flex gap-1.5">
            <BadgeEstado estado={incidencia.estado} />
            <BadgeGravedad nivel={incidencia.nivel_gravedad} />
          </div>
        </div>
        <button onClick={onCerrar} className="rounded-full p-1 hover:bg-slate-100" aria-label="Cerrar">
          <X size={20} />
        </button>
      </div>

      <p className="mt-3 text-sm text-tinta-suave">{incidencia.direccion_texto || 'Sin dirección de referencia'}</p>
      <EnlaceGoogleMaps coordenadas={incidencia.coordenadas} />
      {/* El hito que escribió el vecino (Paso 1). Va destacado y no como una
          línea más de texto gris: en los sectores rurales de Licantén es LO
          ÚNICO que permite dar con el lugar, porque no hay numeración de calles
          y la dirección de arriba es la aproximación que devolvió el mapa. */}
      {incidencia.referencia_ubicacion && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 text-sm text-amber-900 ring-1 ring-amber-100">
          <Signpost size={16} className="mt-0.5 shrink-0" />
          <span>
            <span className="font-medium">Referencia: </span>
            {incidencia.referencia_ubicacion}
          </span>
        </p>
      )}

      {incidencia.detalles_adicionales && (
        <p className="mt-2 rounded-lg bg-slate-50 p-2 text-sm text-tinta">{incidencia.detalles_adicionales}</p>
      )}

      {!incidencia.es_anonimo && (incidencia.nombre_ciudadano || incidencia.contacto_ciudadano) && (
        <div className="mt-2 flex items-start gap-2 rounded-lg bg-blue-50 p-2 text-sm text-blue-800">
          <User size={16} className="mt-0.5 shrink-0" />
          <span>
            {incidencia.nombre_ciudadano || 'Sin nombre'}
            {incidencia.contacto_ciudadano && ` · ${incidencia.contacto_ciudadano}`}
          </span>
        </div>
      )}

      <GaleriaFotos urls={incidencia.fotos_antes_urls} alt="Foto reportada por el ciudadano" className="mt-3" />
      <ListaSeguimientos incidenciaId={incidencia.id} />

      <div className="mt-5">
        <label className="mb-1 block text-sm font-medium text-tinta">Cuadrilla asignada</label>
        {cuadrillas.length === 0 ? (
          <p className="text-sm text-tinta-tenue">
            Tu municipalidad todavía no tiene cuadrillas configuradas. Contacta al administrador.
          </p>
        ) : (
          <select
            value={cuadrilla}
            onChange={(e) => setCuadrilla(e.target.value)}
            className="w-full rounded-lg border border-borde p-2.5"
          >
            <option value="">Selecciona una cuadrilla</option>
            {cuadrillas.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      {listo && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-estado-bueno">
          <Check size={16} className="shrink-0" />
          Asignada a {cuadrilla}. El vecino queda informado.
        </p>
      )}

      <Boton
        className="mt-4 w-full"
        cargando={guardando}
        disabled={!cuadrilla || incidencia.estado === 'Resuelto' || sinCambios}
        onClick={manejarAsignar}
      >
        {incidencia.estado === 'Pendiente'
          ? 'Asignar cuadrilla'
          : sinCambios
            ? `Ya está con ${incidencia.cuadrilla_asignada}`
            : `Reasignar a ${cuadrilla}`}
      </Boton>

      {/* Lo que de verdad le falta al panel cuando el caso ya está asignado: una
          forma de hablar con quien reportó. El teléfono estaba ahí arriba pero
          como texto, para copiarlo a mano. Con el mensaje precargado —número de
          ticket y de qué se trata— el funcionario no tiene que explicar quién es
          ni buscar el caso. Es un link wa.me, sin backend ni costo de plantilla:
          lo abre la app de WhatsApp del propio funcionario. */}
      {telefonoVecino && incidencia.estado !== 'Resuelto' && (
        <a
          href={enlaceWhatsapp}
          target="_blank"
          rel="noreferrer"
          className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-tinta-fuerte/[0.06] px-4 py-3 font-medium text-tinta transition-colors hover:bg-tinta-fuerte/[0.1]"
        >
          <MessageCircle size={18} />
          Escribirle a {incidencia.nombre_ciudadano?.split(' ')[0] || 'quien reportó'}
        </a>
      )}
    </div>
  )
}
