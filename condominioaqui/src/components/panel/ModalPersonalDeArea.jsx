import { useEffect, useState } from 'react'
import { UserPlus, Trash2, MapPin, ChevronDown, Mail, Phone, Navigation } from 'lucide-react'
import Modal from '../common/Modal'
import Boton from '../common/Boton'
import FichaTrabajador from './FichaTrabajador'
import {
  suscribirTrabajadores,
  crearTrabajador,
  marcarAsistencia,
  actualizarDisponibilidad,
  eliminarTrabajador,
} from '../../services/trabajadoresService'
import { trabajosEnCursoDe, enlaceWhatsapp } from '../../utils/equipo'
import { useAccionUnica } from '../../hooks/useAccionUnica'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

// Contacto directo del área: el Jefe con cuenta creada. Va arriba del
// todo porque el motivo más común para abrir este modal es "necesito hablar con
// alguien de aquí ahora" — antes había que salir a buscar el correo a otra
// pantalla.
function ContactoArea({ jefe }) {
  if (!jefe) {
    return (
      <p className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-500">
        Este area no tiene un jefe con cuenta creada. Se crea desde{' '}
        <span className="font-medium">Usuarios</span>.
      </p>
   )
  }

  const whatsapp = enlaceWhatsapp(jefe.telefono)

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
      <div className="mr-auto">
        <p className="text-[11px] text-gray-500">Jefe de area</p>
        <p className="text-sm font-medium leading-tight text-gray-900">{jefe.nombre}</p>
      </div>
      {jefe.correo && (
        <a
          href={`mailto:${jefe.correo}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-black/5 transition-colors hover:bg-gray-100"
        >
          <Mail size={13} /> Correo
        </a>
     )}
      {whatsapp ? (
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-black/5 transition-colors hover:bg-gray-100"
        >
          <Phone size={13} /> WhatsApp
        </a>
     ) : (
        <span className="text-[11px] text-gray-400">Sin teléfono cargado</span>
     )}
    </div>
 )
}

// Roster de trabajadores de un área: cuántos hay, quién asistió hoy
// (verde/rojo) y quién está disponible vs designado — ver "Órdenes de Trabajo y
// Costeo". Se usa en dos modos:
// - soloLectura=true: el Administrador la abre al hacer clic en una tarjeta de
//   MetricasPorArea.jsx — puede ver cualquier area, no editar.
// - soloLectura=false: el Jefe de Area la abre desde su propio
//   Dashboard ("Mi equipo") — puede agregar/eliminar trabajadores y pasar lista.
//
// `usuarios` solo llega desde el lado del Administrador: firestore.rules permite
// leer usuarios_condominio al propio usuario y al ADMINISTRADOR, no a un
// COMITE. Cuando no llega, la ficha degrada sola y muestra únicamente
// la jefatura de equipo que sale del roster.
export default function ModalPersonalDeArea({
  area,
  condominioId,
  equiposActivas = [],
  solicitudes = [],
  usuarios = [],
  soloLectura,
  onCerrar,
}) {
  const [trabajadores, setTrabajadores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [cargoNuevo, setCargoNuevo] = useState('')
  const [tarifaNueva, setTarifaNueva] = useState('')
  const [asignandoId, setAsignandoId] = useState(null)
  const [textoAsignado, setTextoAsignado] = useState('')
  const [fichaAbiertaId, setFichaAbiertaId] = useState(null)

  useEffect(() => {
    const unsubscribe = suscribirTrabajadores(
      (lista) => {
        setTrabajadores(lista)
        setCargando(false)
      },
      condominioId,
      area
   )
    return unsubscribe
  }, [condominioId, area])

  const hoy = hoyISO()
  const presentes = trabajadores.filter((t) => t.fecha_asistencia === hoy && t.presente_hoy === true).length
  const ausentes = trabajadores.filter((t) => t.fecha_asistencia === hoy && t.presente_hoy === false).length

  const jefeArea = usuarios.find(
    (f) => f.rol === 'COMITE' && f.area === area
 ) || null

  // useAccionUnica en vez de un booleano: el <form> dispara onSubmit antes de
  // que React repinte el botón deshabilitado, así que un doble Enter alcanzaba
  // a crear el trabajador dos veces.
  const [manejarAgregar, creando] = useAccionUnica(async (e) => {
    e.preventDefault()
    if (!nombreNuevo.trim() || !cargoNuevo.trim() || Number(tarifaNueva) <= 0) return
    try {
      await crearTrabajador({
        nombre: nombreNuevo.trim(),
        cargo: cargoNuevo.trim(),
        tarifaHora: Number(tarifaNueva),
        area,
        condominioId,
      })
      setNombreNuevo('')
      setCargoNuevo('')
      setTarifaNueva('')
    } catch (err) {
      console.error('[ModalPersonalDeArea] Error al agregar trabajador:', err)
    }
  })

  function iniciarAsignacion(trabajador) {
    setAsignandoId(trabajador.id)
    setTextoAsignado(trabajador.asignado_a || '')
  }

  async function guardarAsignacion(trabajadorId) {
    await actualizarDisponibilidad(trabajadorId, false, textoAsignado.trim())
    setAsignandoId(null)
  }

  function alternarFicha(trabajadorId) {
    setFichaAbiertaId((actual) => (actual === trabajadorId ? null : trabajadorId))
  }

  return (
    <Modal
      titulo={`Equipo — ${area}`}
      subtitulo={`${trabajadores.length} trabajadores · ${presentes} presentes · ${ausentes} ausentes`}
      ancho="lg"
      onCerrar={onCerrar}
    >
      {soloLectura && (
        <div className="mb-3">
          <ContactoArea jefe={jefeArea} />
        </div>
     )}

      {soloLectura && equiposActivas.length > 0 && (
        <div className="mb-3 rounded-xl border border-black/5 px-3 py-2.5">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">
            <MapPin size={12} /> Equipos trabajando ahora
          </p>
          <ul className="space-y-1">
            {equiposActivas.map((nombre) => {
              return (
                <li key={nombre} className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900">{nombre}</span>
                </li>
             )
            })}
          </ul>
        </div>
     )}

      {cargando ? (
        <p className="text-sm text-gray-400">Cargando...</p>
     ) : trabajadores.length === 0 ? (
        <p className="text-sm text-gray-400">Todavía no hay trabajadores registrados en esta área.</p>
     ) : (
        <ul className="space-y-2">
          {trabajadores.map((t) => {
            const marcadoHoy = t.fecha_asistencia === hoy
            const fichaAbierta = fichaAbiertaId === t.id
            const enCurso = trabajosEnCursoDe(t.id, solicitudes)

            return (
              <li
                key={t.id}
                className={`rounded-xl border px-3 py-2.5 transition-colors ${
                  fichaAbierta ? 'border-primary/30 bg-primary/[0.02]' : 'border-black/5'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  {/* El nombre es el disparador de la ficha: es lo que la gente
                      intenta tocar primero cuando quiere saber de alguien. */}
                  <button
                    type="button"
                    onClick={() => alternarFicha(t.id)}
                    aria-expanded={fichaAbierta}
                    className="group -my-1 -ml-1 flex flex-1 items-start gap-1.5 rounded-lg px-1 py-1 text-left transition-colors hover:bg-black/[0.03]"
                  >
                    <ChevronDown
                      size={14}
                      className={`mt-1 shrink-0 text-gray-400 transition-transform duration-200 ${fichaAbierta ? 'rotate-180' : ''}`}
                    />
                    <span>
                      <span className="block font-medium text-gray-900 group-hover:text-primary">{t.nombre}</span>
                      <span className="block text-xs text-gray-500">
                        {t.cargo}{t.tarifa_hora ? ` · $${t.tarifa_hora.toLocaleString('es-CL')}/hora` : ''}
                      </span>
                    </span>
                  </button>

                  {!soloLectura && (
                    <button
                      onClick={() => eliminarTrabajador(t.id)}
                      className="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      title="Quitar del equipo"
                    >
                      <Trash2 size={16} />
                    </button>
                 )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {soloLectura ? (
                    <>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          !marcadoHoy
                            ? 'bg-gray-100 text-gray-500'
                            : t.presente_hoy
                              ? 'bg-[#0ca30c]/10 text-[#0a7d0a]'
                              : 'bg-[#d03b3b]/10 text-[#b32f2f]'
                        }`}
                      >
                        {!marcadoHoy ? 'Sin marcar hoy' : t.presente_hoy ? '● Presente' : '● Ausente'}
                      </span>

                      {t.disponible ? (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          Disponible
                        </span>
                     ) : (
                        // "Designado" es clicable: abre la ficha, que es donde
                        // está la dirección exacta y el "cómo llegar". Cuando hay
                        // un reporte real detrás se dice, para que no parezca que
                        // el clic no hizo nada cuando no lo hay.
                        <button
                          type="button"
                          onClick={() => alternarFicha(t.id)}
                          className="inline-flex items-center gap-1 rounded-full bg-[#ec835a]/10 px-2 py-0.5 text-xs font-medium text-[#b4501f] transition-colors hover:bg-[#ec835a]/20"
                        >
                          <Navigation size={11} />
                          Designado{t.asignado_a ? ` — ${t.asignado_a}` : ''}
                          {enCurso.length > 0 && (
                            <span className="font-normal opacity-70">· ver dónde</span>
                         )}
                        </button>
                     )}
                    </>
                 ) : (
                    <>
                      <button
                        onClick={() => marcarAsistencia(t.id, true)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          marcadoHoy && t.presente_hoy ? 'bg-[#0ca30c] text-white' : 'bg-gray-100 text-gray-600 hover:bg-[#0ca30c]/10'
                        }`}
                      >
                        Presente
                      </button>
                      <button
                        onClick={() => marcarAsistencia(t.id, false)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          marcadoHoy && t.presente_hoy === false ? 'bg-[#d03b3b] text-white' : 'bg-gray-100 text-gray-600 hover:bg-[#d03b3b]/10'
                        }`}
                      >
                        Ausente
                      </button>

                      <span className="mx-0.5 text-gray-300">·</span>

                      <button
                        onClick={() => actualizarDisponibilidad(t.id, true)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          t.disponible ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-primary/10'
                        }`}
                      >
                        Disponible
                      </button>
                      <button
                        onClick={() => iniciarAsignacion(t)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          !t.disponible ? 'bg-[#c2410c] text-white' : 'bg-gray-100 text-gray-600 hover:bg-[#ec835a]/15'
                        }`}
                      >
                        Designado{!t.disponible && t.asignado_a ? ` — ${t.asignado_a}` : ''}
                      </button>
                    </>
                 )}
                </div>

                {asignandoId === t.id && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={textoAsignado}
                      onChange={(e) => setTextoAsignado(e.target.value)}
                      placeholder="¿A qué está designado? (opcional)"
                      className="flex-1 rounded-lg border border-gray-300 p-1.5 text-xs"
                      onKeyDown={(e) => e.key === 'Enter' && guardarAsignacion(t.id)}
                    />
                    <button
                      onClick={() => guardarAsignacion(t.id)}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white"
                    >
                      Guardar
                    </button>
                  </div>
               )}

                {fichaAbierta && (
                  <FichaTrabajador
                    trabajador={t}
                    area={area}
                    solicitudes={solicitudes}
                    companeros={trabajadores}
                    usuarios={usuarios}
                    trabajosEnCurso={enCurso}
                  />
               )}
              </li>
           )
          })}
        </ul>
     )}

      {!soloLectura && (
        <form onSubmit={manejarAgregar} className="mt-4 flex flex-col gap-2 border-t border-gray-200 pt-4">
          <p className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700">
            <UserPlus size={16} /> Agregar trabajador
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nombre"
              value={nombreNuevo}
              onChange={(e) => setNombreNuevo(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 p-2 text-sm"
            />
            <input
              type="text"
              placeholder="Cargo"
              value={cargoNuevo}
              onChange={(e) => setCargoNuevo(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 p-2 text-sm"
            />
          </div>
          <input
            type="number"
            min="1"
            placeholder="Tarifa por hora (CLP)"
            value={tarifaNueva}
            onChange={(e) => setTarifaNueva(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-2 text-sm"
          />
          <Boton
            type="submit"
            cargando={creando}
            disabled={!nombreNuevo.trim() || !cargoNuevo.trim() || Number(tarifaNueva) <= 0}
          >
            Agregar
          </Boton>
        </form>
     )}
    </Modal>
 )
}
