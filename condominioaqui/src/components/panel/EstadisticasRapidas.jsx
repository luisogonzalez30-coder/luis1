import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { COLOR_POR_GRAVEDAD } from '../../utils/gravedad'

const NIVELES = ['Alta', 'Media', 'Baja']

const PERIODOS = [
  { valor: 'este_mes', etiqueta: 'Este mes' },
  { valor: 'mes_pasado', etiqueta: 'Mes pasado' },
  { valor: 'ultimos_3_meses', etiqueta: 'Últimos 3 meses' },
  { valor: 'todo', etiqueta: 'Todo el tiempo' },
]

// Devuelve el rango [desde, hasta] (Date) para un período, o null en "todo"
// (sin filtro de fecha).
function calcularRango(periodo) {
  const ahora = new Date()

  if (periodo === 'este_mes') {
    return { desde: new Date(ahora.getFullYear(), ahora.getMonth(), 1), hasta: ahora }
  }
  if (periodo === 'mes_pasado') {
    return {
      desde: new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1),
      hasta: new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59),
    }
  }
  if (periodo === 'ultimos_3_meses') {
    return { desde: new Date(ahora.getFullYear(), ahora.getMonth() - 2, 1), hasta: ahora }
  }
  return null // "todo"
}

// fecha_creacion puede ser null transitoriamente en una escritura recién hecha
// que el servidor todavía no confirma (mismo patrón que TarjetaSolicitud.formatearFecha).
function estaEnRango(timestamp, rango) {
  if (!timestamp?.toDate) return false
  if (!rango) return true
  const fecha = timestamp.toDate()
  return fecha >= rango.desde && fecha <= rango.hasta
}

function TarjetaStat({ etiqueta, valor, porcentaje }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase text-gray-400">{etiqueta}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{valor}</p>
      {porcentaje !== undefined && <p className="text-xs text-gray-400">{porcentaje}% del total</p>}
    </div>
 )
}

// Recibe las solicitudes que DashboardPage ya suscribe en tiempo real — sin
// queries ni índices nuevos, solo se agregan sobre datos que ya están en memoria.
export default function EstadisticasRapidas({ solicitudes }) {
  const [periodo, setPeriodo] = useState('este_mes')

  const { total, pendientes, asignadas, resueltas, datosGravedad } = useMemo(() => {
    const rango = calcularRango(periodo)
    const filtradas = solicitudes.filter((inc) => estaEnRango(inc.fecha_creacion, rango))
    const conteoGravedad = { Alta: 0, Media: 0, Baja: 0 }
    filtradas.forEach((inc) => {
      if (conteoGravedad[inc.nivel_gravedad] !== undefined) conteoGravedad[inc.nivel_gravedad] += 1
    })

    return {
      total: filtradas.length,
      pendientes: filtradas.filter((i) => i.estado === 'Pendiente').length,
      asignadas: filtradas.filter((i) => i.estado === 'En Proceso').length,
      resueltas: filtradas.filter((i) => i.estado === 'Resuelto').length,
      datosGravedad: NIVELES.map((nivel) => ({
        nivel,
        cantidad: conteoGravedad[nivel],
        color: COLOR_POR_GRAVEDAD[nivel],
      })),
    }
  }, [solicitudes, periodo])

  const porcentaje = (n) => (total > 0 ? Math.round((n / total) * 100) : 0)
  const etiquetaPeriodo = PERIODOS.find((p) => p.valor === periodo)?.etiqueta

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Estadísticas Rápidas</h2>
          <p className="text-sm text-gray-500">Resumen para cuenta pública.</p>
        </div>
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {PERIODOS.map((p) => (
            <option key={p.valor} value={p.valor}>{p.etiqueta}</option>
         ))}
        </select>
      </div>

      {total === 0 ? (
        <p className="text-sm text-gray-400">Sin datos en este período todavía.</p>
     ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <TarjetaStat etiqueta={`Total (${etiquetaPeriodo})`} valor={total} />
            <TarjetaStat etiqueta="Pendientes" valor={pendientes} porcentaje={porcentaje(pendientes)} />
            <TarjetaStat etiqueta="En proceso" valor={asignadas} porcentaje={porcentaje(asignadas)} />
            <TarjetaStat etiqueta="Resueltas" valor={resueltas} porcentaje={porcentaje(resueltas)} />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Desglose por gravedad</h3>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={datosGravedad} barCategoryGap="30%">
                  <CartesianGrid vertical={false} stroke="#e1e0d9" />
                  <XAxis
                    dataKey="nivel"
                    tickLine={false}
                    axisLine={{ stroke: '#c3c2b7' }}
                    tick={{ fill: '#52514e', fontSize: 13 }}
                  />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#898781', fontSize: 12 }} width={28} />
                  <Tooltip
                    cursor={{ fill: 'rgba(11,11,11,0.04)' }}
                    formatter={(value) => [value, 'Solicitudes']}
                    labelFormatter={(nivel) => `Gravedad ${nivel}`}
                  />
                  <Bar dataKey="cantidad" radius={[4, 4, 0, 0]} maxBarSize={64}>
                    {datosGravedad.map((d) => (
                      <Cell key={d.nivel} fill={d.color} />
                   ))}
                    <LabelList dataKey="cantidad" position="top" fill="#52514e" fontSize={13} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
     )}
    </div>
 )
}
