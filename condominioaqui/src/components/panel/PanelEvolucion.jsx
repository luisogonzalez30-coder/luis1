import { useState } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatearDuracion, formatearFecha, promedioHoras } from '../../utils/tiempo'
import ModalDetalleIndicador from './ModalDetalleIndicador'

const formatoCLP = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})

// "Bajamos el tiempo de respuesta de 5 días a 2" es una frase de campaña. El
// resto del panel muestra el ahora; esto muestra si vamos mejor o peor que el
// mes pasado, que es lo que el Administrador necesita para defender su gestión.

function limitesDeMes(desplazamiento) {
  const hoy = new Date()
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - desplazamiento, 1)
  const fin = new Date(hoy.getFullYear(), hoy.getMonth() - desplazamiento + 1, 0, 23, 59, 59)
  return { inicio, fin }
}

function dentroDe(timestamp, { inicio, fin }) {
  if (!timestamp?.toDate) return false
  const f = timestamp.toDate()
  return f >= inicio && f <= fin
}

// Variación porcentual entre dos períodos. Devuelve null cuando el mes anterior
// no tiene base para comparar: sin eso, pasar de 0 a 5 daría "+∞%" o "+500%"
// según cómo se calcule, y ninguna de las dos cosas significa nada.
function variacion(actual, anterior) {
  if (anterior === null || anterior === undefined || anterior === 0) return null
  return ((actual - anterior) / anterior) * 100
}

// mejorEsMenos: para tiempos de respuesta, bajar es mejorar. Para reportes
// resueltos, subir es mejorar. El color y el ícono siguen esa dirección, no el
// signo del número.
function Comparacion({ etiqueta, valorActual, valorAnterior, formato, mejorEsMenos = false, nota, onAbrir, hayDetalle }) {
  const cambio = variacion(valorActual, valorAnterior)

  let tono = 'text-tinta-suave'
  let Icono = Minus
  if (cambio !== null && Math.abs(cambio) >= 1) {
    const subio = cambio > 0
    const esBueno = mejorEsMenos ? !subio : subio
    tono = esBueno ? 'text-[#0a7d0a]' : 'text-estado-critico'
    Icono = subio ? TrendingUp : TrendingDown
  }

  // Igual que en PanelIndicadores: un porcentaje de variación sin poder ver qué
  // reportes lo produjeron no se puede accionar. Acá el detalle son SIEMPRE los
  // reportes del mes en curso, que son los que el Administrador todavía puede afectar.
  const clickeable = Boolean(onAbrir) && hayDetalle
  const Elemento = clickeable ? 'button' : 'div'

  return (
    <Elemento
      type={clickeable ? 'button' : undefined}
      onClick={clickeable ? onAbrir : undefined}
      className={`rounded-2xl bg-white p-5 text-left ring-1 ring-borde transition-colors
        ${clickeable ? 'w-full cursor-pointer hover:ring-primary/30' : ''}`}
    >
      <p className="text-xs font-medium text-tinta-suave">{etiqueta}</p>
      <p className="mt-2.5 text-3xl font-semibold leading-none tracking-tight text-tinta-fuerte">
        {formato(valorActual)}
      </p>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-1.5 text-xs">
        {cambio === null ? (
          <span className="text-tinta-tenue">Sin datos del mes anterior para comparar</span>
       ) : (
          <>
            <Icono size={13} className={tono} />
            <span className={`font-medium ${tono}`}>
              {cambio > 0 ? '+' : ''}{Math.round(cambio)}%
            </span>
            <span className="text-tinta-suave">vs. mes pasado ({formato(valorAnterior)})</span>
          </>
       )}
      </div>

      {nota && <p className="mt-2 text-[11px] leading-snug text-tinta-tenue">{nota}</p>}
    </Elemento>
 )
}

export default function PanelEvolucion({ solicitudes, onSeleccionarSolicitud }) {
  const [detalle, setDetalle] = useState(null)
  const mesActual = limitesDeMes(0)
  const mesAnterior = limitesDeMes(1)

  const medir = (rango) => {
    const recibidas = solicitudes.filter((i) => dentroDe(i.fecha_creacion, rango))
    const cerradas = solicitudes.filter((i) => i.estado === 'Resuelto' && dentroDe(i.fecha_cierre, rango))
    return {
      // Se guardan las listas, no solo los conteos: son las que abre el modal al
      // pinchar la tarjeta.
      listaRecibidas: recibidas,
      listaCerradas: cerradas,
      recibidas: recibidas.length,
      cerradas: cerradas.length,
      // Tiempo de reacción: cuánto tarda el condominio en asignar equipo.
      // Es el indicador que más rápido refleja una mejora de gestión.
      reaccion: promedioHoras(recibidas, (i) => i.fecha_creacion, (i) => i.fecha_asignacion),
      resolucion: promedioHoras(cerradas, (i) => i.fecha_creacion, (i) => i.fecha_cierre),
    }
  }

  const actual = medir(mesActual)
  const anterior = medir(mesAnterior)

  const nombreMes = mesActual.inicio.toLocaleDateString('es-CL', { month: 'long' })
  const formatoEntero = (v) => (v === null ? '—' : String(Math.round(v)))
  const formatoHoras = (v) => (v === null ? '—' : v < 24 ? `${Math.round(v)} h` : `${(v / 24).toFixed(1)} d`)

  return (
    <section className="px-4 pb-5 sm:px-6">
      <h2 className="mb-3 text-sm font-semibold text-tinta-fuerte">
        Cómo vamos en {nombreMes} respecto del mes pasado
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Comparacion
          etiqueta="Trabajos terminados"
          valorActual={actual.cerradas}
          valorAnterior={anterior.cerradas}
          formato={formatoEntero}
          nota="Reportes cerrados dentro del mes"
          hayDetalle={actual.cerradas > 0}
          onAbrir={() => setDetalle('cerradas')}
        />
        <Comparacion
          etiqueta="Tiempo en asignar"
          valorActual={actual.reaccion}
          valorAnterior={anterior.reaccion}
          formato={formatoHoras}
          mejorEsMenos
          nota="Desde que entra el reporte hasta darle equipo"
          hayDetalle={actual.recibidas > 0}
          onAbrir={() => setDetalle('reaccion')}
        />
        <Comparacion
          etiqueta="Tiempo en resolver"
          valorActual={actual.resolucion}
          valorAnterior={anterior.resolucion}
          formato={formatoHoras}
          mejorEsMenos
          nota="Desde que entra el reporte hasta cerrarlo"
          hayDetalle={actual.cerradas > 0}
          onAbrir={() => setDetalle('resolucion')}
        />
        <Comparacion
          etiqueta="Reportes recibidos"
          valorActual={actual.recibidas}
          valorAnterior={anterior.recibidas}
          formato={formatoEntero}
          nota="Más reportes no es malo: significa que los residentes usan el canal"
          hayDetalle={actual.recibidas > 0}
          onAbrir={() => setDetalle('recibidas')}
        />
      </div>

      {/* Cada tarjeta abre los reportes del MES EN CURSO que producen esa cifra,
          con el dato que corresponde a la derecha: cuánto demoró en asignarse,
          cuánto en resolverse, cuánto costó. */}
      {detalle === 'cerradas' && (
        <ModalDetalleIndicador
          titulo={`Trabajos terminados en ${nombreMes}`}
          descripcion="cerrados dentro del mes"
          solicitudes={actual.listaCerradas}
          orden="cierre"
          agruparPor={(i) => i.equipo_asignado}
          lineaApoyo={(i) =>
            [
              i.equipo_asignado || 'sin equipo',
              `cerrado ${formatearFecha(i.fecha_cierre)}`,
              i.gasto_real?.costo_final ? formatoCLP.format(i.gasto_real.costo_final) : null,
            ]
              .filter(Boolean)
              .join(' · ')
          }
          datoDerecha={(i) => formatearDuracion(i.fecha_creacion, i.fecha_cierre) || '—'}
          onSeleccionar={onSeleccionarSolicitud}
          onCerrar={() => setDetalle(null)}
        />
     )}
      {detalle === 'reaccion' && (
        <ModalDetalleIndicador
          titulo={`Tiempo en asignar — ${nombreMes}`}
          descripcion={`promedio ${formatoHoras(actual.reaccion)} desde el ingreso`}
          solicitudes={actual.listaRecibidas}
          lineaApoyo={(i) =>
            i.fecha_asignacion
              ? `${i.equipo_asignado || 'sin equipo'} · asignado ${formatearFecha(i.fecha_asignacion)}`
              : 'Todavía sin equipo asignada'
          }
          datoDerecha={(i) =>
            i.fecha_asignacion ? formatearDuracion(i.fecha_creacion, i.fecha_asignacion) || '—' : 'sin asignar'
          }
          onSeleccionar={onSeleccionarSolicitud}
          onCerrar={() => setDetalle(null)}
        />
     )}
      {detalle === 'resolucion' && (
        <ModalDetalleIndicador
          titulo={`Tiempo en resolver — ${nombreMes}`}
          descripcion={`promedio ${formatoHoras(actual.resolucion)} del ingreso al cierre`}
          solicitudes={actual.listaCerradas}
          orden="demora"
          lineaApoyo={(i) => `${i.equipo_asignado || 'sin equipo'} · cerrado ${formatearFecha(i.fecha_cierre)}`}
          datoDerecha={(i) => formatearDuracion(i.fecha_creacion, i.fecha_cierre) || '—'}
          onSeleccionar={onSeleccionarSolicitud}
          onCerrar={() => setDetalle(null)}
        />
     )}
      {detalle === 'recibidas' && (
        <ModalDetalleIndicador
          titulo={`Reportes recibidos en ${nombreMes}`}
          descripcion="todo lo que entró en el mes"
          solicitudes={actual.listaRecibidas}
          lineaApoyo={(i) => `${i.estado} · ${i.direccion_texto || 'sin dirección'}`}
          onSeleccionar={onSeleccionarSolicitud}
          onCerrar={() => setDetalle(null)}
        />
     )}
    </section>
 )
}
