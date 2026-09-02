import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { FileText, Clock, Wrench, CheckCircle2 } from 'lucide-react'
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
// que el servidor todavía no confirma (mismo patrón que TarjetaIncidencia.formatearFecha).
function estaEnRango(timestamp, rango) {
  if (!timestamp?.toDate) return false
  if (!rango) return true
  const fecha = timestamp.toDate()
  return fecha >= rango.desde && fecha <= rango.hasta
}

// Tarjeta de indicador. Es una "stat tile": un número que se lee de un vistazo,
// no un gráfico — por eso no lleva ni ejes ni interacción.
//
// Tres decisiones:
//
//  1. **El número manda.** text-3xl extrabold contra una etiqueta chica en
//     mayúsculas. La versión anterior usaba text-2xl bold sobre una etiqueta del
//     mismo peso visual, y a un metro de distancia las cuatro tarjetas se leían
//     como un bloque gris parejo. Un panel de gestión se mira de reojo entre
//     otras cosas; si hay que enfocar para leerlo, no cumple su función.
//  2. **El número va en tinta, nunca en el color del estado.** El color vive en
//     el ícono y en el punto. Es la regla de la skill dataviz —el texto usa
//     tokens de texto— y acá además resuelve un problema real: "0 pendientes"
//     en rojo se lee como una alarma cuando es la mejor noticia posible.
//  3. **El ícono es de apoyo, no protagonista.** Arriba a la derecha, tamaño
//     chico, en el color del estado. Sirve para distinguir las tarjetas de un
//     vistazo sin depender del color solo.
function TarjetaStat({ etiqueta, valor, porcentaje, icono: Icono, color = 'text-tinta-tenue', punto }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-tarjeta ring-1 ring-borde">
      {Icono && (
        <Icono size={18} className={`absolute right-3.5 top-3.5 ${color}`} strokeWidth={2} aria-hidden="true" />
      )}

      <p className="flex items-center gap-1.5 pr-7 text-[11px] font-semibold uppercase tracking-wide text-tinta-suave">
        {punto && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${punto}`} aria-hidden="true" />}
        <span className="truncate">{etiqueta}</span>
      </p>

      <p className="mt-1.5 text-3xl font-extrabold leading-none tracking-tight text-tinta-fuerte">{valor}</p>

      {porcentaje !== undefined && (
        <p className="mt-1.5 text-xs font-medium text-tinta-suave">{porcentaje}% del total</p>
      )}
    </div>
  )
}

// Recibe las incidencias que DashboardPage ya suscribe en tiempo real — sin
// queries ni índices nuevos, solo se agregan sobre datos que ya están en memoria.
export default function EstadisticasRapidas({ incidencias }) {
  const [periodo, setPeriodo] = useState('este_mes')

  const { total, pendientes, asignadas, resueltas, datosGravedad } = useMemo(() => {
    const rango = calcularRango(periodo)
    const filtradas = incidencias.filter((inc) => estaEnRango(inc.fecha_creacion, rango))
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
  }, [incidencias, periodo])

  const porcentaje = (n) => (total > 0 ? Math.round((n / total) * 100) : 0)
  const etiquetaPeriodo = PERIODOS.find((p) => p.valor === periodo)?.etiqueta

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-tinta-fuerte">Estadísticas rápidas</h2>
          <p className="mt-0.5 text-sm font-medium text-tinta-suave">Resumen para cuenta pública.</p>
        </div>
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="rounded-xl border border-borde bg-white px-3 py-2 text-sm font-medium text-tinta-fuerte focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
        >
          {PERIODOS.map((p) => (
            <option key={p.valor} value={p.valor}>{p.etiqueta}</option>
          ))}
        </select>
      </div>

      {total === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm font-medium text-tinta-suave ring-1 ring-borde">
          Sin datos en este período todavía.
        </p>
      ) : (
        <>
          {/* Los tres colores de estado son los mismos de BadgeEstado, para que
              "pendiente" sea el mismo rosa en la tarjeta de arriba y en la
              píldora de cada reporte de la lista de abajo. */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <TarjetaStat
              etiqueta={`Total (${etiquetaPeriodo})`}
              valor={total}
              icono={FileText}
              color="text-tinta-tenue"
            />
            <TarjetaStat
              etiqueta="Pendientes"
              valor={pendientes}
              porcentaje={porcentaje(pendientes)}
              icono={Clock}
              color="text-rose-500"
              punto="bg-rose-500"
            />
            <TarjetaStat
              etiqueta="En proceso"
              valor={asignadas}
              porcentaje={porcentaje(asignadas)}
              icono={Wrench}
              color="text-amber-500"
              punto="bg-amber-500"
            />
            <TarjetaStat
              etiqueta="Resueltas"
              valor={resueltas}
              porcentaje={porcentaje(resueltas)}
              icono={CheckCircle2}
              color="text-emerald-500"
              punto="bg-emerald-500"
            />
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-tarjeta ring-1 ring-borde">
            <h3 className="mb-3 text-sm font-bold tracking-tight text-tinta-fuerte">Desglose por gravedad</h3>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                {/* Grilla y ejes recesivos, en la misma escala Slate que el
                    resto de la interfaz: antes eran grises cálidos (#e1e0d9,
                    #52514e) heredados de la paleta anterior, y contra las
                    superficies frías se veían verdosos. Las barras conservan la
                    paleta de estado de utils/gravedad.js — esa no se toca: es
                    la validada, y es la misma que pintan los pines del mapa. */}
                <BarChart data={datosGravedad} barCategoryGap="30%">
                  <CartesianGrid vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="nivel"
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tick={{ fill: '#475569', fontSize: 13 }}
                  />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} width={28} />
                  <Tooltip
                    cursor={{ fill: 'rgb(15 23 42 / 0.04)' }}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 16px rgb(15 23 42 / 0.12)',
                      fontSize: 13,
                    }}
                    formatter={(value) => [value, 'Incidencias']}
                    labelFormatter={(nivel) => `Gravedad ${nivel}`}
                  />
                  <Bar dataKey="cantidad" radius={[4, 4, 0, 0]} maxBarSize={64}>
                    {datosGravedad.map((d) => (
                      <Cell key={d.nivel} fill={d.color} />
                    ))}
                    <LabelList dataKey="cantidad" position="top" fill="#334155" fontSize={13} fontWeight={600} />
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
