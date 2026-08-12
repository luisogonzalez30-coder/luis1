import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Download, Search, FileBarChart, LogOut, Map, BarChart3, FileDown, Loader2 } from 'lucide-react'
import { suscribirIncidencias } from '../services/incidenciasService'
import { suscribirFuncionarios } from '../services/funcionariosService'
import { useMunicipio } from '../hooks/useMunicipio'
import { ORDEN_GRAVEDAD } from '../utils/gravedad'
import { DEPARTAMENTOS } from '../utils/departamento'
import { CATEGORIAS, agruparCategorias } from '../utils/categorias'
import { exportarIncidenciasCsv } from '../utils/exportarCsv'
import { coincideTexto } from '../utils/busqueda'
import { generarReporteGerencial } from '../utils/reporteGerencial'
import { useAccionUnica } from '../hooks/useAccionUnica'
import MapaIncidencias from '../components/dashboard/MapaIncidencias'
import ListaIncidencias from '../components/dashboard/ListaIncidencias'
import PanelAsignacion from '../components/dashboard/PanelAsignacion'
import MetricasPorDepartamento from '../components/dashboard/MetricasPorDepartamento'
import PanelIndicadores from '../components/dashboard/PanelIndicadores'
import PanelSectores from '../components/dashboard/PanelSectores'
import PanelEvolucion from '../components/dashboard/PanelEvolucion'
import ResumenGastoMensual from '../components/dashboard/ResumenGastoMensual'
import EstadisticasRapidas from '../components/dashboard/EstadisticasRapidas'
import EncabezadoMunicipio from '../components/common/EncabezadoMunicipio'
import Spinner from '../components/common/Spinner'
import { useAuth } from '../context/AuthContext'

const FILTROS_GRAVEDAD = ['Todas', 'Alta', 'Media', 'Baja']
const GRUPOS_CATEGORIAS = agruparCategorias(CATEGORIAS)

const PESTANAS = [
  { id: 'mapa', etiqueta: 'Mapa', icono: Map },
  { id: 'estadisticas', etiqueta: 'Estadísticas', icono: BarChart3 },
]

const CLASE_SELECT =
  'min-h-[40px] w-full rounded-xl bg-white px-3 py-2 text-sm text-tinta ring-1 ring-borde transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/40'

// Dashboard del Alcalde ("modo dios"): ve todas las incidencias del municipio,
// de todos los departamentos, más una fila de métricas comparativas para
// fiscalizar atraso por departamento. Solo rol ALCALDE_ADMIN — ver §RBAC en
// ESTADO_PROYECTO.md.
export default function DashboardGeneralPage() {
  const [incidencias, setIncidencias] = useState([])
  const [funcionarios, setFuncionarios] = useState([])
  const [seleccionadaId, setSeleccionadaId] = useState(null)
  const [filtroGravedad, setFiltroGravedad] = useState('Todas')
  const [filtroCategoria, setFiltroCategoria] = useState('Todas')
  const [filtroCuadrilla, setFiltroCuadrilla] = useState('Todas')
  const [filtroDepartamento, setFiltroDepartamento] = useState('Todas')
  const [filtroTexto, setFiltroTexto] = useState('')
  const [sectorEnfocado, setSectorEnfocado] = useState(null)
  const [vista, setVista] = useState('mapa')
  const { perfil, cerrarSesion } = useAuth()
  const { municipio, cargando, noEncontrado } = useMunicipio(perfil?.municipio_id)

  useEffect(() => {
    if (!municipio) return
    // Sin filtro de estado: el mapa muestra todo, la lista lateral solo lo pendiente.
    const unsubscribe = suscribirIncidencias(setIncidencias, null, municipio.id)
    return unsubscribe
  }, [municipio])

  // Funcionarios del municipio: alimenta el contacto directo del jefe en cada
  // tarjeta de departamento y la jefatura en la ficha de cada trabajador.
  // firestore.rules solo permite listar usuarios_municipales al ALCALDE_ADMIN,
  // que es exactamente quien está en esta página.
  useEffect(() => {
    if (!municipio) return
    return suscribirFuncionarios(setFuncionarios, municipio.id)
  }, [municipio])

  // Al saltar desde el detalle de un indicador, el reporte elegido tiene que
  // verse en el mapa — si el Alcalde estaba en Estadísticas, se vuelve solo.
  function seleccionarEnMapa(incidenciaId) {
    setVista('mapa')
    setSeleccionadaId(incidenciaId)
  }

  // El PDF se arma sobre TODAS las incidencias, no sobre las filtradas: es un
  // informe del municipio, no de lo que el Alcalde tenga en pantalla en ese
  // momento. Para exportar una selección concreta ya está el CSV.
  const [descargarReporte, generandoPdf] = useAccionUnica(async () => {
    try {
      await generarReporteGerencial({
        incidencias,
        municipio,
        generadoPor: perfil?.nombre,
      })
    } catch (error) {
      console.error('[DashboardGeneralPage] No se pudo generar el reporte:', error)
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
        Tu usuario no tiene una municipalidad válida asociada (municipio_id). Contacta al administrador.
      </div>
    )
  }

  // Los filtros aplican tanto al mapa como a la lista, para que ambos muestren
  // siempre el mismo subconjunto — la lista además siempre se acota a "Pendiente"
  // (es la cola de trabajo por hacer), el mapa mantiene todos los estados (vista
  // de situación completa). Las métricas de Estadísticas son a propósito
  // independientes de estos filtros: comparan TODOS los departamentos.
  const incidenciasFiltradas = incidencias
    .filter((inc) => filtroGravedad === 'Todas' || inc.nivel_gravedad === filtroGravedad)
    .filter((inc) => filtroCategoria === 'Todas' || inc.categoria === filtroCategoria)
    .filter((inc) => filtroCuadrilla === 'Todas' || inc.cuadrilla_asignada === filtroCuadrilla)
    .filter((inc) => filtroDepartamento === 'Todas' || inc.departamento === filtroDepartamento)
    .filter((inc) => coincideTexto(inc, filtroTexto))

  const pendientes = incidenciasFiltradas
    .filter((inc) => inc.estado === 'Pendiente')
    // Gravedad Alta primero siempre; dentro de un mismo nivel se mantiene el orden
    // por fecha (más reciente primero) que ya viene de la consulta a Firestore.
    .sort((a, b) => (ORDEN_GRAVEDAD[a.nivel_gravedad] ?? 1) - (ORDEN_GRAVEDAD[b.nivel_gravedad] ?? 1))

  const seleccionada = incidencias.find((inc) => inc.id === seleccionadaId) || null
  const cuadrillasMunicipio = municipio.cuadrillas || []
  const hayFiltroActivo =
    filtroGravedad !== 'Todas' || filtroCategoria !== 'Todas' ||
    filtroCuadrilla !== 'Todas' || filtroDepartamento !== 'Todas' || filtroTexto.trim() !== ''

  function limpiarFiltros() {
    setFiltroGravedad('Todas')
    setFiltroCategoria('Todas')
    setFiltroCuadrilla('Todas')
    setFiltroDepartamento('Todas')
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
          <EncabezadoMunicipio municipio={municipio} tituloDefecto="Panel del Alcalde" />

          {perfil && (
            <div className="flex items-center gap-1">
              {/* "Botón del Alcalde": informe de gestión listo para una reunión,
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
              <Link
                to="/dashboard/cuenta-publica"
                className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-tinta transition-colors hover:bg-tinta-fuerte/5 sm:flex"
              >
                <FileBarChart size={16} /> Cuenta pública
              </Link>
              <Link
                to="/dashboard/funcionarios"
                className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-tinta transition-colors hover:bg-tinta-fuerte/5 sm:flex"
              >
                <Users size={16} /> Funcionarios
              </Link>
              <Link to="/dashboard/cuenta-publica" className="toque rounded-xl text-tinta transition-colors hover:bg-tinta-fuerte/5 sm:hidden" aria-label="Cuenta pública">
                <FileBarChart size={19} />
              </Link>
              <Link to="/dashboard/funcionarios" className="toque rounded-xl text-tinta transition-colors hover:bg-tinta-fuerte/5 sm:hidden" aria-label="Funcionarios">
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
          incidencias={incidencias}
          municipioId={municipio.id}
          onSeleccionarIncidencia={seleccionarEnMapa}
        />

        {vista === 'estadisticas' ? (
          <>
            <PanelEvolucion incidencias={incidencias} onSeleccionarIncidencia={seleccionarEnMapa} />
            <div className="pb-5">
              <ResumenGastoMensual incidencias={incidencias} />
            </div>
            <MetricasPorDepartamento
              incidencias={incidencias}
              municipioId={municipio.id}
              funcionarios={funcionarios}
            />
            <PanelSectores
              incidencias={incidencias}
              sectores={municipio.sectores}
              onSeleccionarSector={(sector) => {
                setSectorEnfocado(sector)
                setVista('mapa')
              }}
            />
            <EstadisticasRapidas incidencias={incidencias} />
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

                <select value={filtroCuadrilla} onChange={(e) => setFiltroCuadrilla(e.target.value)} className={CLASE_SELECT}>
                  <option value="Todas">Todas las cuadrillas</option>
                  {cuadrillasMunicipio.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select value={filtroDepartamento} onChange={(e) => setFiltroDepartamento(e.target.value)} className={CLASE_SELECT}>
                  <option value="Todas">Todos los departamentos</option>
                  {DEPARTAMENTOS.map((dep) => (
                    <option key={dep} value={dep}>{dep}</option>
                  ))}
                </select>
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-tinta-suave">
                  {incidenciasFiltradas.length} de {incidencias.length} reportes
                  {hayFiltroActivo && (
                    <button onClick={limpiarFiltros} className="ml-2 font-medium text-primary hover:underline">
                      Limpiar filtros
                    </button>
                  )}
                </p>
                <button
                  onClick={() => exportarIncidenciasCsv(incidenciasFiltradas, `incidencias-${municipio.id}.csv`)}
                  className="flex min-h-[36px] items-center gap-1.5 rounded-xl bg-tinta-fuerte/[0.04] px-3 text-xs font-medium text-tinta transition-colors hover:bg-tinta-fuerte/[0.08]"
                  title="Exportar los reportes filtrados a CSV (Excel)"
                >
                  <Download size={14} /> Exportar CSV
                </button>
              </div>
            </div>

            {/* Altura acotada y explícita. En móvil el mapa tiene alto fijo y la
                lista fluye con la página (sin scroll anidado, que es lo que hacía
                que se sintiera "cortado"); desde md vuelven a ser dos paneles. */}
            <div className="mt-4 overflow-hidden rounded-2xl bg-white ring-1 ring-borde md:flex md:h-[calc(100vh-13rem)] md:min-h-[480px]">
              <div className="h-[48vh] w-full shrink-0 md:h-full md:w-[58%]">
                <MapaIncidencias
                  incidencias={incidenciasFiltradas}
                  incidenciaSeleccionadaId={seleccionadaId}
                  onSeleccionar={setSeleccionadaId}
                  centro={municipio.centro_mapa}
                  sectores={municipio.sectores}
                  sectorEnfocado={sectorEnfocado}
                />
              </div>

              <div className="flex flex-col border-t border-borde md:h-full md:w-[42%] md:border-l md:border-t-0">
                <div className="flex items-center justify-between gap-2 border-b border-borde px-4 py-3">
                  <h2 className="text-sm font-semibold text-tinta-fuerte">
                    Esperando cuadrilla
                    <span className="ml-1.5 rounded-full bg-tinta-fuerte/[0.06] px-2 py-0.5 text-xs font-medium text-tinta-suave">
                      {pendientes.length}
                    </span>
                  </h2>
                </div>
                <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">
                  <ListaIncidencias
                    incidencias={pendientes}
                    incidenciaSeleccionadaId={seleccionadaId}
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
            {municipio.nombre} · Panel del Alcalde
            {perfil && <span className="text-tinta-tenue"> · {perfil.nombre}</span>}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Link to="/dashboard/cuenta-publica" className="hover:text-primary hover:underline">Cuenta pública</Link>
            <Link to={`/${municipio.id}/transparencia`} className="hover:text-primary hover:underline">Transparencia</Link>
            <Link to={`/${municipio.id}`} className="hover:text-primary hover:underline">Ver como vecino</Link>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-tinta-tenue">
          Los datos se actualizan solos, en tiempo real. TuMuniAquí.
        </p>
      </footer>

      {seleccionada && (
        <PanelAsignacion
          incidencia={seleccionada}
          cuadrillas={cuadrillasMunicipio}
          onCerrar={() => setSeleccionadaId(null)}
        />
      )}
    </div>
  )
}
