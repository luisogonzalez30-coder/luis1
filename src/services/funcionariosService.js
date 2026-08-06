import { createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { authSecundario, db, COLECCIONES } from '../firebase/firebase'

// Crea la cuenta de Auth (en la app secundaria, ver firebase.js) y su perfil en
// usuarios_municipales. Si el setDoc falla después de crear la cuenta de Auth,
// queda un usuario de Auth "huérfano" sin perfil — AuthContext ya maneja ese
// caso (le niega acceso con un mensaje claro); el Alcalde puede reintentar
// creando el perfil a mano en la consola, o borrar esa cuenta desde
// Authentication > Users si prefiere empezar de nuevo.
export async function crearFuncionario({ nombre, correo, contrasena, rol, departamento, telefono, municipioId }) {
  const credencial = await createUserWithEmailAndPassword(authSecundario, correo, contrasena)
  const uid = credencial.user.uid

  try {
    await setDoc(doc(db, COLECCIONES.USUARIOS_MUNICIPALES, uid), {
      nombre,
      correo,
      rol,
      departamento: rol === 'JEFE_DEPARTAMENTO' ? departamento : 'todos',
      // Opcional. Alimenta el botón de WhatsApp del contacto directo en las
      // tarjetas de departamento del panel del Alcalde. Es un teléfono de
      // trabajo, no un dato del vecino: no pasa por las reglas de datos
      // personales de la política de privacidad, que cubre a los ciudadanos.
      telefono: telefono?.trim() || '',
      municipio_id: municipioId,
      fecha_creacion: serverTimestamp(),
    })
  } finally {
    // Cierra la sesión en la app secundaria — no afecta la sesión del Alcalde
    // en la app principal (son instancias de Auth separadas).
    await signOut(authSecundario)
  }

  return uid
}

export function suscribirFuncionarios(callback, municipioId) {
  const q = query(collection(db, COLECCIONES.USUARIOS_MUNICIPALES), where('municipio_id', '==', municipioId))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ uid: d.id, ...d.data() })))
  })
}

// Solo borra el perfil en Firestore (revoca el acceso al Dashboard). No borra
// la cuenta de Firebase Auth: eso requiere el Admin SDK / consola de Firebase,
// no está disponible desde el cliente.
export async function eliminarFuncionario(uid) {
  await deleteDoc(doc(db, COLECCIONES.USUARIOS_MUNICIPALES, uid))
}
