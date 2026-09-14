import { useEffect, useState } from 'react'
import { HardHat, BellRing, Trash2, Shield, Scale, Truck, FileText, Users, AlertTriangle, Phone, Mail } from 'lucide-react'
import { AREAS } from '../../utils/areas'
import { suscribirTrabajadoresCondominio } from '../../services/trabajadoresService'
import { esDelMesActual, horasDesde } from '../../utils/tiempo'
import { enlaceWhatsapp } from '../../utils/equipo'
import ModalPersonalDeArea from './ModalPersonalDeArea'

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })

// Umbral de SLA: una solicitud de gravedad Alta que lleva más de este tiempo
// en "Pendiente" (sin equipo asignada) se marca como vencida. 4 horas es un
// punto de partida razonable para algo "de riesgo inminente a la seguridad"
// (ver SLA_HORAS en utils/gravedad.js) — ajustable acá si el condominio prefiere
// otro umbral. Dos horas, no cuatro: un ascensor detenido o una filtración
// activa no aguantan media jornada sin que nadie los mire.
const SLA_HORAS_ALTA_SIN_ASIGNAR = 2

const ICONO_POR_AREA = {
  'Administración': FileText,
  'Conserjería': BellRing,
  'Mantención y Obras': HardHat,
  'Aseo y Áreas Verdes': Trash2,
  'Seguridad': Shield,
  'Convivencia y Reglamento': Scale,
  'Proveedor Externo': Truck,
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

// Tarjetas de "tickets sin resolver por área" para que el Administrador
// fiscalice de un vistazo quién está atrasado. Cuenta sobre el array de
// solicitudes que YA suscribe PanelAdministracionPage (sin queries nuevas) —
// a propósito independiente de los filtros de mapa/lista de abajo: es una
// comparación entre TODOS las áreas, no debe cambiar si el Administrador
// está mirando uno solo en el mapa.
// Cada tarjeta es clicable: abre el roster de trabajadores de esa área
// (asistencia, disponibilidad, cargos) en modo solo lectura — ver
// ModalPersonalDeArea.jsx y "Órdenes de Trabajo y Costeo" en
// docs/ARQUITECTURA.md. Además muestra headcount/asistencia de un vistazo (sin
// abrir el modal), calculado sobre una única suscripción a todos los
// trabajadores del condominio (agrupados en memoria por área).
export default function MetricasPorArea({ solicitudes, condominioId, usuarios = [] }) {
  const [areaAbierto, setAreaAbierto] = useState(null)
  const [trabajadores, setTrabajadores] = useState([])

  useEffect(() => {
    if (!condominioId) return
    const unsubscribe = suscribirTrabajadoresCondominio(setTrabajadores, condominioId)
    return unsubscribe
  }, [condominioId])

  const hoy = hoyISO()

  const conteos = AREAS.map((dep) => {
    const delArea = solicitudes.filter((inc) => inc.area === dep)
    const pendientes = delArea.filter((inc) => inc.estado === 'Pendiente').length
    const enProceso = delArea.filter((inc) => inc.estado === 'En Proceso')
    const altaSinResolver = delArea.filter(
      (inc) => inc.estado !== 'Resuelto' && inc.nivel_gravedad === 'Alta'
   ).length
    const altaVencidaSla = delArea.filter(
      (inc) => inc.estado === 'Pendiente' && inc.nivel_gravedad === 'Alta' && horasDesde(inc.fecha_creacion) > SLA_HORAS_ALTA_SIN_ASIGNAR
   ).length

    const equipo = trabajadores.filter((t) => t.area === dep)
    const presentes = equipo.filter((t) => t.fecha_asistencia === hoy && t.presente_hoy === true).length

    // Equipos distintas actualmente con un ticket "En Proceso" en esta área.
    const nombresEquiposActivas = [...new Set(enProceso.map((inc) => inc.equipo_asignado).filter(Boolean))]

    // Gasto ejecutado del mes actual, acotado a esta área (mismo criterio
    // que ResumenGastoMensual.jsx, que hace lo mismo a nivel del condominio completo).
    const gastoMes = delArea
      .filter((inc) => inc.estado === 'Resuelto' && esDelMesActual(inc.fecha_cierre))
      .reduce((total, inc) => total + (inc.gasto_real?.costo_final || 0), 0)

    return {
      area: dep,
      pendientes,
      asignadas: enProceso.length,
      altaSinResolver,
      altaVencidaSla,
      sinResolver: pendientes + enProceso.length,
      totalTrabajadores: equipo.length,
      presentes,
      equiposEnTerreno: nombresEquiposActivas.length,
      nombresEquiposActivas,
      gastoMes,
    }
  }).sort((a, b) => b.sinResolver - a.sinResolver)

  const equiposActivasDelAbierto = conteos.find((c) => c.area === areaAbierto)?.nombresEquiposActivas || []
  const totalVencidasSla = conteos.reduce((total, c) => total + c.altaVencidaSla, 0)

  return (
    <div className="px-4 pb-5 sm:px-6">
      <h2 className="mb-3 text-sm font-semibold text-tinta-fuerte">Tickets sin resolver por área</h2>

      {totalVencidasSla > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-estado-critico/[0.07] px-3.5 py-2.5 text-sm text-estado-critico ring-1 ring-estado-critico/20">
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            <strong>{totalVencidasSla}</strong> {totalVencidasSla === 1 ? 'solicitud de gravedad Alta lleva' : 'solicitudes de gravedad Alta llevan'} más
            de {SLA_HORAS_ALTA_SIN_ASIGNAR}h sin asignar equipo.
          </span>
        </div>
     )}

      {/* -mx/px: la fila se desplaza de borde a borde en móvil sin que las
          tarjetas queden pegadas al filo de la pantalla. */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {conteos.map(({ area, pendientes, asignadas, altaSinResolver, altaVencidaSla, sinResolver, totalTrabajadores, presentes, equiposEnTerreno, gastoMes }) => {
          const Icono = ICONO_POR_AREA[area] || Users
          const jefe = usuarios.find(
            (f) => f.rol === 'COMITE' && f.area === area
         )
          const whatsapp = enlaceWhatsapp(jefe?.telefono)
          const urgente = altaVencidaSla > 0

          // La tarjeta NO puede ser un <button>: adentro van enlaces de contacto
          // y un <a> dentro de un <button> es HTML inválido (y el clic queda
          // ambiguo). El área grande es el botón; el contacto vive fuera de él.
          return (
            <div
              key={area}
              className={`w-[230px] shrink-0 snap-start overflow-hidden rounded-2xl bg-white ring-1 transition-shadow duration-200 hover:shadow-tarjeta
                ${urgente ? 'ring-estado-critico/30' : 'ring-borde'}`}
            >
              <button
                onClick={() => setAreaAbierto(area)}
                className="w-full p-4 text-left transition-colors hover:bg-primary/[0.03]"
              >
                <div className="flex items-center gap-1.5 text-xs font-medium text-tinta-suave">
                  <Icono size={14} className="shrink-0 text-primary" />
                  <span className="truncate">{area}</span>
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
                  {equiposEnTerreno > 0 && (
                    <span className="font-medium text-primary">{equiposEnTerreno} en terreno</span>
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

      {areaAbierto && (
        <ModalPersonalDeArea
          area={areaAbierto}
          condominioId={condominioId}
          equiposActivas={equiposActivasDelAbierto}
          solicitudes={solicitudes}
          usuarios={usuarios}
          soloLectura
          onCerrar={() => setAreaAbierto(null)}
        />
     )}
    </div>
 )
}
