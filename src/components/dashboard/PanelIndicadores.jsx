import { useEffect, useState } from 'react'
import {
  Siren, Clock, Inbox, Wrench, CheckCircle2, Users, Truck, Star,
} from 'lucide-react'
import { suscribirTrabajadoresMunicipio } from '../../services/trabajadoresService'
import { esDelMesActual, horasDesde } from '../../utils/tiempo'

// Umbral de atraso para un ticket sin asignar cuadrilla. El mismo criterio que
// MetricasPorDepartamento usa para las alertas rojas por departamento.
const SLA_HORAS_SIN_ASIGNAR = 4

// Colores de estado de la skill `dataviz` (paleta fija, nunca temática). La
// regla de esa skill es que un color de estado JAMÁS carga solo con el
// significado: acá cada indicador crítico va siempre con ícono + etiqueta
// escrita, y el color solo refuerza.
const TONO = {
  critico: { texto: 'text-[#d03b3b]', fondo: 'bg-[#d03b3b]/5', anillo: 'ring-[#d03b3b]/20', icono: 'text-[#d03b3b]' },
  serio: { texto: 'text-[#c2410c]', fondo: 'bg-[#ec835a]/5', anillo: 'ring-[#ec835a]/25', icono: 'text-[#ec835a]' },
  bueno: { texto: 'text-[#0ca30c]', fondo: 'bg-[#0ca30c]/5', anillo: 'ring-[#0ca30c]/20', icono: 'text-[#0ca30c]' },
  neutro: { texto: 'text-gray-900', fondo: 'bg-white', anillo: 'ring-black/5', icono: 'text-gray-400' },
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatearHoras(horas) {
  if (horas == null) return '—'
  return horas < 24 ? `${Math.round(horas)} h` : `${Math.round(horas / 24)} d`
}

// Tarjeta de indicador. Contrato de "stat tile" de la skill dataviz: etiqueta
// en frase, valor grande en la misma tipografía del resto (sin fuente
// decorativa), y una línea de apoyo opcional que explica el número — que es lo
// que lo hace didáctico y no solo un número suelto.
function Indicador({ icono: Icono, etiqueta, valor, apoyo, tono = 'neutro', destacado = false }) {
  const t = TONO[tono]
  return (
    <div
      className={`rounded-2xl p-4 shadow-sm ring-1 transition-shadow hover:shadow-md ${t.fondo} ${t.anillo}
        ${destacado ? 'sm:col-span-2' : ''}`}
    >
      <div className="flex items-center gap-2">
        <Icono size={16} className={t.icono} />
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{etiqueta}</span>
      </div>
      <p className={`mt-2 text-3xl font-semibold leading-none ${t.texto}`}>{valor}</p>
      {apoyo && <p className="mt-1.5 text-xs leading-snug text-gray-500">{apoyo}</p>}
    </div>
  )
}

// Panel de control del Alcalde: el estado del municipio de un vistazo, sin
// tener que interpretar el mapa. Todo se calcula sobre el array de incidencias
// que la página ya tiene suscrito (sin consultas nuevas) más una suscripción
// al roster de trabajadores, igual que MetricasPorDepartamento.
export default function PanelIndicadores({ incidencias, municipioId }) {
  const [trabajadores, setTrabajadores] = useState([])

  useEffect(() => {
    if (!municipioId) return
    return suscribirTrabajadoresMunicipio(setTrabajadores, municipioId)
  }, [municipioId])

  const hoy = hoyISO()

  const pendientes = incidencias.filter((i) => i.estado === 'Pendiente')
  const enProceso = incidencias.filter((i) => i.estado === 'En Proceso')
  const resueltas = incidencias.filter((i) => i.estado === 'Resuelto')

  // Emergencias: gravedad Alta todavía sin resolver, sin importar si ya se asignó.
  const emergencias = incidencias.filter((i) => i.estado !== 'Resuelto' && i.nivel_gravedad === 'Alta')

  // Atrasados: pendientes que superaron el SLA sin que nadie les asigne cuadrilla.
  const atrasados = pendientes.filter((i) => horasDesde(i.fecha_creacion) > SLA_HORAS_SIN_ASIGNAR)

  const resueltasMes = resueltas.filter((i) => esDelMesActual(i.fecha_cierre))

  // Tiempo promedio desde que entra el reporte hasta que se cierra (solo del mes).
  const conTiempos = resueltasMes.filter((i) => i.fecha_creacion?.toDate && i.fecha_cierre?.toDate)
  const promedioResolucion = conTiempos.length
    ? conTiempos.reduce((acc, i) => acc + (i.fecha_cierre.toDate() - i.fecha_creacion.toDate()) / 3_600_000, 0) / conTiempos.length
    : null

  const calificadas = resueltas.filter((i) => typeof i.calificacion_ciudadano === 'number')
  const promedioCalificacion = calificadas.length
    ? calificadas.reduce((acc, i) => acc + i.calificacion_ciudadano, 0) / calificadas.length
    : null

  // Asistencia de hoy. "Sin marcar" se cuenta aparte de "ausente": no es lo
  // mismo que el jefe no haya pasado lista a que la persona haya faltado
  // (mismo criterio que ModalTrabajadoresDepartamento, ver §17).
  const marcadosHoy = trabajadores.filter((t) => t.fecha_asistencia === hoy)
  const presentes = marcadosHoy.filter((t) => t.presente_hoy === true).length
  const ausentes = marcadosHoy.filter((t) => t.presente_hoy === false).length
  const sinMarcar = trabajadores.length - marcadosHoy.length

  const cuadrillasEnTerreno = new Set(enProceso.map((i) => i.cuadrilla_asignada).filter(Boolean)).size

  return (
    <section className="border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white px-4 py-5">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">Estado del municipio hoy</h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <Indicador
          icono={Siren}
          etiqueta="Emergencias activas"
          valor={emergencias.length}
          apoyo={emergencias.length === 0 ? 'Ninguna urgencia sin resolver' : 'Gravedad Alta todavía sin resolver'}
          tono={emergencias.length > 0 ? 'critico' : 'bueno'}
        />
        <Indicador
          icono={Clock}
          etiqueta="Trabajos atrasados"
          valor={atrasados.length}
          // Ojo: acá van TODAS las gravedades. El aviso rojo de más abajo
          // (MetricasPorDepartamento) cuenta solo las de gravedad Alta, así que
          // da un número menor — se aclara en ambos textos para que no parezca
          // que uno de los dos está mal.
          apoyo={`De cualquier gravedad, más de ${SLA_HORAS_SIN_ASIGNAR}h sin cuadrilla`}
          tono={atrasados.length > 0 ? 'serio' : 'bueno'}
        />
        <Indicador
          icono={Inbox}
          etiqueta="Por asignar"
          valor={pendientes.length}
          apoyo="Reportes esperando que se les asigne cuadrilla"
        />
        <Indicador
          icono={Wrench}
          etiqueta="Trabajos inconclusos"
          valor={enProceso.length}
          apoyo="Ya tienen cuadrilla, todavía sin terminar"
        />
        <Indicador
          icono={CheckCircle2}
          etiqueta="Resueltos este mes"
          valor={resueltasMes.length}
          apoyo={`${resueltas.length} en total desde que existe la app`}
          tono={resueltasMes.length > 0 ? 'bueno' : 'neutro'}
        />
        <Indicador
          icono={Users}
          etiqueta="Trabajadores presentes"
          valor={trabajadores.length ? `${presentes}/${trabajadores.length}` : '—'}
          apoyo={
            trabajadores.length === 0
              ? 'Todavía no hay personal cargado'
              : `${ausentes} ausente${ausentes === 1 ? '' : 's'} · ${sinMarcar} sin pasar lista`
          }
          tono={sinMarcar > 0 && sinMarcar === trabajadores.length ? 'serio' : 'neutro'}
        />
        <Indicador
          icono={Truck}
          etiqueta="Cuadrillas en terreno"
          valor={cuadrillasEnTerreno}
          apoyo="Con al menos un trabajo en ejecución"
        />
        <Indicador
          icono={Clock}
          etiqueta="Tiempo promedio"
          valor={formatearHoras(promedioResolucion)}
          apoyo="Desde que entra el reporte hasta cerrarlo (este mes)"
        />
        <Indicador
          icono={Star}
          etiqueta="Satisfacción vecinal"
          valor={promedioCalificacion ? `${promedioCalificacion.toFixed(1)}/5` : '—'}
          apoyo={
            calificadas.length
              ? `${calificadas.length} vecino${calificadas.length === 1 ? '' : 's'} calificó el trabajo`
              : 'Ningún vecino ha calificado todavía'
          }
          tono={promedioCalificacion >= 4 ? 'bueno' : 'neutro'}
        />
      </div>
    </section>
  )
}
