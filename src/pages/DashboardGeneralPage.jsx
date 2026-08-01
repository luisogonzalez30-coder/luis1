import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Download, Search } from 'lucide-react'
import { suscribirIncidencias } from '../services/incidenciasService'
import { useMunicipio } from '../hooks/useMunicipio'
import { ORDEN_GRAVEDAD } from '../utils/gravedad'
import { DEPARTAMENTOS } from '../utils/departamento'
import { CATEGORIAS, agruparCategorias } from '../utils/categorias'
import { exportarIncidenciasCsv } from '../utils/exportarCsv'
import { coincideTexto } from '../utils/busqueda'
import MapaIncidencias from '../components/dashboard/MapaIncidencias'
import ListaIncidencias from '../components/dashboard/ListaIncidencias'
import PanelAsignacion from '../components/dashboard/PanelAsignacion'
import MetricasPorDepartamento from '../components/dashboard/MetricasPorDepartamento'
import ResumenGastoMensual from '../components/dashboard/ResumenGastoMensual'
import EstadisticasRapidas from '../components/dashboard/EstadisticasRapidas'
import EncabezadoMunicipio from '../components/common/EncabezadoMunicipio'
import Spinner from '../components/common/Spinner'
import { useAuth } from '../context/AuthContext'

const FILTROS_GRAVEDAD = ['Todas', 'Alta', 'Media', 'Baja']
const GRUPOS_CATEGORIAS = agruparCategorias(CATEGORIAS)

// Dashboard del Alcalde ("modo dios"): ve todas las incidencias del municipio,
// de todos los departamentos, más una fila de métricas comparativas para
// fiscalizar atraso por departamento. Solo rol ALCALDE_ADMIN — ver §RBAC en
// ESTADO_PROYECTO.md.
export default function DashboardGeneralPage() {
  const [incidencias, setIncidencias] = useState([])
  const [seleccionadaId, setSeleccionadaId] = useState(null)
  const [filtroGravedad, setFiltroGravedad] = useState('Todas')
  const [filtroCategoria, setFiltroCategoria] = useState('Todas')
  const [filtroCuadrilla, setFiltroCuadrilla] = useState('Todas')
  const [filtroDepartamento, setFiltroDepartamento] = useState('Todas')
  const [filtroTexto, setFiltroTexto] = useState('')
  const [vista, setVista] = useState('mapa')
  const { perfil, cerrarSesion } = useAuth()
  const { municipio, cargando, noEncontrado } = useMunicipio(perfil?.municipio_id)

  useEffect(() => {
    if (!municipio) return
    // Sin filtro de estado: el mapa muestra todo, la lista lateral solo lo pendiente.
    const unsubscribe = suscribirIncidencias(setIncidencias, null, municipio.id)
    return unsubscribe
  }, [municipio])

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (noEncontrado) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center text-gray-500">
        Tu usuario no tiene una municipalidad válida asociada (municipio_id). Contacta al administrador.
      </div>
    )
  }

  // Los filtros aplican tanto al mapa como a la lista, para que ambos muestren
  // siempre el mismo subconjunto — la lista además siempre se acota a "Pendiente"
  // (es la cola de trabajo por hacer), el mapa mantiene todos los estados (vista
  // de situación completa). Las métricas de arriba (MetricasPorDepartamento) son
  // a propósito independientes de estos filtros: comparan TODOS los departamentos.
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

  return (
    <div className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <EncabezadoMunicipio municipio={municipio} tituloDefecto="Dashboard General — Incidencias Urbanas" />
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            {[
              { id: 'mapa', etiqueta: 'Mapa' },
              { id: 'estadisticas', etiqueta: 'Estadísticas' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setVista(tab.id)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors
                  ${vista === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {tab.etiqueta}
              </button>
            ))}
          </div>
        </div>
        {perfil && (
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <Link to="/dashboard/funcionarios" className="flex items-center gap-1 text-primary hover:underline">
              <Users size={16} /> Funcionarios
            </Link>
            <span>{perfil.nombre} ({perfil.rol})</span>
            <button onClick={cerrarSesion} className="text-primary hover:underline">Cerrar sesión</button>
          </div>
        )}
      </header>

      <ResumenGastoMensual incidencias={incidencias} />
      <MetricasPorDepartamento incidencias={incidencias} municipioId={municipio.id} />

      {vista === 'estadisticas' ? (
        <EstadisticasRapidas incidencias={incidencias} />
      ) : (
        <div className="relative flex flex-1 flex-col overflow-hidden md:flex-row">
          <div className="h-[45vh] w-full shrink-0 md:h-full md:w-[60%]">
            <MapaIncidencias
              incidencias={incidenciasFiltradas}
              incidenciaSeleccionadaId={seleccionadaId}
              onSeleccionar={setSeleccionadaId}
              centro={municipio.centro_mapa}
            />
          </div>

          <div className="flex-1 overflow-y-auto border-t border-gray-200 bg-gray-50 md:h-full md:w-[40%] md:border-l md:border-t-0">
            <div className="border-b border-gray-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold text-gray-700">Pendientes ({pendientes.length})</h2>
                <button
                  onClick={() => exportarIncidenciasCsv(incidenciasFiltradas, `incidencias-${municipio.id}.csv`)}
                  className="flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                  title="Exportar las incidencias filtradas a CSV (Excel)"
                >
                  <Download size={13} /> Exportar CSV
                </button>
              </div>

              <div className="relative mt-2">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  placeholder="Buscar por ticket, dirección, categoría..."
                  className="w-full rounded-lg border border-gray-300 py-1.5 pl-8 pr-2 text-xs"
                />
              </div>

              <div className="mt-2 flex gap-1.5">
                {FILTROS_GRAVEDAD.map((nivel) => (
                  <button
                    key={nivel}
                    onClick={() => setFiltroGravedad(nivel)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors
                      ${filtroGravedad === nivel ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                  >
                    {nivel}
                  </button>
                ))}
              </div>

              <div className="mt-2 flex gap-2">
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                >
                  <option value="Todas">Todas las categorías</option>
                  {GRUPOS_CATEGORIAS.map((grupo) => (
                    <optgroup key={grupo.nombre} label={grupo.nombre}>
                      {grupo.items.map((cat) => (
                        <option key={cat.valor} value={cat.valor}>{cat.etiqueta}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                <select
                  value={filtroCuadrilla}
                  onChange={(e) => setFiltroCuadrilla(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                >
                  <option value="Todas">Todas las cuadrillas</option>
                  {cuadrillasMunicipio.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="mt-2">
                <select
                  value={filtroDepartamento}
                  onChange={(e) => setFiltroDepartamento(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                >
                  <option value="Todas">Todos los departamentos</option>
                  {DEPARTAMENTOS.map((dep) => (
                    <option key={dep} value={dep}>{dep}</option>
                  ))}
                </select>
              </div>
            </div>
            <ListaIncidencias
              incidencias={pendientes}
              incidenciaSeleccionadaId={seleccionadaId}
              onSeleccionar={setSeleccionadaId}
            />
          </div>

          {seleccionada && (
            <PanelAsignacion
              incidencia={seleccionada}
              cuadrillas={cuadrillasMunicipio}
              onCerrar={() => setSeleccionadaId(null)}
            />
          )}
        </div>
      )}
    </div>
  )
}
