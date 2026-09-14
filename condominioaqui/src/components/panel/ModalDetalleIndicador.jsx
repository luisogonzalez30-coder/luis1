import { ArrowRight, Clock } from 'lucide-react'
import Modal from '../common/Modal'
import { etiquetaCategoria } from '../../utils/categorias'
import { COLOR_POR_GRAVEDAD } from '../../utils/gravedad'
import { horasDesde, horasEntre } from '../../utils/tiempo'

// Cuántos reportes se listan. Un indicador puede tener cientos detrás; el
// Administrador no va a leerlos todos y renderizarlos cuesta. Se muestran los más
// urgentes y se dice cuántos quedan fuera.
const MAX_LISTADOS = 40

function antiguedad(solicitud) {
  const horas = horasDesde(solicitud.fecha_creacion)
  if (horas == null) return null
  if (horas < 1) return 'recién'
  if (horas < 24) return `hace ${Math.round(horas)} h`
  return `hace ${Math.round(horas / 24)} d`
}

// Reparto por área: convierte "39 trabajos atrasados" en "de quién son
// esos 39", que es la pregunta inmediata del Administrador y hoy obligaba a cruzar a
// mano con las tarjetas de más abajo. `agruparPor` permite repartir por otra
// cosa cuando el indicador lo pide — por equipo, por ejemplo.
function reparto(solicitudes, agruparPor) {
  const conteo = solicitudes.reduce((acc, i) => {
    const clave = agruparPor(i) || 'Sin asignar'
    acc[clave] = (acc[clave] || 0) + 1
    return acc
  }, {})

  return Object.entries(conteo).sort((a, b) => b[1] - a[1])
}

// Los tres órdenes que pide el panel. Cada indicador necesita el suyo: en
// "atrasados" arriba va lo más urgente, pero en "resueltos este mes" arriba va lo
// último cerrado, y en "tiempo promedio" lo que más demoró — que es lo que
// explica por qué el promedio es el que es.
const ORDEN_GRAVEDAD = { Alta: 0, Media: 1, Baja: 2 }

const ORDENADORES = {
  urgencia: (a, b) => {
    const porGravedad = (ORDEN_GRAVEDAD[a.nivel_gravedad] ?? 1) - (ORDEN_GRAVEDAD[b.nivel_gravedad] ?? 1)
    if (porGravedad !== 0) return porGravedad
    return (horasDesde(b.fecha_creacion) || 0) - (horasDesde(a.fecha_creacion) || 0)
  },
  cierre: (a, b) => (horasDesde(a.fecha_cierre) || 0) - (horasDesde(b.fecha_cierre) || 0),
  demora: (a, b) => (horasEntre(b.fecha_creacion, b.fecha_cierre) || 0) - (horasEntre(a.fecha_creacion, a.fecha_cierre) || 0),
  peorCalificacion: (a, b) => (a.calificacion_residente || 0) - (b.calificacion_residente || 0),
}

// Detalle de un indicador del panel del Administrador: qué reportes hay exactamente
// detrás del número. Se abre al tocar una tarjeta de ResumenAdministrador /
// PanelIndicadores.
//
// `solicitudes` llega YA filtrada por quien abre el modal — este componente no
// decide qué entra, solo lo presenta. Así cada indicador mantiene su propia
// definición en un solo lugar (la del panel) y no se duplica acá.
export default function ModalDetalleIndicador({
  titulo,
  descripcion,
  solicitudes = [],
  onSeleccionar,
  onCerrar,
  // Cada indicador define su propio orden, su propia línea de apoyo y su propio
  // dato a la derecha. Sin esto, "resueltos este mes" y "trabajos atrasados"
  // mostrarían lo mismo —la antigüedad— y en uno de los dos ese número no
  // significa nada.
  orden = 'urgencia',
  lineaApoyo,
  datoDerecha,
  agruparPor = (i) => i.area,
  mensajeVacio = 'No hay ningún reporte en esta condición. Buena noticia.',
}) {
  const ordenadas = [...solicitudes].sort(ORDENADORES[orden] || ORDENADORES.urgencia)

  const listadas = ordenadas.slice(0, MAX_LISTADOS)
  const grupos = reparto(solicitudes, agruparPor)

  return (
    <Modal
      titulo={titulo}
      subtitulo={`${solicitudes.length} ${solicitudes.length === 1 ? 'reporte' : 'reportes'} · ${descripcion}`}
      ancho="lg"
      onCerrar={onCerrar}
    >
      {solicitudes.length === 0 ? (
        <p className="py-6 text-center text-sm text-tinta-suave">{mensajeVacio}</p>
     ) : (
        <>
          {grupos.length > 1 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {grupos.map(([grupo, cantidad]) => (
                <span
                  key={grupo}
                  className="rounded-full bg-tinta-fuerte/[0.04] px-2.5 py-1 text-xs text-tinta"
                >
                  {grupo} <span className="font-semibold text-tinta-fuerte">{cantidad}</span>
                </span>
             ))}
            </div>
         )}

          <ul className="space-y-1.5">
            {listadas.map((inc) => (
              <li key={inc.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSeleccionar?.(inc.id)
                    onCerrar()
                  }}
                  className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ring-1 ring-borde transition-colors hover:bg-primary/[0.04] hover:ring-primary/25"
                >
                  {/* El punto de gravedad nunca va solo: la etiqueta escrita
                      está al lado, en la línea de apoyo. */}
                  <span
                    className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: COLOR_POR_GRAVEDAD[inc.nivel_gravedad] }}
                    aria-hidden="true"
                  />

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-tinta-fuerte">
                      {etiquetaCategoria(inc.categoria)}
                    </span>
                    <span className="block truncate text-xs text-tinta-suave">
                      {lineaApoyo
                        ? lineaApoyo(inc)
                        : `${inc.nivel_gravedad} · ${inc.direccion_texto || 'Sin dirección de referencia'}`}
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-tinta-tenue">
                    {datoDerecha ? (
                      datoDerecha(inc)
                   ) : (
                      <>
                        <Clock size={12} />
                        {antiguedad(inc)}
                      </>
                   )}
                  </span>

                  <ArrowRight
                    size={15}
                    className="shrink-0 text-tinta-tenue transition-colors group-hover:text-primary"
                  />
                </button>
              </li>
           ))}
          </ul>

          {ordenadas.length > MAX_LISTADOS && (
            <p className="mt-3 text-center text-xs text-tinta-tenue">
              Se muestran {MAX_LISTADOS} de {ordenadas.length}. Usa los filtros del mapa para ver el
              resto.
            </p>
         )}

          <p className="mt-3 text-center text-xs text-tinta-tenue">
            Toca un reporte para abrirlo en el mapa.
          </p>
        </>
     )}
    </Modal>
 )
}
