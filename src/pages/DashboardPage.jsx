import { useEffect, useState } from 'react'
import { suscribirIncidencias } from '../services/incidenciasService'
import { useMunicipio } from '../hooks/useMunicipio'
import { ORDEN_GRAVEDAD } from '../utils/gravedad'
import { CATEGORIAS, agruparCategorias } from '../utils/categorias'
import MapaIncidencias from '../components/dashboard/MapaIncidencias'
import ListaIncidencias from '../components/dashboard/ListaIncidencias'
import PanelAsignacion from '../components/dashboard/PanelAsignacion'
import EstadisticasRapidas from '../components/dashboard/EstadisticasRapidas'
import EncabezadoMunicipio from '../components/common/EncabezadoMunicipio'
import Spinner from '../components/common/Spinner'
import { useAuth } from '../context/AuthContext'

const FILTROS_GRAVEDAD = ['Todas', 'Alta', 'Media', 'Baja']
const GRUPOS_CATEGORIAS = agruparCategorias(CATEGORIAS)

export default function DashboardPage() {
  const [incidencias, setIncidencias] = useState([])
  const [seleccionadaId, setSeleccionadaId] = useState(null)
  const [filtroGravedad, setFiltroGravedad] = useState('Todas')
  const [filtroCategoria, setFiltroCategoria] = useState('Todas')
  const [filtroCuadrilla, setFiltroCuadrilla] = useState('Todas')
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

  // Los 3 filtros aplican tanto al mapa como a la lista, para que ambos muestren
  // siempre el mismo subconjunto — la lista además siempre se acota a "Pendiente"
  // (es la cola de trabajo por hacer), el mapa mantiene todos los estados (vista
  // de situación completa).
  const incidenciasFiltradas = incidencias
    .filter((inc) => filtroGravedad === 'Todas' || inc.nivel_gravedad === filtroGravedad)
    .filter((inc) => filtroCategoria === 'Todas' || inc.categoria === filtroCategoria)
    .filter((inc) => filtroCuadrilla === 'Todas' || inc.cuadrilla_asignada === filtroCuadrilla)

  const pendientes = incidenciasFiltradas
    .filter((inc) => inc.estado === 'Pendiente')
    // Gravedad Alta primero siempre; dentro de un mismo nivel se mantiene el orden
    // por fecha (más reciente primero) que ya viene de la consulta a Firestore.
    .sort((a, b) => (ORDEN_GRAVEDAD[a.nivel_gravedad] ?? 1) - (ORDEN_GRAVEDAD[b.nivel_gravedad] ?? 1))

  const seleccionada = incidencias.find((inc) => inc.id === seleccionadaId) || null
  const cuadrillasMunicipio = municipio.cuadrillas || []

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-4">
          <EncabezadoMunicipio municipio={municipio} tituloDefecto="Dashboard DOM — Incidencias Urbanas" />
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            {[
              { id: 'mapa', etiqueta: 'Mapa' },
              { id: 'estadisticas', etiqueta: 'Estadísticas Rápidas' },
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
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>{perfil.nombre} ({perfil.rol})</span>
            <button onClick={cerrarSesion} className="text-primary hover:underline">Cerrar sesión</button>
          </div>
        )}
      </header>

      {vista === 'estadisticas' ? (
        <EstadisticasRapidas incidencias={incidencias} />
      ) : (
        <div className="relative flex flex-1 overflow-hidden">
          <div className="w-[60%] h-full">
            <MapaIncidencias
              incidencias={incidenciasFiltradas}
              incidenciaSeleccionadaId={seleccionadaId}
              onSeleccionar={setSeleccionadaId}
              centro={municipio.centro_mapa}
            />
          </div>

          <div className="w-[40%] h-full border-l border-gray-200 bg-gray-50">
            <div className="border-b border-gray-200 p-3">
              <h2 className="font-semibold text-gray-700">Pendientes ({pendientes.length})</h2>

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
