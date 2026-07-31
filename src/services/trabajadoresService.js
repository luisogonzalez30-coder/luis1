import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db, COLECCIONES } from '../firebase/firebase'

const trabajadoresRef = collection(db, COLECCIONES.TRABAJADORES)

// Lista simple de trabajadores por departamento (sin cuenta de acceso propia,
// mismo espíritu que "cuadrillas" en municipalidades/{slug}). La administra el
// Jefe de Departamento; el Alcalde solo la lee (ver ModalTrabajadoresDepartamento.jsx).
export function suscribirTrabajadores(callback, municipioId, departamento) {
  if (!municipioId || !departamento) {
    console.error('[trabajadoresService] suscribirTrabajadores requiere municipioId y departamento.')
    return () => {}
  }

  const q = query(
    trabajadoresRef,
    where('municipio_id', '==', municipioId),
    where('departamento', '==', departamento)
  )

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

// Todos los trabajadores de la municipalidad, sin acotar por departamento —
// usado por MetricasPorDepartamento.jsx para mostrar headcount/asistencia por
// tarjeta sin abrir 7 suscripciones separadas (se agrupa en memoria).
export function suscribirTrabajadoresMunicipio(callback, municipioId) {
  if (!municipioId) {
    console.error('[trabajadoresService] suscribirTrabajadoresMunicipio requiere municipioId.')
    return () => {}
  }

  const q = query(trabajadoresRef, where('municipio_id', '==', municipioId))

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

export async function crearTrabajador({ nombre, cargo, tarifaHora, departamento, municipioId }) {
  await addDoc(trabajadoresRef, {
    nombre,
    cargo,
    tarifa_hora: tarifaHora, // CLP por hora — usado para calcular costo de mano de obra al asignarlo a una incidencia (ver ModalPresupuesto.jsx)
    departamento,
    municipio_id: municipioId,
    presente_hoy: null,   // null = todavía no se pasó lista hoy
    fecha_asistencia: '', // "YYYY-MM-DD" del último marcado — permite detectar que es de un día viejo sin necesitar un cron de reseteo
    disponible: true,
    asignado_a: '',
    fecha_creacion: serverTimestamp(),
  })
}

// presente=true/false marca la asistencia de HOY. fecha_asistencia guarda el
// día del marcado — si no coincide con la fecha actual al leerlo, la UI lo
// trata como "sin marcar" (ver ModalTrabajadoresDepartamento.jsx), evitando
// depender de un job que resetee el campo cada medianoche.
export async function marcarAsistencia(trabajadorId, presente) {
  await updateDoc(doc(db, COLECCIONES.TRABAJADORES, trabajadorId), {
    presente_hoy: presente,
    fecha_asistencia: new Date().toISOString().slice(0, 10),
  })
}

export async function actualizarDisponibilidad(trabajadorId, disponible, asignadoA = '') {
  await updateDoc(doc(db, COLECCIONES.TRABAJADORES, trabajadorId), {
    disponible,
    asignado_a: disponible ? '' : asignadoA,
  })
}

export async function eliminarTrabajador(trabajadorId) {
  await deleteDoc(doc(db, COLECCIONES.TRABAJADORES, trabajadorId))
}
