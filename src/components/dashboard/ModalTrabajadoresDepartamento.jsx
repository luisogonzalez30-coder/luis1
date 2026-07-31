import { useEffect, useState } from 'react'
import { UserPlus, Trash2, MapPin } from 'lucide-react'
import Modal from '../common/Modal'
import Boton from '../common/Boton'
import EnlaceGoogleMaps from '../common/EnlaceGoogleMaps'
import {
  suscribirTrabajadores,
  crearTrabajador,
  marcarAsistencia,
  actualizarDisponibilidad,
  eliminarTrabajador,
} from '../../services/trabajadoresService'
import { suscribirUbicacionesCuadrilla } from '../../services/ubicacionesCuadrillaService'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

// Roster de trabajadores de un departamento: cuántos hay, quién asistió hoy
// (verde/rojo) y quién está disponible vs designado a algo — ver "Órdenes de
// Trabajo y Costeo" en ESTADO_PROYECTO.md. Se usa en dos modos:
// - soloLectura=true: el Alcalde la abre al hacer clic en una tarjeta de
//   MetricasPorDepartamento.jsx — puede ver cualquier departamento, no editar.
// - soloLectura=false: el Jefe de Departamento la abre desde su propio
//   Dashboard ("Mi equipo") — puede agregar/eliminar trabajadores y pasar lista.
// cuadrillasActivas (solo lo usa el modo lectura del Alcalde): nombres de
// cuadrillas con un ticket "En Proceso" en este departamento — se muestra su
// ubicación manual si el Jefe la marcó (ver PanelGestionDepartamento.jsx).
export default function ModalTrabajadoresDepartamento({ departamento, municipioId, cuadrillasActivas = [], soloLectura, onCerrar }) {
  const [trabajadores, setTrabajadores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [cargoNuevo, setCargoNuevo] = useState('')
  const [tarifaNueva, setTarifaNueva] = useState('')
  const [creando, setCreando] = useState(false)
  const [asignandoId, setAsignandoId] = useState(null)
  const [textoAsignado, setTextoAsignado] = useState('')
  const [ubicacionesCuadrilla, setUbicacionesCuadrilla] = useState([])

  useEffect(() => {
    const unsubscribe = suscribirTrabajadores(
      (lista) => {
        setTrabajadores(lista)
        setCargando(false)
      },
      municipioId,
      departamento
    )
    return unsubscribe
  }, [municipioId, departamento])

  useEffect(() => {
    if (!soloLectura || cuadrillasActivas.length === 0) return
    const unsubscribe = suscribirUbicacionesCuadrilla(setUbicacionesCuadrilla, municipioId)
    return unsubscribe
  }, [municipioId, soloLectura, cuadrillasActivas.length])

  const hoy = hoyISO()
  const presentes = trabajadores.filter((t) => t.fecha_asistencia === hoy && t.presente_hoy === true).length
  const ausentes = trabajadores.filter((t) => t.fecha_asistencia === hoy && t.presente_hoy === false).length

  async function manejarAgregar(e) {
    e.preventDefault()
    if (!nombreNuevo.trim() || !cargoNuevo.trim() || Number(tarifaNueva) <= 0) return
    setCreando(true)
    try {
      await crearTrabajador({
        nombre: nombreNuevo.trim(),
        cargo: cargoNuevo.trim(),
        tarifaHora: Number(tarifaNueva),
        departamento,
        municipioId,
      })
      setNombreNuevo('')
      setCargoNuevo('')
      setTarifaNueva('')
    } catch (err) {
      console.error('[ModalTrabajadoresDepartamento] Error al agregar trabajador:', err)
    } finally {
      setCreando(false)
    }
  }

  function iniciarAsignacion(trabajador) {
    setAsignandoId(trabajador.id)
    setTextoAsignado(trabajador.asignado_a || '')
  }

  async function guardarAsignacion(trabajadorId) {
    await actualizarDisponibilidad(trabajadorId, false, textoAsignado.trim())
    setAsignandoId(null)
  }

  return (
    <Modal titulo={`Equipo — ${departamento}`} onCerrar={onCerrar}>
      <div className="mb-4 flex gap-4 text-sm">
        <span className="text-gray-600">{trabajadores.length} trabajadores</span>
        <span className="text-green-700">{presentes} presentes</span>
        <span className="text-red-700">{ausentes} ausentes</span>
      </div>

      {soloLectura && cuadrillasActivas.length > 0 && (
        <div className="mb-4 rounded-xl border border-gray-200 p-3">
          <p className="mb-2 flex items-center gap-1 text-sm font-medium text-gray-700">
            <MapPin size={14} /> Cuadrillas en terreno
          </p>
          <ul className="space-y-1">
            {cuadrillasActivas.map((nombre) => {
              const ubicacion = ubicacionesCuadrilla.find((u) => u.cuadrilla === nombre)
              return (
                <li key={nombre} className="text-sm text-gray-600">
                  <span className="font-medium">{nombre}</span>
                  {ubicacion?.coordenadas ? (
                    <EnlaceGoogleMaps coordenadas={ubicacion.coordenadas} />
                  ) : (
                    <span className="ml-2 text-xs text-gray-400">Sin ubicación registrada todavía</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {cargando ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : trabajadores.length === 0 ? (
        <p className="text-sm text-gray-400">Todavía no hay trabajadores registrados en este departamento.</p>
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto">
          {trabajadores.map((t) => {
            const marcadoHoy = t.fecha_asistencia === hoy
            return (
              <li key={t.id} className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">{t.nombre}</p>
                    <p className="text-xs text-gray-500">
                      {t.cargo}{t.tarifa_hora ? ` · $${t.tarifa_hora.toLocaleString('es-CL')}/hora` : ''}
                    </p>
                  </div>
                  {!soloLectura && (
                    <button
                      onClick={() => eliminarTrabajador(t.id)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
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
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {!marcadoHoy ? 'Sin marcar hoy' : t.presente_hoy ? '● Presente' : '● Ausente'}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          t.disponible ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {t.disponible ? 'Disponible' : `Designado${t.asignado_a ? ` — ${t.asignado_a}` : ''}`}
                      </span>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => marcarAsistencia(t.id, true)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          marcadoHoy && t.presente_hoy ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-green-50'
                        }`}
                      >
                        Presente
                      </button>
                      <button
                        onClick={() => marcarAsistencia(t.id, false)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          marcadoHoy && t.presente_hoy === false ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-red-50'
                        }`}
                      >
                        Ausente
                      </button>

                      <span className="mx-0.5 text-gray-300">·</span>

                      <button
                        onClick={() => actualizarDisponibilidad(t.id, true)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          t.disponible ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-blue-50'
                        }`}
                      >
                        Disponible
                      </button>
                      <button
                        onClick={() => iniciarAsignacion(t)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          !t.disponible ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-amber-50'
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
