import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/firebase'

// Seguimientos: comentarios/foto que el residente agrega a un reporte YA
// creado (ej. "el problema empeoró", "esto sigue igual"), sin login. Mismo
// mecanismo de acceso que la calificación (ver calificarSolicitud en
// solicitudesService.js): el residente nunca lee solicitudes/{id} directamente
// (sin permiso), pero sí conoce su id porque tickets_publicos.{numero}.solicitud_id
// es público — escribe a ciegas en la subcolección. firestore.rules exige que
// sea anónimo, que el autor declarado sea "residente", y limita el tamaño del texto.
export async function agregarSeguimiento(solicitudId, { texto, fotoUrl }) {
  await addDoc(collection(db, 'solicitudes', solicitudId, 'seguimientos'), {
    texto: texto || '',
    foto_url: fotoUrl || '',
    autor: 'residente',
    fecha: serverTimestamp(),
  })
}

// Lectura para el usuario (paneles de gestión) — orden cronológico. Solo
// usuarios del mismo condominio pueden leer (ver firestore.rules); el
// residente que escribió no puede releer lo que mandó (mismo criterio que un
// voto: se confía en la confirmación optimista del lado del cliente).
export function suscribirSeguimientos(solicitudId, callback) {
  if (!solicitudId) return () => {}

  const q = query(collection(db, 'solicitudes', solicitudId, 'seguimientos'), orderBy('fecha', 'asc'))
  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (error) => console.error('[seguimientosService] Error al escuchar seguimientos:', error)
 )
}
