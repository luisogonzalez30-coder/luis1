import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useMunicipio } from '../hooks/useMunicipio'
import { obtenerIncidenciasPorPeriodo } from '../services/incidenciasService'
import { DEPARTAMENTOS } from '../utils/departamento'
import { etiquetaCategoria } from '../utils/categorias'
import { COLOR_POR_GRAVEDAD } from '../utils/gravedad'
import { promedioHoras } from '../utils/tiempo'
import Spinner from '../components/common/Spinner'
import ResumenNarrado from '../components/dashboard/ResumenNarrado'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
const formatoNumero = new Intl.NumberFormat('es-CL')

// Períodos ofrecidos. La cuenta pública anual es la obligación legal (Ley
// 18.695), así que el año calendario es el caso principal; los otros dos
// existen para revisiones parciales durante el año.
function construirPeriodos() {
  const ahora = new Date()
  const anioActual = ahora.getFullYear()
  return [
    {
      id: `anio-${anioActual}`,
      etiqueta: `Año ${anioActual}`,
      desde: new Date(anioActual, 0, 1),
      hasta: new Date(anioActual, 11, 31, 23, 59, 59),
    },
    {
      id: `anio-${anioActual - 1}`,
      etiqueta: `Año ${anioActual - 1}`,
      desde: new Date(anioActual - 1, 0, 1),
      hasta: new Date(anioActual - 1, 11, 31, 23, 59, 59),
    },
    {
      id: 'ultimos-12',
      etiqueta: 'Últimos 12 meses',
      desde: new Date(ahora.getFullYear(), ahora.getMonth() - 11, 1),
      hasta: ahora,
    },
  ]
}

function formatearDuracion(horas) {
  if (horas == null) return '—'
  if (horas < 24) return `${Math.round(horas)} horas`
  const dias = horas / 24
  return `${dias.toFixed(dias < 10 ? 1 : 0)} días`
}

// Barra proporcional en CSS puro. A propósito NO se usa una librería de
// gráficos acá: este documento está hecho para imprimirse, y los gráficos
// dibujados en canvas/SVG por librerías suelen salir cortados o en blanco al
// imprimir. Con CSS el navegador imprime exactamente lo que se ve.
function Barra({ etiqueta, valor, maximo, sufijo = '', color }) {
  const ancho = maximo > 0 ? Math.max((valor / maximo) * 100, 1.5) : 0
  return (
    <div className="mb-1.5 break-inside-avoid">
      <div className="mb-0.5 flex items-baseline justify-between gap-3 text-xs">
        <span className="truncate text-tinta">{etiqueta}</span>
        <span className="shrink-0 font-medium text-tinta-fuerte">{formatoNumero.format(valor)}{sufijo}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 print:bg-slate-200">
        <div
          className="h-2 rounded-full"
          style={{ width: `${ancho}%`, backgroundColor: color || 'rgb(var(--color-primary-rgb))' }}
        />
      </div>
    </div>
  )
}

function Seccion({ numero, titulo, children }) {
  return (
    <section className="mt-8 break-inside-avoid">
      <h2 className="mb-3 border-b border-borde pb-1.5 text-base font-semibold text-tinta-fuerte">
        <span className="text-tinta-tenue">{numero}.</span> {titulo}
      </h2>
      {children}
    </section>
  )
}

function Dato({ etiqueta, valor, detalle }) {
  return (
    <div className="rounded-xl border border-borde p-3">
      <p className="text-[11px] uppercase tracking-wide text-tinta-suave">{etiqueta}</p>
      <p className="mt-1 text-2xl font-semibold text-tinta-fuerte">{valor}</p>
      {detalle && <p className="mt-0.5 text-[11px] leading-snug text-tinta-suave">{detalle}</p>}
    </div>
  )
}

// Informe de gestión listo para la Cuenta Pública anual (obligación del
// alcalde según la Ley 18.695). Toma los datos que la app ya registra y arma
// un documento presentable, para no tener que juntar planillas a mano.
//
// Se imprime con el diálogo del navegador ("Guardar como PDF"), sin librerías
// de PDF: cero peso extra en el bundle y funciona igual en cualquier equipo.
export default function CuentaPublicaPage() {
  const { perfil } = useAuth()
  const { municipio, cargando: cargandoMunicipio } = useMunicipio(perfil?.municipio_id)

  const periodos = useMemo(construirPeriodos, [])
  const [periodoId, setPeriodoId] = useState(periodos[0].id)
  const [incidencias, setIncidencias] = useState([])
  const [cargando, setCargando] = useState(true)

  const periodo = periodos.find((p) => p.id === periodoId) || periodos[0]

  useEffect(() => {
    if (!municipio?.id) return
    let cancelado = false
    setCargando(true)
    obtenerIncidenciasPorPeriodo(municipio.id, periodo.desde, periodo.hasta)
      .then((datos) => { if (!cancelado) setIncidencias(datos) })
      .catch((e) => console.error('[CuentaPublicaPage] Error al cargar el período:', e))
      .finally(() => { if (!cancelado) setCargando(false) })
    return () => { cancelado = true }
  }, [municipio?.id, periodo.desde, periodo.hasta])

  const resumen = useMemo(() => {
    const total = incidencias.length
    const resueltas = incidencias.filter((i) => i.estado === 'Resuelto')
    const enProceso = incidencias.filter((i) => i.estado === 'En Proceso')
    const pendientes = incidencias.filter((i) => i.estado === 'Pendiente')

    // promedioHoras descarta los registros con fechas incoherentes (ver
    // utils/tiempo.js) — si no, un puñado de datos mal migrados puede llegar a
    // mostrar un tiempo negativo en el informe.
    const promedioResolucion = promedioHoras(resueltas, (i) => i.fecha_creacion, (i) => i.fecha_cierre)
    const promedioReaccion = promedioHoras(incidencias, (i) => i.fecha_creacion, (i) => i.fecha_asignacion)

    const calificadas = resueltas.filter((i) => typeof i.calificacion_ciudadano === 'number')
    const satisfaccion = calificadas.length
      ? calificadas.reduce((a, i) => a + i.calificacion_ciudadano, 0) / calificadas.length
      : null

    const inversion = resueltas.reduce((a, i) => a + (i.gasto_real?.costo_final || 0), 0)
    const horasHombre = resueltas.reduce((a, i) => a + (i.gasto_real?.horas_reales || 0), 0)

    // Apoyo vecinal: upvotes arranca en 1 (el propio reporte), así que los
    // "vecinos que se sumaron" son los votos por sobre ese primero.
    const apoyos = incidencias.reduce((a, i) => a + Math.max((i.upvotes || 1) - 1, 0), 0)

    return {
      total,
      resueltas: resueltas.length,
      enProceso: enProceso.length,
      pendientes: pendientes.length,
      porcentajeResuelto: total ? Math.round((resueltas.length / total) * 100) : 0,
      promedioResolucion,
      promedioReaccion,
      satisfaccion,
      cantidadCalificaciones: calificadas.length,
      inversion,
      horasHombre,
      apoyos,
    }
  }, [incidencias])

  const porDepartamento = useMemo(() => {
    return DEPARTAMENTOS.map((dep) => {
      const delDep = incidencias.filter((i) => i.departamento === dep)
      const resueltas = delDep.filter((i) => i.estado === 'Resuelto')
      return {
        departamento: dep,
        recibidas: delDep.length,
        resueltas: resueltas.length,
        pendientes: delDep.filter((i) => i.estado !== 'Resuelto').length,
        promedio: promedioHoras(resueltas, (i) => i.fecha_creacion, (i) => i.fecha_cierre),
        inversion: resueltas.reduce((a, i) => a + (i.gasto_real?.costo_final || 0), 0),
      }
    })
      .filter((d) => d.recibidas > 0)
      .sort((a, b) => b.recibidas - a.recibidas)
  }, [incidencias])

  const porCategoria = useMemo(() => {
    const conteo = incidencias.reduce((acc, i) => {
      acc[i.categoria] = (acc[i.categoria] || 0) + 1
      return acc
    }, {})
    return Object.entries(conteo)
      .map(([valor, cantidad]) => ({ etiqueta: etiquetaCategoria(valor), cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10)
  }, [incidencias])

  const porGravedad = useMemo(
    () => ['Alta', 'Media', 'Baja'].map((nivel) => ({
      etiqueta: `Gravedad ${nivel}`,
      cantidad: incidencias.filter((i) => i.nivel_gravedad === nivel).length,
      color: COLOR_POR_GRAVEDAD[nivel],
    })),
    [incidencias]
  )

  const porMes = useMemo(() => {
    const meses = new Map()
    incidencias.forEach((i) => {
      if (!i.fecha_creacion?.toDate) return
      const f = i.fecha_creacion.toDate()
      const clave = `${f.getFullYear()}-${String(f.getMonth()).padStart(2, '0')}`
      if (!meses.has(clave)) {
        meses.set(clave, { etiqueta: `${MESES[f.getMonth()]} ${String(f.getFullYear()).slice(2)}`, recibidas: 0, resueltas: 0, orden: f.getFullYear() * 12 + f.getMonth() })
      }
      const m = meses.get(clave)
      m.recibidas += 1
      if (i.estado === 'Resuelto') m.resueltas += 1
    })
    return [...meses.values()].sort((a, b) => a.orden - b.orden)
  }, [incidencias])

  if (cargandoMunicipio) {
    return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>
  }

  const maxCategoria = Math.max(...porCategoria.map((c) => c.cantidad), 1)
  const maxGravedad = Math.max(...porGravedad.map((c) => c.cantidad), 1)
  const maxMes = Math.max(...porMes.map((m) => m.recibidas), 1)

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      {/* Barra de herramientas: no se imprime */}
      <div className="sticky top-0 z-20 border-b border-borde bg-white px-4 py-3 print:hidden">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <Link to="/dashboard/general" className="flex items-center gap-1 text-sm text-tinta-suave hover:text-tinta">
            <ArrowLeft size={16} /> Volver al panel
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={periodoId}
              onChange={(e) => setPeriodoId(e.target.value)}
              className="rounded-lg border border-borde px-3 py-1.5 text-sm"
            >
              {periodos.map((p) => <option key={p.id} value={p.id}>{p.etiqueta}</option>)}
            </select>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white hover:opacity-90"
            >
              <Printer size={16} /> Imprimir o guardar PDF
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl bg-white p-8 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        {/* Encabezado del documento */}
        <header className="flex items-start gap-4 border-b-2 border-tinta-fuerte pb-4">
          {municipio?.logo_url && (
            <img src={municipio.logo_url} alt="" className="h-16 w-16 object-contain" />
          )}
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-tinta-suave">Cuenta pública de gestión</p>
            <h1 className="text-2xl font-bold text-tinta-fuerte">{municipio?.nombre}</h1>
            <p className="text-sm text-tinta">
              Reportes ciudadanos · {periodo.etiqueta}
            </p>
          </div>
        </header>

        {cargando ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : resumen.total === 0 ? (
          <p className="py-16 text-center text-sm text-tinta-suave">
            No hay reportes registrados en {periodo.etiqueta.toLowerCase()}.
          </p>
        ) : (
          <>
            <Seccion numero="1" titulo="Resumen del período">
              <div className="mb-4 rounded-xl bg-slate-50 p-5 text-center print:border print:border-borde print:bg-white">
                <p className="text-5xl font-bold text-tinta-fuerte">{formatoNumero.format(resumen.resueltas)}</p>
                <p className="mt-1 text-sm text-tinta">
                  problemas de la comuna resueltos, de {formatoNumero.format(resumen.total)} reportados por los vecinos
                  <span className="font-medium text-tinta-fuerte"> ({resumen.porcentajeResuelto}%)</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Dato etiqueta="Reportes recibidos" valor={formatoNumero.format(resumen.total)} detalle="Ingresados por los vecinos" />
                <Dato etiqueta="En ejecución" valor={formatoNumero.format(resumen.enProceso)} detalle="Con cuadrilla asignada" />
                <Dato etiqueta="Por atender" valor={formatoNumero.format(resumen.pendientes)} detalle="Aún sin asignar" />
                <Dato
                  etiqueta="Apoyo vecinal"
                  valor={formatoNumero.format(resumen.apoyos)}
                  detalle="Vecinos que se sumaron a un reporte de otro"
                />
              </div>

              <div className="mt-4">
                <ResumenNarrado
                  datos={resumen}
                  periodo={periodo.etiqueta}
                  nombreMunicipio={municipio?.nombre}
                />
              </div>
            </Seccion>

            <Seccion numero="2" titulo="Cómo respondimos">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Dato
                  etiqueta="Tiempo de reacción"
                  valor={formatearDuracion(resumen.promedioReaccion)}
                  detalle="Desde que entra el reporte hasta asignar cuadrilla"
                />
                <Dato
                  etiqueta="Tiempo de resolución"
                  valor={formatearDuracion(resumen.promedioResolucion)}
                  detalle="Desde que entra el reporte hasta cerrarlo"
                />
                <Dato
                  etiqueta="Satisfacción vecinal"
                  valor={resumen.satisfaccion ? `${resumen.satisfaccion.toFixed(1)} / 5` : '—'}
                  detalle={
                    resumen.cantidadCalificaciones
                      ? `Según ${formatoNumero.format(resumen.cantidadCalificaciones)} vecinos que calificaron`
                      : 'Sin calificaciones en el período'
                  }
                />
                <Dato
                  etiqueta="Horas de trabajo"
                  valor={formatoNumero.format(Math.round(resumen.horasHombre))}
                  detalle="Horas hombre en los trabajos cerrados"
                />
              </div>
            </Seccion>

            <Seccion numero="3" titulo="Desempeño por dirección municipal">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-borde text-left text-tinta">
                    <th className="pb-1.5 font-medium">Dirección</th>
                    <th className="pb-1.5 text-right font-medium">Recibidos</th>
                    <th className="pb-1.5 text-right font-medium">Resueltos</th>
                    <th className="pb-1.5 text-right font-medium">Pendientes</th>
                    <th className="pb-1.5 text-right font-medium">T. promedio</th>
                    <th className="pb-1.5 text-right font-medium">Inversión</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {porDepartamento.map((d) => (
                    <tr key={d.departamento} className="border-b border-borde">
                      <td className="py-1.5 text-tinta-fuerte">{d.departamento}</td>
                      <td className="py-1.5 text-right text-tinta">{formatoNumero.format(d.recibidas)}</td>
                      <td className="py-1.5 text-right text-tinta">{formatoNumero.format(d.resueltas)}</td>
                      <td className="py-1.5 text-right text-tinta">{formatoNumero.format(d.pendientes)}</td>
                      <td className="py-1.5 text-right text-tinta">{formatearDuracion(d.promedio)}</td>
                      <td className="py-1.5 text-right text-tinta">{formatoCLP.format(d.inversion)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Seccion>

            <Seccion numero="4" titulo="Qué reportaron los vecinos">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-tinta-suave">
                    Problemas más reportados
                  </h3>
                  {porCategoria.map((c) => (
                    <Barra key={c.etiqueta} etiqueta={c.etiqueta} valor={c.cantidad} maximo={maxCategoria} />
                  ))}
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-tinta-suave">
                    Según gravedad
                  </h3>
                  {porGravedad.map((c) => (
                    <Barra key={c.etiqueta} etiqueta={c.etiqueta} valor={c.cantidad} maximo={maxGravedad} color={c.color} />
                  ))}
                  <p className="mt-3 text-[11px] leading-snug text-tinta-suave">
                    La gravedad se asigna automáticamente según el tipo de problema: los que implican riesgo a las
                    personas entran como Alta y encabezan la cola de trabajo.
                  </p>
                </div>
              </div>
            </Seccion>

            {porMes.length > 1 && (
              <Seccion numero="5" titulo="Evolución mes a mes">
                {porMes.map((m) => (
                  <Barra
                    key={m.etiqueta}
                    etiqueta={`${m.etiqueta} — ${m.resueltas} resueltos`}
                    valor={m.recibidas}
                    maximo={maxMes}
                    sufijo=" recibidos"
                  />
                ))}
              </Seccion>
            )}

            <Seccion numero={porMes.length > 1 ? '6' : '5'} titulo="Inversión ejecutada">
              <div className="grid grid-cols-2 gap-3">
                <Dato
                  etiqueta="Inversión total del período"
                  valor={formatoCLP.format(resumen.inversion)}
                  detalle="Costo real registrado al cerrar cada trabajo"
                />
                <Dato
                  etiqueta="Costo promedio por trabajo"
                  valor={resumen.resueltas ? formatoCLP.format(Math.round(resumen.inversion / resumen.resueltas)) : '—'}
                  detalle={`Sobre ${formatoNumero.format(resumen.resueltas)} trabajos cerrados`}
                />
              </div>
            </Seccion>

            <footer className="mt-10 border-t border-borde pt-3 text-[11px] leading-relaxed text-tinta-suave">
              <p>
                Documento generado automáticamente el{' '}
                {new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })} a partir de
                los reportes ciudadanos registrados en la plataforma. Los tiempos promedio consideran únicamente los
                reportes con fecha de cierre registrada.
              </p>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}
