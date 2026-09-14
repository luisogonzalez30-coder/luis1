import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Download, Search, LogOut, ListChecks, BarChart3, FileDown, Loader2, ShieldCheck } from 'lucide-react'
import { suscribirSolicitudes } from '../services/solicitudesService'
import { suscribirUsuarios } from '../services/usuariosService'
import { useCondominio } from '../hooks/useCondominio'
import { suscribirMantenciones } from '../services/mantencionesService'
import { ESTADO_MANTENCION, planMantenciones, resumenCumplimiento } from '../utils/mantenciones'
import { ORDEN_GRAVEDAD } from '../utils/gravedad'
import { AREAS } from '../utils/areas'
import { CATEGORIAS, agruparCategorias } from '../utils/categorias'
import { exportarSolicitudesCsv } from '../utils/exportarCsv'
import { coincideTexto } from '../utils/busqueda'
import { generarReporteGerencial } from '../utils/reporteGerencial'
import { useAccionUnica } from '../hooks/useAccionUnica'
import ListaSolicitudes from '../components/panel/ListaSolicitudes'
import PanelAsignacion from '../components/panel/PanelAsignacion'
import MetricasPorArea from '../components/panel/MetricasPorArea'
import PanelIndicadores from '../components/panel/PanelIndicadores'
import PanelEvolucion from '../components/panel/PanelEvolucion'
import ResumenGastoMensual from '../components/panel/ResumenGastoMensual'
import EstadisticasRapidas from '../components/panel/EstadisticasRapidas'
import EncabezadoCondominio from '../components/common/EncabezadoCondominio'
import Spinner from '../components/common/Spinner'
import { useAuth } from '../context/AuthContext'

const FILTROS_GRAVEDAD = ['Todas', 'Alta', 'Media', 'Baja']
const GRUPOS_CATEGORIAS = agruparCategorias(CATEGORIAS)

// Dos vistas y ninguna es un mapa. En un condominio el mapa no informa nada: 144
// unidades caben en una manzana y todas comparten coordenada, así que un plano
// de pines sería una mancha sobre el mismo punto. La cola de trabajo ordenada
// por urgencia es lo que el administrador necesita mirar en la mañana.
const PESTANAS = [
  { id: 'solicitudes', etiqueta: 'Solicitudes', icono: ListChecks },
  { id: 'estadisticas', etiqueta: 'Estadísticas', icono: BarChart3 },
]

const CLASE_SELECT =
  'min-h-[40px] w-full rounded-xl bg-white px-3 py-2 text-sm text-tinta ring-1 ring-borde transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/40'

// Panel de la administración: ve todas las solicitudes del condominio, de todas
// las áreas, más una fila de métricas comparativas para ver qué área se está
// atrasando. Solo rol ADMINISTRADOR — los roles están en docs/ARQUITECTURA.md.
export default function PanelAdministracionPage() {
  const [solicitudes, setSolicitudes] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [seleccionadaId, setSeleccionadaId] = useState(null)
  const [mantenciones, setMantenciones] = useState({})
  const [filtroGravedad, setFiltroGravedad] = useState('Todas')
  const [filtroCategoria, setFiltroCategoria] = useState('Todas')
  const [filtroEquipo, setFiltroEquipo] = useState('Todas')
  const [filtroArea, setFiltroArea] = useState('Todas')
  const [filtroTexto, setFiltroTexto] = useState('')
  const [vista, setVista] = useState('solicitudes')
  const { perfil, cerrarSesion } = useAuth()
  const { condominio, cargando, noEncontrado } = useCondominio(perfil?.condominio_id)

  useEffect(() => {
    if (!condominio) return
    // Sin filtro de estado: el mapa muestra todo, la lista lateral solo lo pendiente.
    const unsubscribe = suscribirSolicitudes(setSolicitudes, null, condominio.id)
    return unsubscribe
  }, [condominio])

  // Usuarios del condominio: alimenta el contacto directo del jefe en cada
  // tarjeta de area y la jefatura en la ficha de cada trabajador.
  // firestore.rules solo permite listar usuarios_condominio al ADMINISTRADOR,
  // que es exactamente quien está en esta página.
  useEffect(() => {
    if (!condominio) return
    return suscribirUsuarios(setUsuarios, condominio.id)
  }, [condominio])

  useEffect(() => {
    if (!condominio?.id) return
    return suscribirMantenciones(condominio.id, setMantenciones)
  }, [condominio?.id])

  // Al saltar desde el detalle de un indicador, el reporte elegido tiene que
  // verse en el mapa — si el Administrador estaba en Estadísticas, se vuelve solo.
  // Al saltar desde el detalle de un indicador o desde Estadísticas, la
  // solicitud elegida tiene que verse en la lista.
  function seleccionarSolicitud(solicitudId) {
    setVista('solicitudes')
    setSeleccionadaId(solicitudId)
  }

  // El PDF se arma sobre TODAS las solicitudes, no sobre las filtradas: es un
  // informe del condominio, no de lo que el Administrador tenga en pantalla en ese
  // momento. Para exportar una selección concreta ya está el CSV.
  const [descargarReporte, generandoPdf] = useAccionUnica(async () => {
    try {
      await generarReporteGerencial({
        solicitudes,
        condominio,
        generadoPor: perfil?.nombre,
      })
    } catch (error) {
      console.error('[PanelAdministracionPage] No se pudo generar el reporte:', error)
    }
  })

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
   )
  }

  if (noEncontrado) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center text-tinta-suave">
        Tu usuario no tiene un condominio válida asociada (condominio_id). Contacta al administrador.
      </div>
   )
  }

  // Cumplimiento Ley 21.442: son 14 documentos como máximo, así que la
  // suscripción no pesa, y es lo que alimenta el contador del encabezado.
  const cumplimiento = resumenCumplimiento(planMantenciones(condominio || {}, mantenciones))
  const obligacionesSinRespaldo =
    cumplimiento[ESTADO_MANTENCION.VENCIDA] + cumplimiento[ESTADO_MANTENCION.SIN_REGISTRO]

  // Los filtros acotan las dos columnas a la vez. Las métricas de Estadísticas
  // son a propósito independientes de estos filtros: comparan TODAS las áreas.
  const solicitudesFiltradas = solicitudes
    .filter((inc) => filtroGravedad === 'Todas' || inc.nivel_gravedad === filtroGravedad)
    .filter((inc) => filtroCategoria === 'Todas' || inc.categoria === filtroCategoria)
    .filter((inc) => filtroEquipo === 'Todas' || inc.equipo_asignado === filtroEquipo)
    .filter((inc) => filtroArea === 'Todas' || inc.area === filtroArea)
    .filter((inc) => coincideTexto(inc, filtroTexto))

  const pendientes = solicitudesFiltradas
    .filter((inc) => inc.estado === 'Pendiente')
    // Gravedad Alta primero siempre; dentro de un mismo nivel se mantiene el orden
    // por fecha (más reciente primero) que ya viene de la consulta a Firestore.
    .sort((a, b) => (ORDEN_GRAVEDAD[a.nivel_gravedad] ?? 1) - (ORDEN_GRAVEDAD[b.nivel_gravedad] ?? 1))

  const enCurso = solicitudesFiltradas.filter((inc) => inc.estado === 'En Proceso')

  const seleccionada = solicitudes.find((inc) => inc.id === seleccionadaId) || null
  const equiposCondominio = condominio.equipos || []
  const hayFiltroActivo =
    filtroGravedad !== 'Todas' || filtroCategoria !== 'Todas' ||
    filtroEquipo !== 'Todas' || filtroArea !== 'Todas' || filtroTexto.trim() !== ''

  function limpiarFiltros() {
    setFiltroGravedad('Todas')
    setFiltroCategoria('Todas')
    setFiltroEquipo('Todas')
    setFiltroArea('Todas')
    setFiltroTexto('')
  }

  // La página hace scroll normal (min-h-screen), NO se fija a la altura de la
  // pantalla. El bloque mapa+lista tiene una altura acotada y DEBAJO va un pie
  // real: antes el mapa era el último elemento y ocupaba el viewport completo,
  // así que al bajar la página parecía cortada a la mitad, sin final.
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-borde bg-white/85 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <EncabezadoCondominio condominio={condominio} tituloDefecto="Panel del Administrador" />

          {perfil && (
            <div className="flex items-center gap-1">
              {/* "Botón del Administrador": informe de gestión listo para una reunión,
                  en un clic. Solo en escritorio — se genera para imprimir o
                  adjuntar, no para mirarlo en el teléfono. */}
              <button
                onClick={descargarReporte}
                disabled={generandoPdf}
                className="hidden items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white shadow-tarjeta transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60 md:flex"
              >
                {generandoPdf
                  ? <Loader2 size={16} className="animate-spin" />
                  : <FileDown size={16} />}
                {generandoPdf ? 'Generando…' : 'Reporte de gestión'}
              </button>
              {/* El contador va en el encabezado y no dentro del panel de
                  cumplimiento: una certificación vencida es lo único de esta app
                  con multa asociada, y no puede depender de que el administrador
                  se acuerde de entrar a mirarla. */}
              <Link
                to="/panel/cumplimiento"
                className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-tinta transition-colors hover:bg-tinta-fuerte/5 sm:flex"
              >
                <ShieldCheck size={16} /> Ley 21.442
                {obligacionesSinRespaldo > 0 && (
                  <span className="rounded-full bg-red-100 px-1.5 text-xs font-bold text-red-700">
                    {obligacionesSinRespaldo}
                  </span>
               )}
              </Link>
              <Link
                to="/panel/usuarios"
                className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-tinta transition-colors hover:bg-tinta-fuerte/5 sm:flex"
              >
                <Users size={16} /> Usuarios
              </Link>
              <Link
                to="/panel/cumplimiento"
                className="toque relative rounded-xl text-tinta transition-colors hover:bg-tinta-fuerte/5 sm:hidden"
                aria-label={`Cumplimiento Ley 21.442${obligacionesSinRespaldo > 0 ? `: ${obligacionesSinRespaldo} sin respaldo vigente` : ''}`}
              >
                <ShieldCheck size={19} />
                {obligacionesSinRespaldo > 0 && (
                  <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
               )}
              </Link>
              <Link to="/panel/usuarios" className="toque rounded-xl text-tinta transition-colors hover:bg-tinta-fuerte/5 sm:hidden" aria-label="Usuarios">
                <Users size={19} />
              </Link>
              <button
                onClick={cerrarSesion}
                className="toque rounded-xl text-tinta-suave transition-colors hover:bg-tinta-fuerte/5 hover:text-estado-critico"
                aria-label="Cerrar sesión"
                title={`${perfil.nombre} — cerrar sesión`}
              >
                <LogOut size={19} />
              </button>
            </div>
         )}
        </div>

        {/* Pestañas con indicador sutil bajo la activa, como una app nativa. */}
        <div className="flex gap-1 px-4 sm:px-6">
          {PESTANAS.map((tab) => {
            const activa = vista === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setVista(tab.id)}
                className={`relative flex min-h-[44px] items-center gap-1.5 px-3 text-sm font-medium transition-colors
                  ${activa ? 'text-primary' : 'text-tinta-suave hover:text-tinta'}`}
              >
                <tab.icono size={16} />
                {tab.etiqueta}
                <span
                  className={`absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary transition-opacity duration-200
                    ${activa ? 'opacity-100' : 'opacity-0'}`}
                />
              </button>
           )
          })}
        </div>
      </header>

      <main className="flex-1">
        <PanelIndicadores
          solicitudes={solicitudes}
          condominioId={condominio.id}
          onSeleccionarSolicitud={seleccionarSolicitud}
        />

        {vista === 'estadisticas' ? (
          <>
            <PanelEvolucion solicitudes={solicitudes} onSeleccionarSolicitud={seleccionarSolicitud} />
            <div className="pb-5">
              <ResumenGastoMensual solicitudes={solicitudes} />
            </div>
            <MetricasPorArea
              solicitudes={solicitudes}
              condominioId={condominio.id}
              usuarios={usuarios}
            />
            <EstadisticasRapidas solicitudes={solicitudes} />
          </>
       ) : (
          <section className="px-4 pb-6 sm:px-6">
            {/* Una sola fila de filtros, arriba de todo lo que acota — antes
                estaban metidos dentro del panel de la lista y no se veía que
                también afectaban al mapa. */}
            <div className="rounded-2xl bg-white p-3 ring-1 ring-borde">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta-tenue" />
                  <input
                    type="text"
                    value={filtroTexto}
                    onChange={(e) => setFiltroTexto(e.target.value)}
                    placeholder="Buscar por ticket, dirección o categoría"
                    className="min-h-[40px] w-full rounded-xl bg-tinta-fuerte/[0.03] py-2 pl-9 pr-3 text-sm text-tinta ring-1 ring-borde transition-shadow placeholder:text-tinta-tenue focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div className="flex gap-1.5">
                  {FILTROS_GRAVEDAD.map((nivel) => (
                    <button
                      key={nivel}
                      onClick={() => setFiltroGravedad(nivel)}
                      className={`min-h-[40px] rounded-xl px-3.5 text-sm font-medium transition-colors
                        ${filtroGravedad === nivel
                          ? 'bg-primary text-white shadow-tarjeta'
                          : 'bg-tinta-fuerte/[0.04] text-tinta hover:bg-tinta-fuerte/[0.08]'}`}
                    >
                      {nivel}
                    </button>
                 ))}
                </div>
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className={CLASE_SELECT}>
                  <option value="Todas">Todas las categorías</option>
                  {GRUPOS_CATEGORIAS.map((grupo) => (
                    <optgroup key={grupo.nombre} label={grupo.nombre}>
                      {grupo.items.map((cat) => (
                        <option key={cat.valor} value={cat.valor}>{cat.etiqueta}</option>
                     ))}
                    </optgroup>
                 ))}
                </select>

                <select value={filtroEquipo} onChange={(e) => setFiltroEquipo(e.target.value)} className={CLASE_SELECT}>
                  <option value="Todas">Todas las equipos</option>
                  {equiposCondominio.map((c) => (
                    <option key={c} value={c}>{c}</option>
                 ))}
                </select>

                <select value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)} className={CLASE_SELECT}>
                  <option value="Todas">Todos las áreas</option>
                  {AREAS.map((dep) => (
                    <option key={dep} value={dep}>{dep}</option>
                 ))}
                </select>
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-tinta-suave">
                  {solicitudesFiltradas.length} de {solicitudes.length} reportes
                  {hayFiltroActivo && (
                    <button onClick={limpiarFiltros} className="ml-2 font-medium text-primary hover:underline">
                      Limpiar filtros
                    </button>
                 )}
                </p>
                <button
                  onClick={() => exportarSolicitudesCsv(solicitudesFiltradas, `solicitudes-${condominio.id}.csv`)}
                  className="flex min-h-[36px] items-center gap-1.5 rounded-xl bg-tinta-fuerte/[0.04] px-3 text-xs font-medium text-tinta transition-colors hover:bg-tinta-fuerte/[0.08]"
                  title="Exportar los reportes filtrados a CSV (Excel)"
                >
                  <Download size={14} /> Exportar CSV
                </button>
              </div>
            </div>

            {/* Dos columnas: lo que espera a alguien y lo que ya está en manos de
                alguien. Es la pregunta que el administrador se hace de verdad al
                abrir el panel —"¿qué está esperando por mí?"— y antes había que
                deducirla de un mapa. */}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-borde">
                <div className="flex items-center justify-between gap-2 border-b border-borde px-4 py-3">
                  <h2 className="text-sm font-semibold text-tinta-fuerte">
                    Esperando equipo
                    <span className="ml-1.5 rounded-full bg-tinta-fuerte/[0.06] px-2 py-0.5 text-xs font-medium text-tinta-suave">
                      {pendientes.length}
                    </span>
                  </h2>
                </div>
                <div className="md:max-h-[calc(100vh-20rem)] md:overflow-y-auto">
                  <ListaSolicitudes
                    solicitudes={pendientes}
                    solicitudSeleccionadaId={seleccionadaId}
                    onSeleccionar={setSeleccionadaId}
                  />
                </div>
              </div>

              <div className="flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-borde">
                <div className="flex items-center justify-between gap-2 border-b border-borde px-4 py-3">
                  <h2 className="text-sm font-semibold text-tinta-fuerte">
                    En curso
                    <span className="ml-1.5 rounded-full bg-tinta-fuerte/[0.06] px-2 py-0.5 text-xs font-medium text-tinta-suave">
                      {enCurso.length}
                    </span>
                  </h2>
                </div>
                <div className="md:max-h-[calc(100vh-20rem)] md:overflow-y-auto">
                  <ListaSolicitudes
                    solicitudes={enCurso}
                    solicitudSeleccionadaId={seleccionadaId}
                    onSeleccionar={setSeleccionadaId}
                  />
                </div>
              </div>
            </div>
          </section>
       )}
      </main>

      {/* El final de la página. Sin esto, el mapa era el último elemento y al
          bajar no había forma de saber que ya no venía nada más. */}
      <footer className="border-t border-borde bg-white px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-tinta-suave">
          <p>
            {condominio.nombre} · Panel del Administrador
            {perfil && <span className="text-tinta-tenue"> · {perfil.nombre}</span>}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Link to="/panel/cumplimiento" className="hover:text-primary hover:underline">Cumplimiento Ley 21.442</Link>
            <Link to={`/${condominio.id}`} className="hover:text-primary hover:underline">Ver como residente</Link>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-tinta-tenue">
          Los datos se actualizan solos, en tiempo real. CondominioAquí.
        </p>
      </footer>

      {seleccionada && (
        <PanelAsignacion
          solicitud={seleccionada}
          equipos={equiposCondominio}
          onCerrar={() => setSeleccionadaId(null)}
        />
     )}
    </div>
 )
}
