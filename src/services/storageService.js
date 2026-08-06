import { comprimirImagen } from '../utils/comprimirImagen'

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp']

// Tope duro ANTES de comprimir, solo como protección de memoria: comprimir
// implica decodificar la imagen completa en RAM, y un archivo absurdo tumbaría
// el navegador de un celular de gama baja. No es el límite de subida real —
// después de comprimir nada supera el medio mega (ver utils/comprimirImagen.js).
// Antes esto eran 8 MB y rechazaba fotos legítimas: cualquier celular actual
// saca fotos de más de 8 MB, y el vecino se quedaba sin poder reportar.
const TAMANO_MAXIMO_BYTES = 32 * 1024 * 1024 // 32 MB

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
    throw new Error('La imagen es demasiado pesada. Sácala de nuevo con menos resolución.')
  }

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    console.error('[storageService] Faltan VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET en .env')
    throw new Error('La subida de fotos no está configurada todavía.')
  }

  // Se comprime acá, en el único punto por el que pasan TODAS las subidas de la
  // app (foto del vecino, foto "después" de la cuadrilla, foto de seguimiento).
  // Ponerlo en cada formulario habría sido tres implementaciones que se
  // desincronizan; acá es imposible que una subida se salte la compresión.
  const optimizado = await comprimirImagen(archivo)

  const formData = new FormData()
  formData.append('file', optimizado)
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
