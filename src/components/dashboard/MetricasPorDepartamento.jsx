import { useEffect, useState } from 'react'
import { HardHat, TrafficCone, Zap, Trash2, TreePine, Shield, FileText, Users, AlertTriangle } from 'lucide-react'
import { DEPARTAMENTOS } from '../../utils/departamento'
import { suscribirTrabajadoresMunicipio } from '../../services/trabajadoresService'
import { esDelMesActual, horasDesde } from '../../utils/tiempo'
import ModalTrabajadoresDepartamento from './ModalTrabajadoresDepartamento'

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })

// Umbral de SLA: una incidencia de gravedad Alta que lleva más de este tiempo
// en "Pendiente" (sin cuadrilla asignada) se marca como vencida. 4 horas es un
// punto de partida razonable para algo "de riesgo inminente a la seguridad"
// (ver criterio de gravedad en utils/gravedad.js) — ajustable acá si el
// municipio prefiere otro umbral.
const SLA_HORAS_ALTA_SIN_ASIGNAR = 4

const ICONO_POR_DEPARTAMENTO = {
  'Dirección de Obras (DOM)': HardHat,
  'Tránsito': TrafficCone,
  'Operaciones': Zap,
  'Aseo y Ornato': Trash2,
  'Medio Ambiente': TreePine,
  'Seguridad Ciudadana': Shield,
  'Oficina de Partes': FileText,
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

// Tarjetas de "tickets sin resolver por departamento" para que el Alcalde
// fiscalice de un vistazo quién está atrasado. Cuenta sobre el array de
// incidencias que YA suscribe DashboardGeneralPage (sin queries nuevas) —
// a propósito independiente de los filtros de mapa/lista de abajo: es una
// comparación entre TODOS los departamentos, no debe cambiar si el Alcalde
// está mirando uno solo en el mapa.
// Cada tarjeta es clicable: abre el roster de trabajadores de ese departamento
// (asistencia, disponibilidad, cargos) en modo solo lectura — ver
// ModalTrabajadoresDepartamento.jsx y "Órdenes de Trabajo y Costeo" en
// ESTADO_PROYECTO.md. Además muestra headcount/asistencia de un vistazo (sin
// abrir el modal), calculado sobre una única suscripción a todos los
// trabajadores del municipio (agrupados en memoria por departamento).
export default function MetricasPorDepartamento({ incidencias, municipioId }) {
  const [departamentoAbierto, setDepartamentoAbierto] = useState(null)
  const [trabajadores, setTrabajadores] = useState([])

  useEffect(() => {
    if (!municipioId) return
    const unsubscribe = suscribirTrabajadoresMunicipio(setTrabajadores, municipioId)
    return unsubscribe
  }, [municipioId])

  const hoy = hoyISO()

  const conteos = DEPARTAMENTOS.map((dep) => {
    const delDepartamento = incidencias.filter((inc) => inc.departamento === dep)
    const pendientes = delDepartamento.filter((inc) => inc.estado === 'Pendiente').length
    const enProceso = delDepartamento.filter((inc) => inc.estado === 'En Proceso')
    const altaSinResolver = delDepartamento.filter(
      (inc) => inc.estado !== 'Resuelto' && inc.nivel_gravedad === 'Alta'
    ).length
    const altaVencidaSla = delDepartamento.filter(
      (inc) => inc.estado === 'Pendiente' && inc.nivel_gravedad === 'Alta' && horasDesde(inc.fecha_creacion) > SLA_HORAS_ALTA_SIN_ASIGNAR
    ).length

    const equipo = trabajadores.filter((t) => t.departamento === dep)
    const presentes = equipo.filter((t) => t.fecha_asistencia === hoy && t.presente_hoy === true).length

    // Cuadrillas distintas actualmente con un ticket "En Proceso" en este departamento.
    const nombresCuadrillasActivas = [...new Set(enProceso.map((inc) => inc.cuadrilla_asignada).filter(Boolean))]

    // Gasto ejecutado del mes actual, acotado a este departamento (mismo criterio
    // que ResumenGastoMensual.jsx, que hace lo mismo a nivel municipal completo).
    const gastoMes = delDepartamento
      .filter((inc) => inc.estado === 'Resuelto' && esDelMesActual(inc.fecha_cierre))
      .reduce((total, inc) => total + (inc.gasto_real?.costo_final || 0), 0)

    return {
      departamento: dep,
      pendientes,
      asignadas: enProceso.length,
      altaSinResolver,
      altaVencidaSla,
      sinResolver: pendientes + enProceso.length,
      totalTrabajadores: equipo.length,
      presentes,
      cuadrillasEnTerreno: nombresCuadrillasActivas.length,
      nombresCuadrillasActivas,
      gastoMes,
    }
  }).sort((a, b) => b.sinResolver - a.sinResolver)

  const cuadrillasActivasDelAbierto = conteos.find((c) => c.departamento === departamentoAbierto)?.nombresCuadrillasActivas || []
  const totalVencidasSla = conteos.reduce((total, c) => total + c.altaVencidaSla, 0)

  return (
    <div className="border-b border-gray-200 bg-white p-4">
      <h2 className="mb-3 font-semibold text-gray-700">Tickets sin resolver por departamento</h2>

      {totalVencidasSla > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            <strong>{totalVencidasSla}</strong> {totalVencidasSla === 1 ? 'incidencia de gravedad Alta lleva' : 'incidencias de gravedad Alta llevan'} más
            de {SLA_HORAS_ALTA_SIN_ASIGNAR}h sin asignar cuadrilla.
          </span>
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-1">
        {conteos.map(({ departamento, pendientes, asignadas, altaSinResolver, altaVencidaSla, sinResolver, totalTrabajadores, presentes, cuadrillasEnTerreno, gastoMes }) => {
          const Icono = ICONO_POR_DEPARTAMENTO[departamento] || Users
          return (
            <button
              key={departamento}
              onClick={() => setDepartamentoAbierto(departamento)}
              className={`min-w-[200px] shrink-0 rounded-xl border p-3 text-left transition-colors hover:shadow-sm
                ${altaVencidaSla > 0 ? 'border-red-300 bg-red-50/40 hover:border-red-400' : 'border-gray-200 hover:border-primary'}`}
            >
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <Icono size={14} className="text-primary" />
                {departamento}
              </div>
              <p className="mt-1 text-2xl font-bold text-gray-900">{sinResolver}</p>
              <p className="mt-1 text-xs text-gray-500">{pendientes} pendientes · {asignadas} en proceso</p>

              <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Users size={12} />
                  {totalTrabajadores > 0 ? `${presentes}/${totalTrabajadores} presentes` : 'Sin personal'}
                </span>
                {cuadrillasEnTerreno > 0 && (
                  <span className="font-medium text-blue-700">{cuadrillasEnTerreno} en terreno</span>
                )}
              </div>

              {altaVencidaSla > 0 ? (
                <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-600">
                  <AlertTriangle size={12} /> {altaVencidaSla} Alta sin asignar +{SLA_HORAS_ALTA_SIN_ASIGNAR}h
                </p>
              ) : altaSinResolver > 0 ? (
                <p className="mt-1 text-xs font-semibold text-red-600">{altaSinResolver} de gravedad Alta</p>
              ) : null}

              <p className="mt-2 border-t border-gray-100 pt-2 text-xs text-gray-500">
                Gasto este mes: <span className="font-semibold text-gray-900">{formatoCLP.format(gastoMes)}</span>
              </p>
            </button>
          )
        })}
      </div>

      {departamentoAbierto && (
        <ModalTrabajadoresDepartamento
          departamento={departamentoAbierto}
          municipioId={municipioId}
          cuadrillasActivas={cuadrillasActivasDelAbierto}
          soloLectura
          onCerrar={() => setDepartamentoAbierto(null)}
        />
      )}
    </div>
  )
}
