import { createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { authSecundario, db, COLECCIONES } from '../firebase/firebase'

// Crea la cuenta de Auth (en la app secundaria, ver firebase.js) y su perfil en
// usuarios_condominio. Si el setDoc falla después de crear la cuenta de Auth,
// queda un usuario de Auth "huérfano" sin perfil — AuthContext ya maneja ese
// caso (le niega acceso con un mensaje claro); el Administrador puede reintentar
// creando el perfil a mano en la consola, o borrar esa cuenta desde
// Authentication > Users si prefiere empezar de nuevo.
export async function crearUsuario({ nombre, correo, contrasena, rol, area, telefono, condominioId }) {
  const credencial = await createUserWithEmailAndPassword(authSecundario, correo, contrasena)
  const uid = credencial.user.uid

  try {
    await setDoc(doc(db, COLECCIONES.USUARIOS, uid), {
      nombre,
      correo,
      rol,
      area: rol === 'COMITE' ? area : 'todos',
      // Opcional. Alimenta el botón de WhatsApp del contacto directo en las
      // tarjetas de area del panel del Administrador. Es un teléfono de
      // trabajo, no un dato del residente: no pasa por las reglas de datos
      // personales de la política de privacidad, que cubre a los residentes.
      telefono: telefono?.trim() || '',
      condominio_id: condominioId,
      fecha_creacion: serverTimestamp(),
    })
  } finally {
    // Cierra la sesión en la app secundaria — no afecta la sesión del Administrador
    // en la app principal (son instancias de Auth separadas).
    await signOut(authSecundario)
  }

  return uid
}

export function suscribirUsuarios(callback, condominioId) {
  const q = query(collection(db, COLECCIONES.USUARIOS), where('condominio_id', '==', condominioId))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ uid: d.id, ...d.data() })))
  })
}

// Solo borra el perfil en Firestore (revoca el acceso al Dashboard). No borra
// la cuenta de Firebase Auth: eso requiere el Admin SDK / consola de Firebase,
// no está disponible desde el cliente.
export async function eliminarUsuario(uid) {
  await deleteDoc(doc(db, COLECCIONES.USUARIOS, uid))
}
