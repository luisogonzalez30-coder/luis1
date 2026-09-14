import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db, COLECCIONES } from '../firebase/firebase'

const trabajadoresRef = collection(db, COLECCIONES.PERSONAL)

// Lista simple de trabajadores por área (sin cuenta de acceso propia,
// mismo espíritu que "equipos" en condominios/{slug}). La administra el
// Jefe de Area; el Administrador solo la lee (ver ModalPersonalDeArea.jsx).
export function suscribirTrabajadores(callback, condominioId, area) {
  if (!condominioId || !area) {
    console.error('[trabajadoresService] suscribirTrabajadores requiere condominioId y area.')
    return () => {}
  }

  const q = query(
    trabajadoresRef,
    where('condominio_id', '==', condominioId),
    where('area', '==', area)
 )

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

// Todos los trabajadores de el condominio, sin acotar por área —
// usado por MetricasPorArea.jsx para mostrar headcount/asistencia por
// tarjeta sin abrir 7 suscripciones separadas (se agrupa en memoria).
export function suscribirTrabajadoresCondominio(callback, condominioId) {
  if (!condominioId) {
    console.error('[trabajadoresService] suscribirTrabajadoresCondominio requiere condominioId.')
    return () => {}
  }

  const q = query(trabajadoresRef, where('condominio_id', '==', condominioId))

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

export async function crearTrabajador({ nombre, cargo, tarifaHora, area, condominioId }) {
  await addDoc(trabajadoresRef, {
    nombre,
    cargo,
    tarifa_hora: tarifaHora, // CLP por hora — usado para calcular costo de mano de obra al asignarlo a una solicitud (ver ModalPresupuesto.jsx)
    area,
    condominio_id: condominioId,
    presente_hoy: null,   // null = todavía no se pasó lista hoy
    fecha_asistencia: '', // "YYYY-MM-DD" del último marcado — permite detectar que es de un día viejo sin necesitar un cron de reseteo
    disponible: true,
    asignado_a: '',
    fecha_creacion: serverTimestamp(),
  })
}

// presente=true/false marca la asistencia de HOY. fecha_asistencia guarda el
// día del marcado — si no coincide con la fecha actual al leerlo, la UI lo
// trata como "sin marcar" (ver ModalPersonalDeArea.jsx), evitando
// depender de un job que resetee el campo cada medianoche.
export async function marcarAsistencia(trabajadorId, presente) {
  await updateDoc(doc(db, COLECCIONES.PERSONAL, trabajadorId), {
    presente_hoy: presente,
    fecha_asistencia: new Date().toISOString().slice(0, 10),
  })
}

export async function actualizarDisponibilidad(trabajadorId, disponible, asignadoA = '') {
  await updateDoc(doc(db, COLECCIONES.PERSONAL, trabajadorId), {
    disponible,
    asignado_a: disponible ? '' : asignadoA,
  })
}

export async function eliminarTrabajador(trabajadorId) {
  await deleteDoc(doc(db, COLECCIONES.PERSONAL, trabajadorId))
}
