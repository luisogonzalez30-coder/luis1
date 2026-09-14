import { useEffect, useMemo, useState } from 'react'
import {
  Siren, Clock, Inbox, Wrench, CheckCircle2, Users, Truck, Star, ChevronRight,
} from 'lucide-react'
import { suscribirTrabajadoresCondominio } from '../../services/trabajadoresService'
import { esDelMesActual, formatearDuracion, formatearFecha, horasDesde, promedioHoras } from '../../utils/tiempo'
import Modal from '../common/Modal'
import ModalDetalleIndicador from './ModalDetalleIndicador'
import { MAX_SOLICITUDES_PANEL } from '../../services/solicitudesService'

// Mismo formato que ResumenGastoMensual y ModalDetalleGasto: el Administrador ve la
// misma cifra escrita igual en los tres lugares.
const formatoCLP = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})
const formatearPesos = (n) => formatoCLP.format(n)

// Umbral de atraso para un ticket sin asignar equipo. El mismo criterio que
// MetricasPorArea usa para las alertas rojas por área.
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

// Tarjeta de acción: las tres cosas que le pueden exigir algo al Administrador hoy.
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
// Todos los datos secundarios son clicables si hay algo que mostrar detrás. El
// usuario lo pidió el 12-ago-2026 con una frase que vale como criterio de
// diseño: "no puede tener información estática, si pincho ahí me tiene que dar
// la información de valor de ese recuadro". Un número sin el detalle detrás
// obliga a ir a buscarlo a mano al listado, que es justo lo que el panel debía
// evitar.
function DatoSecundario({ icono: Icono, etiqueta, valor, apoyo, onAbrir, hayDetalle = true }) {
  const clickeable = Boolean(onAbrir) && hayDetalle
  const Elemento = clickeable ? 'button' : 'div'

  return (
    <Elemento
      type={clickeable ? 'button' : undefined}
      onClick={clickeable ? onAbrir : undefined}
      className={`flex w-full items-start gap-2.5 rounded-xl px-1 py-2 text-left transition-colors
        ${clickeable ? 'cursor-pointer hover:bg-primary/[0.05]' : ''}`}
    >
      <Icono size={15} className={`mt-0.5 shrink-0 ${clickeable ? 'text-primary' : 'text-tinta-tenue'}`} />
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-none text-tinta-fuerte">{valor}</p>
        <p className="mt-1 text-xs leading-snug text-tinta-suave">
          {etiqueta}
          {apoyo && <span className="block text-tinta-tenue">{apoyo}</span>}
        </p>
      </div>
    </Elemento>
 )
}

// Lista de trabajadores del día. Va aparte de ModalDetalleIndicador porque acá
// no hay solicitudes que listar: son personas, y lo que importa de cada una es
// si está o no, más el área para saber a quién preguntarle.
function ModalAsistencia({ trabajadores, hoy, onCerrar }) {
  const estadoDe = (t) => {
    if (t.fecha_asistencia !== hoy) return { texto: 'sin pasar lista', color: 'text-tinta-tenue' }
    return t.presente_hoy
      ? { texto: 'presente', color: 'text-estado-bueno' }
      : { texto: 'ausente', color: 'text-estado-critico' }
  }

  // Los que faltan por marcar primero: son la acción pendiente del jefe.
  const orden = { 'sin pasar lista': 0, ausente: 1, presente: 2 }
  const ordenados = [...trabajadores].sort(
    (a, b) => orden[estadoDe(a).texto] - orden[estadoDe(b).texto] || a.nombre.localeCompare(b.nombre)
 )

  return (
    <Modal titulo="Asistencia de hoy" subtitulo={`${trabajadores.length} trabajadores en el roster`} ancho="md" onCerrar={onCerrar}>
      <ul className="space-y-1.5">
        {ordenados.map((t) => {
          const estado = estadoDe(t)
          return (
            <li key={t.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 ring-borde">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-tinta-fuerte">{t.nombre}</span>
                <span className="block truncate text-xs text-tinta-suave">
                  {t.cargo || 'Sin cargo'} · {t.area}
                </span>
              </span>
              <span className={`shrink-0 text-xs font-medium ${estado.color}`}>{estado.texto}</span>
            </li>
         )
        })}
      </ul>
      <p className="mt-3 text-center text-xs text-tinta-tenue">
        La lista la pasa cada Jefe de Area desde su panel.
      </p>
    </Modal>
 )
}

// Panel de control del Administrador: el estado del condominio de un vistazo, sin
// tener que interpretar el mapa. Todo se calcula sobre el array de solicitudes
// que la página ya tiene suscrito (sin consultas nuevas) más una suscripción
// al roster de trabajadores, igual que MetricasPorArea.
//
// Jerarquía deliberada (antes eran 9 tarjetas del mismo tamaño y no se leía
// ninguna): una cifra protagonista, tres tarjetas de acción clicables, y el
// resto como línea secundaria. La regla de la skill dataviz es "exactamente una
// cifra protagonista por vista".
export default function PanelIndicadores({ solicitudes, condominioId, onSeleccionarSolicitud }) {
  // El panel recibe una ventana acotada, no el histórico completo (ver
  // MAX_SOLICITUDES_PANEL en solicitudesService.js). Cuando está llena, decir
  // "históricos" a secas sería falso.
  const ventanaLlena = solicitudes.length >= MAX_SOLICITUDES_PANEL
  const [trabajadores, setTrabajadores] = useState([])
  const [detalle, setDetalle] = useState(null)

  useEffect(() => {
    if (!condominioId) return
    return suscribirTrabajadoresCondominio(setTrabajadores, condominioId)
  }, [condominioId])

  const hoy = hoyISO()

  const datos = useMemo(() => {
    const pendientes = solicitudes.filter((i) => i.estado === 'Pendiente')
    const enProceso = solicitudes.filter((i) => i.estado === 'En Proceso')
    const resueltas = solicitudes.filter((i) => i.estado === 'Resuelto')

    // Emergencias: gravedad Alta todavía sin resolver, sin importar si ya se asignó.
    const emergencias = solicitudes.filter((i) => i.estado !== 'Resuelto' && i.nivel_gravedad === 'Alta')

    // Atrasados: pendientes que superaron el SLA sin que nadie les asigne equipo.
    const atrasados = pendientes.filter((i) => horasDesde(i.fecha_creacion) > SLA_HORAS_SIN_ASIGNAR)

    const resueltasMes = resueltas.filter((i) => esDelMesActual(i.fecha_cierre))

    // promedioHoras descarta fechas incoherentes para que no salga un promedio
    // negativo (ver utils/tiempo.js).
    const promedioResolucion = promedioHoras(resueltasMes, (i) => i.fecha_creacion, (i) => i.fecha_cierre)

    const calificadas = resueltas.filter((i) => typeof i.calificacion_residente === 'number')
    const promedioCalificacion = calificadas.length
      ? calificadas.reduce((acc, i) => acc + i.calificacion_residente, 0) / calificadas.length
      : null

    return {
      pendientes, enProceso, resueltas, emergencias, atrasados, resueltasMes,
      promedioResolucion, calificadas, promedioCalificacion,
      sinResolver: pendientes.length + enProceso.length,
      equiposEnTerreno: new Set(enProceso.map((i) => i.equipo_asignado).filter(Boolean)).size,
    }
  }, [solicitudes])

  // Asistencia de hoy. "Sin marcar" se cuenta aparte de "ausente": no es lo
  // mismo que el jefe no haya pasado lista a que la persona haya faltado
  // (mismo criterio que ModalPersonalDeArea).
  const marcadosHoy = trabajadores.filter((t) => t.fecha_asistencia === hoy)
  const presentes = marcadosHoy.filter((t) => t.presente_hoy === true).length
  const sinMarcar = trabajadores.length - marcadosHoy.length

  const totalHistorico = solicitudes.length
  const porcentajeResuelto = totalHistorico > 0
    ? Math.round((datos.resueltas.length / totalHistorico) * 100)
    : 0

  return (
    <section className="px-4 py-5 sm:px-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)] lg:items-start">
        {/* La cifra protagonista: cuánto trabajo tiene el condominio encima.
            Deliberadamente NO repite los números de las tarjetas de al lado
            (emergencias, por asignar) — cuando el mismo dato aparece dos veces,
            deja de leerse. Lo que aporta acá es la proporción resuelta, que no
            está en ninguna otra parte del panel. */}
        <button
          type="button"
          onClick={() => datos.sinResolver > 0 && setDetalle('sinResolver')}
          className={`rounded-2xl bg-white p-5 text-left ring-1 ring-borde transition-colors
            ${datos.sinResolver > 0 ? 'cursor-pointer hover:ring-primary/30' : 'cursor-default'}`}
        >
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
        </button>

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
            // MetricasPorArea cuenta solo las de gravedad Alta, así que
            // da un número menor — se aclara en ambos textos para que no parezca
            // que uno de los dos está mal.
            apoyo={`De cualquier gravedad, más de ${SLA_HORAS_SIN_ASIGNAR}h sin equipo`}
            tono={datos.atrasados.length > 0 ? 'serio' : 'bueno'}
            onAbrir={() => setDetalle('atrasados')}
          />
          <TarjetaAccion
            icono={Inbox}
            etiqueta="Por asignar"
            valor={datos.pendientes.length}
            apoyo="Reportes esperando que se les asigne equipo"
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
          apoyo="Ya tienen equipo"
          hayDetalle={datos.enProceso.length > 0}
          onAbrir={() => setDetalle('enProceso')}
        />
        <DatoSecundario
          icono={CheckCircle2}
          valor={datos.resueltasMes.length}
          etiqueta="Resueltos este mes"
          apoyo={`${datos.resueltas.length} ${ventanaLlena ? 'en la ventana cargada' : 'históricos'}`}
          hayDetalle={datos.resueltas.length > 0}
          onAbrir={() => setDetalle('resueltos')}
        />
        <DatoSecundario
          icono={Users}
          valor={trabajadores.length ? `${presentes}/${trabajadores.length}` : '—'}
          etiqueta="Trabajadores presentes"
          apoyo={trabajadores.length ? `${sinMarcar} sin pasar lista` : 'Sin personal cargado'}
          hayDetalle={trabajadores.length > 0}
          onAbrir={() => setDetalle('asistencia')}
        />
        <DatoSecundario
          icono={Truck}
          valor={datos.equiposEnTerreno}
          etiqueta="Equipos en terreno"
          apoyo="Con trabajo en ejecución"
          hayDetalle={datos.equiposEnTerreno > 0}
          onAbrir={() => setDetalle('equipos')}
        />
        <DatoSecundario
          icono={Clock}
          valor={formatearHoras(datos.promedioResolucion)}
          etiqueta="Tiempo promedio"
          apoyo="Ingreso hasta cierre, este mes"
          hayDetalle={datos.resueltasMes.length > 0}
          onAbrir={() => setDetalle('demoras')}
        />
        <DatoSecundario
          icono={Star}
          valor={datos.promedioCalificacion ? `${datos.promedioCalificacion.toFixed(1)}/5` : '—'}
          etiqueta="Satisfacción vecinal"
          apoyo={datos.calificadas.length ? `${datos.calificadas.length} calificaciones` : 'Sin calificaciones'}
          hayDetalle={datos.calificadas.length > 0}
          onAbrir={() => setDetalle('calificaciones')}
        />
      </div>

      {detalle === 'emergencias' && (
        <ModalDetalleIndicador
          titulo="Emergencias activas"
          descripcion="gravedad Alta sin resolver"
          solicitudes={datos.emergencias}
          onSeleccionar={onSeleccionarSolicitud}
          onCerrar={() => setDetalle(null)}
        />
     )}
      {detalle === 'atrasados' && (
        <ModalDetalleIndicador
          titulo="Trabajos atrasados"
          descripcion={`más de ${SLA_HORAS_SIN_ASIGNAR}h sin equipo`}
          solicitudes={datos.atrasados}
          onSeleccionar={onSeleccionarSolicitud}
          onCerrar={() => setDetalle(null)}
        />
     )}
      {detalle === 'pendientes' && (
        <ModalDetalleIndicador
          titulo="Por asignar"
          descripcion="esperando equipo"
          solicitudes={datos.pendientes}
          onSeleccionar={onSeleccionarSolicitud}
          onCerrar={() => setDetalle(null)}
        />
     )}

      {detalle === 'sinResolver' && (
        <ModalDetalleIndicador
          titulo="Reportes sin resolver"
          descripcion="pendientes y en ejecución"
          solicitudes={[...datos.pendientes, ...datos.enProceso]}
          lineaApoyo={(i) =>
            `${i.estado} · ${i.equipo_asignado || 'sin equipo'} · ${i.direccion_texto || 'sin dirección'}`
          }
          onSeleccionar={onSeleccionarSolicitud}
          onCerrar={() => setDetalle(null)}
        />
     )}

      {detalle === 'enProceso' && (
        <ModalDetalleIndicador
          titulo="En ejecución"
          descripcion="con equipo asignada"
          solicitudes={datos.enProceso}
          agruparPor={(i) => i.equipo_asignado}
          // Acá lo que importa no es la gravedad sino cuánto lleva el equipo
          // con el trabajo encima: es la pregunta de "¿por qué no está listo?".
          lineaApoyo={(i) => `${i.equipo_asignado || 'sin equipo'} · ${i.direccion_texto || 'sin dirección'}`}
          datoDerecha={(i) => `${formatearHoras(horasDesde(i.fecha_asignacion)) || '—'} en obra`}
          onSeleccionar={onSeleccionarSolicitud}
          onCerrar={() => setDetalle(null)}
        />
     )}

      {/* Lo que el usuario pidió explícitamente: poder pinchar en los reportes
          cerrados y ver la información completa de lo que se resolvió. Cada línea
          trae quién lo hizo, cuándo se cerró, cuánto demoró y cuánto costó. */}
      {detalle === 'resueltos' && (
        <ModalDetalleIndicador
          titulo="Reportes resueltos"
          descripcion={`${datos.resueltasMes.length} este mes · ${datos.resueltas.length} en total`}
          solicitudes={datos.resueltas}
          orden="cierre"
          agruparPor={(i) => i.equipo_asignado}
          lineaApoyo={(i) =>
            [
              i.equipo_asignado || 'sin equipo',
              formatearFecha(i.fecha_cierre),
              i.gasto_real?.costo_final ? formatearPesos(i.gasto_real.costo_final) : null,
              typeof i.calificacion_residente === 'number' ? `${i.calificacion_residente}★` : null,
            ]
              .filter(Boolean)
              .join(' · ')
          }
          datoDerecha={(i) => `${formatearDuracion(i.fecha_creacion, i.fecha_cierre) || '—'}`}
          mensajeVacio="Todavía no hay reportes resueltos."
          onSeleccionar={onSeleccionarSolicitud}
          onCerrar={() => setDetalle(null)}
        />
     )}

      {detalle === 'equipos' && (
        <ModalDetalleIndicador
          titulo="Equipos en terreno"
          descripcion={`${datos.equiposEnTerreno} con trabajo en ejecución`}
          solicitudes={datos.enProceso}
          agruparPor={(i) => i.equipo_asignado}
          lineaApoyo={(i) => `${i.equipo_asignado || 'sin equipo'} · ${i.direccion_texto || 'sin dirección'}`}
          datoDerecha={(i) => `${formatearHoras(horasDesde(i.fecha_asignacion)) || '—'} en obra`}
          onSeleccionar={onSeleccionarSolicitud}
          onCerrar={() => setDetalle(null)}
        />
     )}

      {/* El promedio solo sirve si se puede ver qué lo empuja: los que más
          demoraron van arriba. */}
      {detalle === 'demoras' && (
        <ModalDetalleIndicador
          titulo="Tiempo de resolución"
          descripcion={`promedio ${formatearHoras(datos.promedioResolucion)}, del ingreso al cierre`}
          solicitudes={datos.resueltasMes}
          orden="demora"
          lineaApoyo={(i) =>
            `${i.equipo_asignado || 'sin equipo'} · cerrado ${formatearFecha(i.fecha_cierre)}`
          }
          datoDerecha={(i) => formatearDuracion(i.fecha_creacion, i.fecha_cierre) || '—'}
          mensajeVacio="Este mes todavía no se cierra ningún reporte."
          onSeleccionar={onSeleccionarSolicitud}
          onCerrar={() => setDetalle(null)}
        />
     )}

      {/* Peor calificado arriba: es donde hay algo que corregir, no donde hay
          algo que celebrar. */}
      {detalle === 'calificaciones' && (
        <ModalDetalleIndicador
          titulo="Satisfacción vecinal"
          descripcion={`${datos.calificadas.length} calificaciones, promedio ${datos.promedioCalificacion?.toFixed(1)}/5`}
          solicitudes={datos.calificadas}
          orden="peorCalificacion"
          agruparPor={(i) => i.equipo_asignado}
          lineaApoyo={(i) =>
            `${i.equipo_asignado || 'sin equipo'} · cerrado ${formatearFecha(i.fecha_cierre)}`
          }
          datoDerecha={(i) => '★'.repeat(i.calificacion_residente) + '☆'.repeat(5 - i.calificacion_residente)}
          mensajeVacio="Ningún residente ha calificado todavía."
          onSeleccionar={onSeleccionarSolicitud}
          onCerrar={() => setDetalle(null)}
        />
     )}

      {detalle === 'asistencia' && (
        <ModalAsistencia trabajadores={trabajadores} hoy={hoy} onCerrar={() => setDetalle(null)} />
     )}
    </section>
 )
}
