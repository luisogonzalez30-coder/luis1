import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase/firebase'

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp']
const TAMANO_MAXIMO_BYTES = 8 * 1024 * 1024 // 8 MB

// Sube una imagen a Firebase Storage y devuelve su URL pública de descarga.
// Valida tipo y tamaño antes de intentar subir, para no gastar cuota de Storage
// con archivos inválidos y dar feedback rápido al usuario.
export async function subirImagen(archivo, rutaCarpeta) {
  if (!archivo) {
    throw new Error('No se seleccionó ningún archivo.')
  }

  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    throw new Error('Formato de imagen no soportado. Usa JPG, PNG o WEBP.')
  }

  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    throw new Error('La imagen es demasiado pesada (máximo 8MB).')
  }

  const nombreArchivo = `${Date.now()}_${archivo.name}`
  const storageRef = ref(storage, `${rutaCarpeta}/${nombreArchivo}`)

  try {
    await uploadBytes(storageRef, archivo)
    return await getDownloadURL(storageRef)
  } catch (error) {
    console.error('[storageService] Error al subir imagen:', error)
    throw new Error('No se pudo subir la foto. Revisa tu conexión e intenta nuevamente.')
  }
}
