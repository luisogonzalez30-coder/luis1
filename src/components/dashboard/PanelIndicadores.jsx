import { useEffect, useMemo, useState } from 'react'
import {
  Siren, Clock, Inbox, Wrench, CheckCircle2, Users, Truck, Star, ChevronRight,
} from 'lucide-react'
import { suscribirTrabajadoresMunicipio } from '../../services/trabajadoresService'
import { esDelMesActual, horasDesde, promedioHoras } from '../../utils/tiempo'
import ModalDetalleIndicador from './ModalDetalleIndicador'

// Umbral de atraso para un ticket sin asignar cuadrilla. El mismo criterio que
// MetricasPorDepartamento usa para las alertas rojas por departamento.
const SLA_HORAS_SIN_ASIGNAR = 4

// Colores de estado de la skill `dataviz` (paleta fija, nunca temática). La
// regla de esa skill es que un color de estado JAMÁS carga solo con el
// significado: acá cada indicador crítico va siempre con ícono + etiqueta
// escrita, y el color solo refuerza.
const TONO = {
  critico: { texto: 'text-estado-critico', icono: 'text-estado-critico', anillo: 'ring-estado-critico/20' },
  serio: { texto: 'text-[#b4501f]', icono: 'text-estado-serio', anillo: 'ring-estado-serio/25' },
  bueno: { texto: 'text-[#0a7d0a]', icono: 'text-estado-bueno', anillo: 'ring-estado-bueno/20' },
  neutro: { texto: 'text-tinta-fuerte', icono: 'text-tinta-tenue', anillo: 'ring-borde' },
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatearHoras(horas) {
  if (horas == null) return '—'
  return horas < 24 ? `${Math.round(horas)} h` : `${Math.round(horas / 24)} d`
}

// Tarjeta de acción: las tres cosas que le pueden exigir algo al Alcalde hoy.
// Contrato de "stat tile" de la skill dataviz — etiqueta en frase, valor con
// figuras proporcionales (nunca tabular en un número grande y suelto), y una
// línea de apoyo que explica qué cuenta.
function TarjetaAccion({ icono: Icono, etiqueta, valor, apoyo, tono = 'neutro', onAbrir }) {
  const t = TONO[tono]
  const clickeable = Boolean(onAbrir) && valor > 0
  const Elemento = clickeable ? 'button' : 'div'

  return (
    <Elemento
      type={clickeable ? 'button' : undefined}
      onClick={clickeable ? onAbrir : undefined}
      className={`group w-full rounded-2xl bg-white p-3 text-left ring-1 transition-all duration-200 sm:p-4 ${t.anillo}
        ${clickeable ? 'hover:-translate-y-0.5 hover:shadow-tarjeta active:translate-y-0' : ''}`}
    >
      <div className="flex items-center gap-1.5">
        <Icono size={15} className={`shrink-0 ${t.icono}`} />
        <span className="min-w-0 text-xs font-medium leading-tight text-tinta-suave">{etiqueta}</span>
        {clickeable && (
          <ChevronRight
            size={14}
            className="ml-auto hidden shrink-0 text-tinta-tenue transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary sm:block"
          />
        )}
      </div>
      <p className={`mt-2 text-3xl font-semibold leading-none tracking-tight sm:mt-2.5 sm:text-4xl ${t.texto}`}>
        {valor}
      </p>
      {apoyo && <p className="mt-2 hidden text-xs leading-snug text-tinta-suave sm:block">{apoyo}</p>}
    </Elemento>
  )
}

// Dato secundario: informa, no exige acción. Deliberadamente más callado que
// las tarjetas de arriba — que todo pese lo mismo es justo lo que hacía que no
// se leyera nada.
function DatoSecundario({ icono: Icono, etiqueta, valor, apoyo }) {
  return (
    <div className="flex items-start gap-2.5 px-1 py-2">
      <Icono size={15} className="mt-0.5 shrink-0 text-tinta-tenue" />
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-none text-tinta-fuerte">{valor}</p>
        <p className="mt-1 text-xs leading-snug text-tinta-suave">
          {etiqueta}
          {apoyo && <span className="block text-tinta-tenue">{apoyo}</span>}
        </p>
      </div>
    </div>
  )
}

// Panel de control del Alcalde: el estado del municipio de un vistazo, sin
// tener que interpretar el mapa. Todo se calcula sobre el array de incidencias
// que la página ya tiene suscrito (sin consultas nuevas) más una suscripción
// al roster de trabajadores, igual que MetricasPorDepartamento.
//
// Jerarquía deliberada (antes eran 9 tarjetas del mismo tamaño y no se leía
// ninguna): una cifra protagonista, tres tarjetas de acción clicables, y el
// resto como línea secundaria. La regla de la skill dataviz es "exactamente una
// cifra protagonista por vista".
export default function PanelIndicadores({ incidencias, municipioId, onSeleccionarIncidencia }) {
  const [trabajadores, setTrabajadores] = useState([])
  const [detalle, setDetalle] = useState(null)

  useEffect(() => {
    if (!municipioId) return
    return suscribirTrabajadoresMunicipio(setTrabajadores, municipioId)
  }, [municipioId])

  const hoy = hoyISO()

  const datos = useMemo(() => {
    const pendientes = incidencias.filter((i) => i.estado === 'Pendiente')
    const enProceso = incidencias.filter((i) => i.estado === 'En Proceso')
    const resueltas = incidencias.filter((i) => i.estado === 'Resuelto')

    // Emergencias: gravedad Alta todavía sin resolver, sin importar si ya se asignó.
    const emergencias = incidencias.filter((i) => i.estado !== 'Resuelto' && i.nivel_gravedad === 'Alta')

    // Atrasados: pendientes que superaron el SLA sin que nadie les asigne cuadrilla.
    const atrasados = pendientes.filter((i) => horasDesde(i.fecha_creacion) > SLA_HORAS_SIN_ASIGNAR)

    const resueltasMes = resueltas.filter((i) => esDelMesActual(i.fecha_cierre))

    // promedioHoras descarta fechas incoherentes para que no salga un promedio
    // negativo (ver utils/tiempo.js).
    const promedioResolucion = promedioHoras(resueltasMes, (i) => i.fecha_creacion, (i) => i.fecha_cierre)

    const calificadas = resueltas.filter((i) => typeof i.calificacion_ciudadano === 'number')
    const promedioCalificacion = calificadas.length
      ? calificadas.reduce((acc, i) => acc + i.calificacion_ciudadano, 0) / calificadas.length
      : null

    return {
      pendientes, enProceso, resueltas, emergencias, atrasados, resueltasMes,
      promedioResolucion, calificadas, promedioCalificacion,
      sinResolver: pendientes.length + enProceso.length,
      cuadrillasEnTerreno: new Set(enProceso.map((i) => i.cuadrilla_asignada).filter(Boolean)).size,
    }
  }, [incidencias])

  // Asistencia de hoy. "Sin marcar" se cuenta aparte de "ausente": no es lo
  // mismo que el jefe no haya pasado lista a que la persona haya faltado
  // (mismo criterio que ModalTrabajadoresDepartamento, ver §17).
  const marcadosHoy = trabajadores.filter((t) => t.fecha_asistencia === hoy)
  const presentes = marcadosHoy.filter((t) => t.presente_hoy === true).length
  const sinMarcar = trabajadores.length - marcadosHoy.length

  const totalHistorico = incidencias.length
  const porcentajeResuelto = totalHistorico > 0
    ? Math.round((datos.resueltas.length / totalHistorico) * 100)
    : 0

  return (
    <section className="px-4 py-5 sm:px-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)] lg:items-start">
        {/* La cifra protagonista: cuánto trabajo tiene el municipio encima.
            Deliberadamente NO repite los números de las tarjetas de al lado
            (emergencias, por asignar) — cuando el mismo dato aparece dos veces,
            deja de leerse. Lo que aporta acá es la proporción resuelta, que no
            está en ninguna otra parte del panel. */}
        <div className="rounded-2xl bg-white p-5 ring-1 ring-borde">
          <p className="text-xs font-medium text-tinta-suave">Reportes sin resolver</p>
          <p className="mt-2 text-6xl font-semibold leading-none tracking-tight text-tinta-fuerte">
            {datos.sinResolver}
          </p>

          {/* Medidor: relleno con el acento, riel un paso más claro del mismo
              tono (regla de "meter" de la skill dataviz). El porcentaje va
              escrito al lado — nunca se deja que el color cargue solo. */}
          <div className="mt-4">
            <div className="h-1.5 overflow-hidden rounded-full bg-primary/15">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${porcentajeResuelto}%` }}
              />
            </div>
            <p className="mt-2 text-xs leading-snug text-tinta-suave">
              <span className="font-semibold text-tinta-fuerte">{porcentajeResuelto}% resuelto</span>{' '}
              de {totalHistorico} {totalHistorico === 1 ? 'reporte recibido' : 'reportes recibidos'}
            </p>
          </div>
        </div>

        {/* Las tres cosas que pueden exigir acción hoy. En móvil van en tres
            columnas con el texto de apoyo oculto: apiladas a ancho completo
            ocupaban tres pantallas y empujaban todo lo demás fuera de vista. */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <TarjetaAccion
            icono={Siren}
            etiqueta="Emergencias activas"
            valor={datos.emergencias.length}
            apoyo={datos.emergencias.length === 0 ? 'Ninguna urgencia sin resolver' : 'Gravedad Alta todavía sin resolver'}
            tono={datos.emergencias.length > 0 ? 'critico' : 'bueno'}
            onAbrir={() => setDetalle('emergencias')}
          />
          <TarjetaAccion
            icono={Clock}
            etiqueta="Trabajos atrasados"
            valor={datos.atrasados.length}
            // Ojo: acá van TODAS las gravedades. El aviso rojo de
            // MetricasPorDepartamento cuenta solo las de gravedad Alta, así que
            // da un número menor — se aclara en ambos textos para que no parezca
            // que uno de los dos está mal.
            apoyo={`De cualquier gravedad, más de ${SLA_HORAS_SIN_ASIGNAR}h sin cuadrilla`}
            tono={datos.atrasados.length > 0 ? 'serio' : 'bueno'}
            onAbrir={() => setDetalle('atrasados')}
          />
          <TarjetaAccion
            icono={Inbox}
            etiqueta="Por asignar"
            valor={datos.pendientes.length}
            apoyo="Reportes esperando que se les asigne cuadrilla"
            onAbrir={() => setDetalle('pendientes')}
          />
        </div>
      </div>

      {/* Línea secundaria: contexto, no acción. */}
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 rounded-2xl bg-white px-4 py-2 ring-1 ring-borde sm:grid-cols-3 lg:grid-cols-6">
        <DatoSecundario
          icono={Wrench}
          valor={datos.enProceso.length}
          etiqueta="En ejecución"
          apoyo="Ya tienen cuadrilla"
        />
        <DatoSecundario
          icono={CheckCircle2}
          valor={datos.resueltasMes.length}
          etiqueta="Resueltos este mes"
          apoyo={`${datos.resueltas.length} históricos`}
        />
        <DatoSecundario
          icono={Users}
          valor={trabajadores.length ? `${presentes}/${trabajadores.length}` : '—'}
          etiqueta="Trabajadores presentes"
          apoyo={trabajadores.length ? `${sinMarcar} sin pasar lista` : 'Sin personal cargado'}
        />
        <DatoSecundario
          icono={Truck}
          valor={datos.cuadrillasEnTerreno}
          etiqueta="Cuadrillas en terreno"
          apoyo="Con trabajo en ejecución"
        />
        <DatoSecundario
          icono={Clock}
          valor={formatearHoras(datos.promedioResolucion)}
          etiqueta="Tiempo promedio"
          apoyo="Ingreso hasta cierre, este mes"
        />
        <DatoSecundario
          icono={Star}
          valor={datos.promedioCalificacion ? `${datos.promedioCalificacion.toFixed(1)}/5` : '—'}
          etiqueta="Satisfacción vecinal"
          apoyo={datos.calificadas.length ? `${datos.calificadas.length} calificaciones` : 'Sin calificaciones'}
        />
      </div>

      {detalle === 'emergencias' && (
        <ModalDetalleIndicador
          titulo="Emergencias activas"
          descripcion="gravedad Alta sin resolver"
          incidencias={datos.emergencias}
          onSeleccionar={onSeleccionarIncidencia}
          onCerrar={() => setDetalle(null)}
        />
      )}
      {detalle === 'atrasados' && (
        <ModalDetalleIndicador
          titulo="Trabajos atrasados"
          descripcion={`más de ${SLA_HORAS_SIN_ASIGNAR}h sin cuadrilla`}
          incidencias={datos.atrasados}
          onSeleccionar={onSeleccionarIncidencia}
          onCerrar={() => setDetalle(null)}
        />
      )}
      {detalle === 'pendientes' && (
        <ModalDetalleIndicador
          titulo="Por asignar"
          descripcion="esperando cuadrilla"
          incidencias={datos.pendientes}
          onSeleccionar={onSeleccionarIncidencia}
          onCerrar={() => setDetalle(null)}
        />
      )}
    </section>
  )
}
