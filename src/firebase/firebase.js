// Configuración e inicialización de Firebase para toda la app.
// Se centraliza aquí para que el resto del código importe siempre desde este único archivo
// (facilita cambiar de proyecto de Firebase o mockear en tests).

import { initializeApp, getApps } from 'firebase/app'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectStorageEmulator, getStorage } from 'firebase/storage'
import { connectAuthEmulator, getAuth } from 'firebase/auth'

// Las credenciales se leen desde variables de entorno (.env) para no exponerlas en el
// repositorio. Ver .env.example para la lista de variables requeridas.
// IMPORTANTE: en Vite, las variables de entorno expuestas al cliente deben
// empezar con el prefijo VITE_.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Validación básica: si falta alguna variable, fallamos rápido con un mensaje claro
// en vez de dejar que Firebase lance errores crípticos más adelante.
const camposFaltantes = Object.entries(firebaseConfig)
  .filter(([, valor]) => !valor)
  .map(([clave]) => clave)

if (camposFaltantes.length > 0) {
  console.error(
    `[firebase.js] Faltan variables de entorno: ${camposFaltantes.join(', ')}. ` +
    'Revisa tu archivo .env en base a .env.example.'
  )
}

const app = initializeApp(firebaseConfig)

// Instancias únicas (singleton) que se importan en el resto de la app.
export const db = getFirestore(app)
export const storage = getStorage(app)
export const auth = getAuth(app)

// App secundaria, solo para que un Alcalde cree cuentas de otros funcionarios
// (funcionariosService.js). createUserWithEmailAndPassword inicia sesión
// automáticamente como el usuario recién creado; sin una app separada, eso
// desloguearía al Alcalde de su propia sesión cada vez que crea a alguien.
// getApps() evita el error "app ya existe" en Hot Module Reload de Vite.
const appSecundaria = getApps().find((a) => a.name === 'secundaria')
  || initializeApp(firebaseConfig, 'secundaria')
export const authSecundario = getAuth(appSecundaria)

// Modo emulador: para desarrollo local con el Firebase Emulator Suite, sin tocar
// datos de un proyecto real. Se activa con VITE_USE_FIREBASE_EMULATORS=true en .env
// (ver README de emuladores). Se guarda una bandera en window para evitar reconectar
// en cada Hot Module Reload de Vite (connectXEmulator lanza error si se llama dos veces).
if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true' && !globalThis.__emuladoresConectados) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
  globalThis.__emuladoresConectados = true
  console.info('[firebase.js] Conectado al Firebase Emulator Suite (modo local de desarrollo).')
}

// Nombres de colecciones centralizados para evitar "strings mágicos" repartidos
// por el código y typos como 'incidencia' vs 'incidencias'.
export const COLECCIONES = {
  INCIDENCIAS: 'incidencias',
  USUARIOS_MUNICIPALES: 'usuarios_municipales',
  MUNICIPALIDADES: 'municipalidades',
  TICKETS_PUBLICOS: 'tickets_publicos',
  TRABAJADORES: 'trabajadores',
  UBICACIONES_CUADRILLA: 'ubicaciones_cuadrilla',
  DISPOSITIVOS: 'dispositivos', // marca de tiempo por dispositivo para el límite anti-spam (ver §28)
}

export default app
