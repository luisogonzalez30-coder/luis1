const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp']
const TAMANO_MAXIMO_BYTES = 8 * 1024 * 1024 // 8 MB

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

// Sube una imagen a Cloudinary (plan gratis, sin tarjeta) y devuelve su URL pública.
// Se cambió desde Firebase Storage porque activar Storage en Firebase ahora exige
// el plan Blaze, que a su vez exige una tarjeta — el municipio no tiene una
// disponible (ver ESTADO_PROYECTO.md §19). Se usa "unsigned upload" (preset
// configurado en el dashboard de Cloudinary, sin clave secreta) para que el
// ciudadano pueda subir la foto "antes" sin login, igual que con Storage.
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

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    console.error('[storageService] Faltan VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET en .env')
    throw new Error('La subida de fotos no está configurada todavía.')
  }

  const formData = new FormData()
  formData.append('file', archivo)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', rutaCarpeta)

  try {
    const respuesta = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    })
    const datos = await respuesta.json()

    if (!respuesta.ok) {
      throw new Error(datos?.error?.message || 'Cloudinary rechazó la imagen.')
    }

    return datos.secure_url
  } catch (error) {
    console.error('[storageService] Error al subir imagen:', error)
    throw new Error('No se pudo subir la foto. Revisa tu conexión e intenta nuevamente.')
  }
}
