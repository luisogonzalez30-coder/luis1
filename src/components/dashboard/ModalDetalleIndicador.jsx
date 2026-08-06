import { ArrowRight, Clock } from 'lucide-react'
import Modal from '../common/Modal'
import { CATEGORIAS } from '../../utils/categorias'
import { COLOR_POR_GRAVEDAD } from '../../utils/gravedad'
import { horasDesde } from '../../utils/tiempo'

const ETIQUETA_CATEGORIA = Object.fromEntries(CATEGORIAS.map((c) => [c.valor, c.etiqueta]))

// Cuántos reportes se listan. Un indicador puede tener cientos detrás; el
// Alcalde no va a leerlos todos y renderizarlos cuesta. Se muestran los más
// urgentes y se dice cuántos quedan fuera.
const MAX_LISTADOS = 40

function antiguedad(incidencia) {
  const horas = horasDesde(incidencia.fecha_creacion)
  if (horas == null) return null
  if (horas < 1) return 'recién'
  if (horas < 24) return `hace ${Math.round(horas)} h`
  return `hace ${Math.round(horas / 24)} d`
}

// Reparto por departamento: convierte "39 trabajos atrasados" en "de quién son
// esos 39", que es la pregunta inmediata del Alcalde y hoy obligaba a cruzar a
// mano con las tarjetas de más abajo.
function repartoPorDepartamento(incidencias) {
  const conteo = incidencias.reduce((acc, i) => {
    const dep = i.departamento || 'Sin departamento'
    acc[dep] = (acc[dep] || 0) + 1
    return acc
  }, {})

  return Object.entries(conteo).sort((a, b) => b[1] - a[1])
}

// Detalle de un indicador del panel del Alcalde: qué reportes hay exactamente
// detrás del número. Se abre al tocar una tarjeta de ResumenAlcalde /
// PanelIndicadores.
//
// `incidencias` llega YA filtrada por quien abre el modal — este componente no
// decide qué entra, solo lo presenta. Así cada indicador mantiene su propia
// definición en un solo lugar (la del panel) y no se duplica acá.
export default function ModalDetalleIndicador({
  titulo,
  descripcion,
  incidencias = [],
  onSeleccionar,
  onCerrar,
}) {
  // Más urgente primero: gravedad Alta arriba y, dentro de cada nivel, lo más
  // antiguo primero — que es lo que lleva más tiempo esperando.
  const orden = { Alta: 0, Media: 1, Baja: 2 }
  const ordenadas = [...incidencias].sort((a, b) => {
    const porGravedad = (orden[a.nivel_gravedad] ?? 1) - (orden[b.nivel_gravedad] ?? 1)
    if (porGravedad !== 0) return porGravedad
    return (horasDesde(b.fecha_creacion) || 0) - (horasDesde(a.fecha_creacion) || 0)
  })

  const listadas = ordenadas.slice(0, MAX_LISTADOS)
  const reparto = repartoPorDepartamento(incidencias)

  return (
    <Modal
      titulo={titulo}
      subtitulo={`${incidencias.length} ${incidencias.length === 1 ? 'reporte' : 'reportes'} · ${descripcion}`}
      ancho="lg"
      onCerrar={onCerrar}
    >
      {incidencias.length === 0 ? (
        <p className="py-6 text-center text-sm text-tinta-suave">
          No hay ningún reporte en esta condición. Buena noticia.
        </p>
      ) : (
        <>
          {reparto.length > 1 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {reparto.map(([departamento, cantidad]) => (
                <span
                  key={departamento}
                  className="rounded-full bg-tinta-fuerte/[0.04] px-2.5 py-1 text-xs text-tinta"
                >
                  {departamento} <span className="font-semibold text-tinta-fuerte">{cantidad}</span>
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
                      {ETIQUETA_CATEGORIA[inc.categoria] || inc.categoria}
                    </span>
                    <span className="block truncate text-xs text-tinta-suave">
                      {inc.nivel_gravedad} · {inc.direccion_texto || 'Sin dirección de referencia'}
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-1 text-xs text-tinta-tenue">
                    <Clock size={12} />
                    {antiguedad(inc)}
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
              Se muestran los {MAX_LISTADOS} más urgentes de {ordenadas.length}. Usa los filtros del
              mapa para ver el resto.
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
