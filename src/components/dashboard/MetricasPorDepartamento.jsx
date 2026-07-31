import { useEffect, useState } from 'react'
import { HardHat, TrafficCone, Zap, Trash2, TreePine, Shield, FileText, Users } from 'lucide-react'
import { DEPARTAMENTOS } from '../../utils/departamento'
import { suscribirTrabajadoresMunicipio } from '../../services/trabajadoresService'
import { esDelMesActual } from '../../utils/tiempo'
import ModalTrabajadoresDepartamento from './ModalTrabajadoresDepartamento'

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })

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
      sinResolver: pendientes + enProceso.length,
      totalTrabajadores: equipo.length,
      presentes,
      cuadrillasEnTerreno: nombresCuadrillasActivas.length,
      nombresCuadrillasActivas,
      gastoMes,
    }
  }).sort((a, b) => b.sinResolver - a.sinResolver)

  const cuadrillasActivasDelAbierto = conteos.find((c) => c.departamento === departamentoAbierto)?.nombresCuadrillasActivas || []

  return (
    <div className="border-b border-gray-200 bg-white p-4">
      <h2 className="mb-3 font-semibold text-gray-700">Tickets sin resolver por departamento</h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {conteos.map(({ departamento, pendientes, asignadas, altaSinResolver, sinResolver, totalTrabajadores, presentes, cuadrillasEnTerreno, gastoMes }) => {
          const Icono = ICONO_POR_DEPARTAMENTO[departamento] || Users
          return (
            <button
              key={departamento}
              onClick={() => setDepartamentoAbierto(departamento)}
              className="min-w-[200px] shrink-0 rounded-xl border border-gray-200 p-3 text-left transition-colors hover:border-primary hover:shadow-sm"
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

              {altaSinResolver > 0 && (
                <p className="mt-1 text-xs font-semibold text-red-600">{altaSinResolver} de gravedad Alta</p>
              )}

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
