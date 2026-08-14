import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useMunicipio } from '../hooks/useMunicipio'
import { suscribirUltimosTickets } from '../services/ticketsPublicosService'
import { etiquetaCategoria } from '../utils/categorias'
import { COLOR_POR_GRAVEDAD } from '../utils/gravedad'
import { promedioHoras } from '../utils/tiempo'
import EncabezadoMunicipio from '../components/common/EncabezadoMunicipio'
import Spinner from '../components/common/Spinner'
import BarraNavegacion from '../components/ciudadano/BarraNavegacion'

// Cuántos reportes recientes alimentan estas estadísticas. Tope duro: el
// servicio nunca devuelve más de MAX_TICKETS_RECIENTES.
const VENTANA_REPORTES = 500

// promedioHoras descarta fechas incoherentes, para no publicar un tiempo
// negativo en una página abierta a cualquier vecino (ver utils/tiempo.js).
function promedioResolucionHoras(tickets) {
  const resueltos = tickets.filter((t) => t.estado === 'Resuelto')
  return promedioHoras(resueltos, (t) => t.fecha_creacion, (t) => t.fecha_cierre)
}

function formatearHoras(horas) {
  if (horas == null) return '—'
  return horas < 24 ? `${Math.round(horas)}h` : `${Math.round(horas / 24)}d`
}

function BarraConteo({ etiqueta, cantidad, maximo, color }) {
  const porcentaje = maximo > 0 ? Math.max((cantidad / maximo) * 100, 4) : 0
  return (
    <div className="mb-2">
      <div className="mb-0.5 flex justify-between text-xs text-gray-600">
        <span>{etiqueta}</span>
        <span className="font-medium">{cantidad}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100">
        <div className="h-2 rounded-full" style={{ width: `${porcentaje}%`, backgroundColor: color || 'var(--color-primario, #1D4ED8)' }} />
      </div>
    </div>
  )
}

// Página pública ("/:municipioSlug/transparencia"), sin login: estadísticas
// agregadas de gestión municipal, calculadas sobre tickets_publicos (colección
// ya pública, sin datos que identifiquen a nadie — mismo criterio de privacidad
// que /estado). Deliberadamente liviana (sin recharts, con barras en CSS puro)
// para no pesarle al mismo público rural/celulares de gama baja que el
// formulario ciudadano.
export default function TransparenciaPage() {
  const { municipioSlug } = useParams()
  const { municipio, cargando: cargandoMunicipio, noEncontrado } = useMunicipio(municipioSlug)
  const [tickets, setTickets] = useState([])

  // Ventana acotada a los VENTANA_REPORTES más recientes, en vez de "todo el
  // histórico": las estadísticas de una página pública no justifican descargar
  // una colección que crece sin techo (ver MAX_TICKETS_* en
  // ticketsPublicosService.js). Cuando se llega al tope, la UI aclara desde qué
  // fecha son los datos para no dar a entender que es el total histórico.
  useEffect(() => {
    if (!municipio) return
    return suscribirUltimosTickets(setTickets, municipio.id, VENTANA_REPORTES)
  }, [municipio])

  if (cargandoMunicipio) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (noEncontrado) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center text-gray-500">
        No encontramos esta municipalidad.
      </div>
    )
  }

  const total = tickets.length
  const resueltos = tickets.filter((t) => t.estado === 'Resuelto').length
  const enProceso = tickets.filter((t) => t.estado === 'En Proceso').length
  const pendientes = tickets.filter((t) => t.estado === 'Pendiente').length
  const porcentajeResueltos = total > 0 ? Math.round((resueltos / total) * 100) : 0
  const promedioHoras = promedioResolucionHoras(tickets)

  // Si se llenó la ventana, hay reportes más antiguos que estas cifras no
  // cubren — se dice explícitamente en vez de presentarlas como el histórico
  // completo. Los tickets vienen del más reciente al más antiguo.
  const estaTopeado = total >= VENTANA_REPORTES
  const fechaMasAntigua = estaTopeado
    ? tickets[total - 1]?.fecha_creacion?.toDate?.().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const conteoPorGravedad = ['Alta', 'Media', 'Baja'].map((g) => ({
    etiqueta: g,
    cantidad: tickets.filter((t) => t.nivel_gravedad === g).length,
    color: COLOR_POR_GRAVEDAD[g],
  }))

  const conteoPorCategoria = Object.entries(
    tickets.reduce((acc, t) => {
      acc[t.categoria] = (acc[t.categoria] || 0) + 1
      return acc
    }, {})
  )
    .map(([categoria, cantidad]) => ({ etiqueta: etiquetaCategoria(categoria), cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 8)

  const maximoCategoria = Math.max(...conteoPorCategoria.map((c) => c.cantidad), 1)
  const maximoGravedad = Math.max(...conteoPorGravedad.map((c) => c.cantidad), 1)

  return (
    <>
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6 pb-[calc(var(--alto-barra-inferior)+env(safe-area-inset-bottom,0px))]">
      <Link to={`/${municipioSlug}`} className="mb-4 flex items-center gap-1 text-sm text-tinta-suave hover:text-primary">
        <ArrowLeft size={16} /> Volver
      </Link>

      <EncabezadoMunicipio municipio={municipio} tituloDefecto="Transparencia" />
      <p className="mt-1 text-sm text-gray-500">Así vamos gestionando los reportes ciudadanos de la comuna.</p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { etiqueta: estaTopeado ? 'Reportes considerados' : 'Reportes totales', valor: total },
          { etiqueta: 'Resueltos', valor: `${resueltos} (${porcentajeResueltos}%)` },
          { etiqueta: 'En proceso', valor: enProceso },
          { etiqueta: 'Tiempo promedio', valor: formatearHoras(promedioHoras) },
        ].map((tarjeta) => (
          <div key={tarjeta.etiqueta} className="rounded-xl border border-gray-200 p-3">
            <p className="text-xs text-gray-500">{tarjeta.etiqueta}</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{tarjeta.valor}</p>
          </div>
        ))}
      </div>

      {total === 0 ? (
        <p className="mt-8 text-center text-sm text-gray-400">Todavía no hay reportes en esta municipalidad.</p>
      ) : (
        <>
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-semibold text-gray-700">Por gravedad</h2>
            {conteoPorGravedad.map((c) => (
              <BarraConteo key={c.etiqueta} etiqueta={c.etiqueta} cantidad={c.cantidad} maximo={maximoGravedad} color={c.color} />
            ))}
          </div>

          <div className="mt-6">
            <h2 className="mb-2 text-sm font-semibold text-gray-700">Categorías más reportadas</h2>
            {conteoPorCategoria.map((c) => (
              <BarraConteo key={c.etiqueta} etiqueta={c.etiqueta} cantidad={c.cantidad} maximo={maximoCategoria} />
            ))}
          </div>

          <p className="mt-6 text-xs text-gray-400">
            {pendientes} reportes están pendientes de asignar cuadrilla.
            {estaTopeado && ` Estas cifras consideran los ${VENTANA_REPORTES} reportes más recientes${fechaMasAntigua ? `, desde el ${fechaMasAntigua}` : ''}.`}
            {' '}Datos en tiempo real, sin incluir información que identifique a quien reportó.
          </p>
        </>
      )}
    </div>

    <BarraNavegacion municipioSlug={municipioSlug} />
    </>
  )
}
