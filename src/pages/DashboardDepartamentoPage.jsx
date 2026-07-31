import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { suscribirIncidencias } from '../services/incidenciasService'
import { useMunicipio } from '../hooks/useMunicipio'
import { ORDEN_GRAVEDAD } from '../utils/gravedad'
import { CATEGORIAS, agruparCategorias } from '../utils/categorias'
import MapaIncidencias from '../components/dashboard/MapaIncidencias'
import ListaIncidencias from '../components/dashboard/ListaIncidencias'
import PanelGestionDepartamento from '../components/dashboard/PanelGestionDepartamento'
import ModalTrabajadoresDepartamento from '../components/dashboard/ModalTrabajadoresDepartamento'
import EncabezadoMunicipio from '../components/common/EncabezadoMunicipio'
import Spinner from '../components/common/Spinner'
import { useAuth } from '../context/AuthContext'

const FILTROS_GRAVEDAD = ['Todas', 'Alta', 'Media', 'Baja']
const GRUPOS_CATEGORIAS = agruparCategorias(CATEGORIAS)

// Dashboard del Jefe de Departamento: acotado SIEMPRE a perfil.departamento —
// nunca ve incidencias de otros departamentos, sin importar los demás filtros
// (ver también firestore.rules: no puede ni escribir fuera de su departamento).
export default function DashboardDepartamentoPage() {
  const [incidencias, setIncidencias] = useState([])
  const [seleccionadaId, setSeleccionadaId] = useState(null)
  const [filtroGravedad, setFiltroGravedad] = useState('Todas')
  const [filtroCategoria, setFiltroCategoria] = useState('Todas')
  const [filtroCuadrilla, setFiltroCuadrilla] = useState('Todas')
  const [mostrarEquipo, setMostrarEquipo] = useState(false)
  const { perfil, cerrarSesion } = useAuth()
  const { municipio, cargando, noEncontrado } = useMunicipio(perfil?.municipio_id)

  useEffect(() => {
    if (!municipio) return
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

  const incidenciasDelDepartamento = incidencias.filter((inc) => inc.departamento === perfil.departamento)

  const incidenciasFiltradas = incidenciasDelDepartamento
    .filter((inc) => filtroGravedad === 'Todas' || inc.nivel_gravedad === filtroGravedad)
    .filter((inc) => filtroCategoria === 'Todas' || inc.categoria === filtroCategoria)
    .filter((inc) => filtroCuadrilla === 'Todas' || inc.cuadrilla_asignada === filtroCuadrilla)

  // A diferencia del Dashboard del Alcalde (donde "pendientes" es solo la cola
  // sin asignar), acá el Jefe también resuelve, así que su cola de trabajo
  // incluye "En Proceso" — todo lo que no esté Resuelto todavía.
  const porHacer = incidenciasFiltradas
    .filter((inc) => inc.estado !== 'Resuelto')
    .sort((a, b) => (ORDEN_GRAVEDAD[a.nivel_gravedad] ?? 1) - (ORDEN_GRAVEDAD[b.nivel_gravedad] ?? 1))

  const seleccionada = incidenciasDelDepartamento.find((inc) => inc.id === seleccionadaId) || null
  const cuadrillasMunicipio = municipio.cuadrillas || []

  return (
    <div className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <div>
          <EncabezadoMunicipio municipio={municipio} tituloDefecto="Dashboard Departamento" />
          <p className="text-sm text-gray-500">{perfil.departamento}</p>
        </div>
        {perfil && (
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <button
              onClick={() => setMostrarEquipo(true)}
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <Users size={16} /> Mi equipo
            </button>
            <span>{perfil.nombre} ({perfil.rol})</span>
            <button onClick={cerrarSesion} className="text-primary hover:underline">Cerrar sesión</button>
          </div>
        )}
      </header>

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
            <h2 className="font-semibold text-gray-700">Por hacer ({porHacer.length})</h2>

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
            incidencias={porHacer}
            incidenciaSeleccionadaId={seleccionadaId}
            onSeleccionar={setSeleccionadaId}
          />
        </div>

        {seleccionada && (
          <PanelGestionDepartamento
            incidencia={seleccionada}
            cuadrillas={cuadrillasMunicipio}
            onCerrar={() => setSeleccionadaId(null)}
          />
        )}
      </div>

      {mostrarEquipo && (
        <ModalTrabajadoresDepartamento
          departamento={perfil.departamento}
          municipioId={perfil.municipio_id}
          onCerrar={() => setMostrarEquipo(false)}
        />
      )}
    </div>
  )
}
