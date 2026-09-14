import { useEffect, useState } from 'react'
import { Users, Download, Search } from 'lucide-react'
import { suscribirSolicitudes } from '../services/solicitudesService'
import { useCondominio } from '../hooks/useCondominio'
import { ORDEN_GRAVEDAD } from '../utils/gravedad'
import { CATEGORIAS, agruparCategorias } from '../utils/categorias'
import { exportarSolicitudesCsv } from '../utils/exportarCsv'
import { coincideTexto } from '../utils/busqueda'
import ListaSolicitudes from '../components/panel/ListaSolicitudes'
import PanelGestionArea from '../components/panel/PanelGestionArea'
import ModalPersonalDeArea from '../components/panel/ModalPersonalDeArea'
import EncabezadoCondominio from '../components/common/EncabezadoCondominio'
import Spinner from '../components/common/Spinner'
import { useAuth } from '../context/AuthContext'

const FILTROS_GRAVEDAD = ['Todas', 'Alta', 'Media', 'Baja']
const GRUPOS_CATEGORIAS = agruparCategorias(CATEGORIAS)

// Dashboard del Jefe de Area: acotado SIEMPRE a perfil.area —
// nunca ve solicitudes de otros areas, sin importar los demás filtros
// (ver también firestore.rules: no puede ni escribir fuera de su área).
export default function PanelComitePage() {
  const [solicitudes, setSolicitudes] = useState([])
  const [seleccionadaId, setSeleccionadaId] = useState(null)
  const [filtroGravedad, setFiltroGravedad] = useState('Todas')
  const [filtroCategoria, setFiltroCategoria] = useState('Todas')
  const [filtroEquipo, setFiltroEquipo] = useState('Todas')
  const [filtroTexto, setFiltroTexto] = useState('')
  const [mostrarEquipo, setMostrarEquipo] = useState(false)
  const { perfil, cerrarSesion } = useAuth()
  const { condominio, cargando, noEncontrado } = useCondominio(perfil?.condominio_id)

  useEffect(() => {
    if (!condominio) return
    const unsubscribe = suscribirSolicitudes(setSolicitudes, null, condominio.id)
    return unsubscribe
  }, [condominio])

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
        Tu usuario no tiene un condominio válida asociada (condominio_id). Contacta al administrador.
      </div>
   )
  }

  const solicitudesDelArea = solicitudes.filter((inc) => inc.area === perfil.area)

  const solicitudesFiltradas = solicitudesDelArea
    .filter((inc) => filtroGravedad === 'Todas' || inc.nivel_gravedad === filtroGravedad)
    .filter((inc) => filtroCategoria === 'Todas' || inc.categoria === filtroCategoria)
    .filter((inc) => filtroEquipo === 'Todas' || inc.equipo_asignado === filtroEquipo)
    .filter((inc) => coincideTexto(inc, filtroTexto))

  // A diferencia del Dashboard del Administrador (donde "pendientes" es solo la cola
  // sin asignar), acá el Jefe también resuelve, así que su cola de trabajo
  // incluye "En Proceso" — todo lo que no esté Resuelto todavía.
  const porHacer = solicitudesFiltradas
    .filter((inc) => inc.estado !== 'Resuelto')
    .sort((a, b) => (ORDEN_GRAVEDAD[a.nivel_gravedad] ?? 1) - (ORDEN_GRAVEDAD[b.nivel_gravedad] ?? 1))

  const seleccionada = solicitudesDelArea.find((inc) => inc.id === seleccionadaId) || null
  const equiposCondominio = condominio.equipos || []

  return (
    // Scroll natural, igual que el Dashboard General (ver el comentario allá).
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div>
          <EncabezadoCondominio condominio={condominio} tituloDefecto="Dashboard Area" />
          <p className="text-sm text-gray-500">{perfil.area}</p>
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

      {/* Sin mapa: el Comité revisa su área como cola de trabajo, no como
          territorio. Todas las solicitudes del condominio comparten dirección. */}
      <div className="flex flex-col md:h-[calc(100vh-4rem)] md:min-h-[520px]">
        <div className="flex-1 overflow-y-auto border-t border-gray-200 bg-gray-50">
          <div className="border-b border-gray-200 p-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-gray-700">Por hacer ({porHacer.length})</h2>
              <button
                onClick={() => exportarSolicitudesCsv(solicitudesFiltradas, `solicitudes-${perfil.area}.csv`)}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                title="Exportar las solicitudes filtradas a CSV (Excel)"
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
                value={filtroEquipo}
                onChange={(e) => setFiltroEquipo(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
              >
                <option value="Todas">Todas las equipos</option>
                {equiposCondominio.map((c) => (
                  <option key={c} value={c}>{c}</option>
               ))}
              </select>
            </div>
          </div>
          <ListaSolicitudes
            solicitudes={porHacer}
            solicitudSeleccionadaId={seleccionadaId}
            onSeleccionar={setSeleccionadaId}
          />
        </div>

        {seleccionada && (
          <PanelGestionArea
            solicitud={seleccionada}
            solicitudes={solicitudes}
            equipos={equiposCondominio}
            onCerrar={() => setSeleccionadaId(null)}
          />
       )}
      </div>

      {mostrarEquipo && (
        <ModalPersonalDeArea
          area={perfil.area}
          condominioId={perfil.condominio_id}
          onCerrar={() => setMostrarEquipo(false)}
        />
     )}
    </div>
 )
}
