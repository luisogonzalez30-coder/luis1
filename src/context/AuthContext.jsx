import { createContext, useContext, useEffect, useState } from 'react'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db, COLECCIONES } from '../firebase/firebase'

// Contexto de autenticación para funcionarios municipales (ADMIN / TERRENO).
// La Vista Ciudadano NO pasa por aquí: es de acceso público sin login.
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null) // usuario de Firebase Auth
  const [perfil, setPerfil] = useState(null) // documento en 'usuarios_municipales' (nombre, rol)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usuarioActual) => {
      setUsuario(usuarioActual)

      if (usuarioActual) {
        try {
          const snap = await getDoc(doc(db, COLECCIONES.USUARIOS_MUNICIPALES, usuarioActual.uid))
          if (snap.exists()) {
            setPerfil({ uid: usuarioActual.uid, ...snap.data() })
          } else {
            // Existe en Firebase Auth pero no tiene perfil municipal: no le damos acceso a rol alguno.
            setPerfil(null)
            setError('Tu cuenta no tiene un perfil municipal asociado. Contacta al administrador.')
          }
        } catch (err) {
          console.error('[AuthContext] Error al cargar perfil municipal:', err)
          setPerfil(null)
        }
      } else {
        setPerfil(null)
      }

      setCargando(false)
    })

    return unsubscribe
  }, [])

  async function iniciarSesion(email, password) {
    setError(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      const mensajes = {
        'auth/invalid-credential': 'Correo o contraseña incorrectos.',
        'auth/invalid-email': 'El formato del correo no es válido.',
        'auth/too-many-requests': 'Demasiados intentos fallidos. Intenta más tarde.',
      }
      const mensaje = mensajes[err.code] || 'No se pudo iniciar sesión. Intenta nuevamente.'
      setError(mensaje)
      throw new Error(mensaje)
    }
  }

  async function cerrarSesion() {
    await signOut(auth)
  }

  const value = { usuario, perfil, cargando, error, iniciarSesion, cerrarSesion }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de un <AuthProvider>')
  }
  return ctx
}
