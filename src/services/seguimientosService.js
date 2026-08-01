import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/firebase'

// Seguimientos: comentarios/foto que el ciudadano agrega a un reporte YA
// creado (ej. "el problema empeoró", "esto sigue igual"), sin login. Mismo
// mecanismo de acceso que la calificación (ver calificarIncidencia en
// incidenciasService.js): el ciudadano nunca lee incidencias/{id} directamente
// (sin permiso), pero sí conoce su id porque tickets_publicos.{numero}.incidencia_id
// es público — escribe a ciegas en la subcolección. firestore.rules exige que
// sea anónimo, que el autor declarado sea "ciudadano", y limita el tamaño del texto.
export async function agregarSeguimiento(incidenciaId, { texto, fotoUrl }) {
  await addDoc(collection(db, 'incidencias', incidenciaId, 'seguimientos'), {
    texto: texto || '',
    foto_url: fotoUrl || '',
    autor: 'ciudadano',
    fecha: serverTimestamp(),
  })
}

// Lectura para el funcionario (paneles de gestión) — orden cronológico. Solo
// funcionarios del mismo municipio pueden leer (ver firestore.rules); el
// ciudadano que escribió no puede releer lo que mandó (mismo criterio que un
// voto: se confía en la confirmación optimista del lado del cliente).
export function suscribirSeguimientos(incidenciaId, callback) {
  if (!incidenciaId) return () => {}

  const q = query(collection(db, 'incidencias', incidenciaId, 'seguimientos'), orderBy('fecha', 'asc'))
  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (error) => console.error('[seguimientosService] Error al escuchar seguimientos:', error)
  )
}
