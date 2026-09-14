import { useEffect, useState } from 'react'
import { HardHat, TrafficCone, Zap, Trash2, TreePine, Shield, FileText, Users, AlertTriangle, Phone, Mail } from 'lucide-react'
import { DEPARTAMENTOS } from '../../utils/departamento'
import { suscribirTrabajadoresMunicipio } from '../../services/trabajadoresService'
import { esDelMesActual, horasDesde } from '../../utils/tiempo'
import { enlaceWhatsapp } from '../../utils/equipo'
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
export default function MetricasPorDepartamento({ incidencias, municipioId, funcionarios = [] }) {
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
    <div className="px-4 pb-5 sm:px-6">
      <h2 className="mb-3 text-sm font-semibold text-tinta-fuerte">Tickets sin resolver por departamento</h2>

      {totalVencidasSla > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-estado-critico/[0.07] px-3.5 py-2.5 text-sm text-estado-critico ring-1 ring-estado-critico/20">
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            <strong>{totalVencidasSla}</strong> {totalVencidasSla === 1 ? 'incidencia de gravedad Alta lleva' : 'incidencias de gravedad Alta llevan'} más
            de {SLA_HORAS_ALTA_SIN_ASIGNAR}h sin asignar cuadrilla.
          </span>
        </div>
      )}

      {/* -mx/px: la fila se desplaza de borde a borde en móvil sin que las
          tarjetas queden pegadas al filo de la pantalla. */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {conteos.map(({ departamento, pendientes, asignadas, altaSinResolver, altaVencidaSla, sinResolver, totalTrabajadores, presentes, cuadrillasEnTerreno, gastoMes }) => {
          const Icono = ICONO_POR_DEPARTAMENTO[departamento] || Users
          const jefe = funcionarios.find(
            (f) => f.rol === 'JEFE_DEPARTAMENTO' && f.departamento === departamento
          )
          const whatsapp = enlaceWhatsapp(jefe?.telefono)
          const urgente = altaVencidaSla > 0

          // La tarjeta NO puede ser un <button>: adentro van enlaces de contacto
          // y un <a> dentro de un <button> es HTML inválido (y el clic queda
          // ambiguo). El área grande es el botón; el contacto vive fuera de él.
          return (
            <div
              key={departamento}
              className={`w-[230px] shrink-0 snap-start overflow-hidden rounded-2xl bg-white ring-1 transition-shadow duration-200 hover:shadow-tarjeta
                ${urgente ? 'ring-estado-critico/30' : 'ring-borde'}`}
            >
              <button
                onClick={() => setDepartamentoAbierto(departamento)}
                className="w-full p-4 text-left transition-colors hover:bg-primary/[0.03]"
              >
                <div className="flex items-center gap-1.5 text-xs font-medium text-tinta-suave">
                  <Icono size={14} className="shrink-0 text-primary" />
                  <span className="truncate">{departamento}</span>
                </div>

                <p className="mt-2 text-3xl font-semibold leading-none tracking-tight text-tinta-fuerte">
                  {sinResolver}
                </p>
                <p className="mt-1.5 text-xs text-tinta-suave">
                  {pendientes} pendientes · {asignadas} en proceso
                </p>

                {urgente ? (
                  <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-estado-critico">
                    <AlertTriangle size={12} className="shrink-0" />
                    {altaVencidaSla} Alta sin asignar +{SLA_HORAS_ALTA_SIN_ASIGNAR}h
                  </p>
                ) : altaSinResolver > 0 ? (
                  <p className="mt-2 text-xs font-semibold text-estado-critico">
                    {altaSinResolver} de gravedad Alta
                  </p>
                ) : null}

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-borde pt-2.5 text-xs text-tinta-suave">
                  <span className="flex items-center gap-1">
                    <Users size={12} className="shrink-0" />
                    {totalTrabajadores > 0 ? `${presentes}/${totalTrabajadores}` : 'Sin personal'}
                  </span>
                  {cuadrillasEnTerreno > 0 && (
                    <span className="font-medium text-primary">{cuadrillasEnTerreno} en terreno</span>
                  )}
                </div>

                <p className="mt-2 text-xs text-tinta-suave">
                  Gasto del mes{' '}
                  <span className="font-semibold text-tinta-fuerte">{formatoCLP.format(gastoMes)}</span>
                </p>
              </button>

              {/* Contacto directo del jefe, sin abrir el modal: el caso de uso
                  real es "esto está atrasado, llamo ahora". */}
              <div className="flex items-center gap-1 border-t border-borde bg-tinta-fuerte/[0.02] px-2 py-1.5">
                {jefe ? (
                  <>
                    <span className="mr-auto min-w-0 truncate pl-1.5 text-[11px] text-tinta-suave">
                      {jefe.nombre}
                    </span>
                    {whatsapp && (
                      <a
                        href={whatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Escribir por WhatsApp a ${jefe.nombre}`}
                        className="toque rounded-lg text-tinta-suave transition-colors hover:bg-white hover:text-primary"
                      >
                        <Phone size={15} />
                      </a>
                    )}
                    {jefe.correo && (
                      <a
                        href={`mailto:${jefe.correo}`}
                        title={`Escribir un correo a ${jefe.nombre}`}
                        className="toque rounded-lg text-tinta-suave transition-colors hover:bg-white hover:text-primary"
                      >
                        <Mail size={15} />
                      </a>
                    )}
                  </>
                ) : (
                  <span className="px-1.5 py-2 text-[11px] text-tinta-tenue">Sin jefe asignado</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {departamentoAbierto && (
        <ModalTrabajadoresDepartamento
          departamento={departamentoAbierto}
          municipioId={municipioId}
          cuadrillasActivas={cuadrillasActivasDelAbierto}
          incidencias={incidencias}
          funcionarios={funcionarios}
          soloLectura
          onCerrar={() => setDepartamentoAbierto(null)}
        />
      )}
    </div>
  )
}
