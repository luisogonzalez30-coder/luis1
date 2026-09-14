import { comprimirImagen } from '../utils/comprimirImagen'

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp']

// Tope duro ANTES de comprimir, solo como protección de memoria: comprimir
// implica decodificar la imagen completa en RAM, y un archivo absurdo tumbaría
// el navegador de un celular de gama baja. No es el límite de subida real —
// después de comprimir nada supera el medio mega (ver utils/comprimirImagen.js).
// Antes esto eran 8 MB y rechazaba fotos legítimas: cualquier celular actual
// saca fotos de más de 8 MB, y el residente se quedaba sin poder reportar.
const TAMANO_MAXIMO_BYTES = 32 * 1024 * 1024 // 32 MB

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

// Sube una imagen a Cloudinary (plan gratis, sin tarjeta) y devuelve su URL pública.
// Se cambió desde Firebase Storage porque activar Storage en Firebase ahora exige
// el plan Blaze, que a su vez exige una tarjeta — el condominio no tiene una
// disponible. Se usa "unsigned upload" (preset
// configurado en el dashboard de Cloudinary, sin clave secreta) para que el
// residente pueda subir la foto "antes" sin login, igual que con Storage.
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
  // app (foto del residente, foto "después" de el equipo, foto de seguimiento).
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

const TIPOS_DOCUMENTO = [...TIPOS_PERMITIDOS, 'application/pdf']
const TAMANO_MAXIMO_DOCUMENTO_BYTES = 10 * 1024 * 1024 // 10 MB

// Sube el respaldo de una mantención obligatoria (ver utils/mantenciones.js).
// Es distinto de subirImagen() en dos cosas, y por eso no se reusó aquella:
//
//   - Acepta PDF. El certificado de un ascensor o la recarga de extintores llega
//     como PDF del proveedor, no como foto. Igual se acepta imagen, porque en la
//     práctica el administrador muchas veces le saca una foto a la etiqueta o al
//     papel firmado, y exigirle escanear sería garantizar que no lo cargue.
//   - El PDF NO se comprime ni se toca: es la evidencia, tiene que quedar
//     idéntica a como la emitió el proveedor. La imagen sí pasa por la
//     compresión de siempre.
//
// ⚠️ Requisito de configuración: el preset "unsigned" de Cloudinary tiene que
// permitir `resource_type: auto` (o raw) para aceptar PDF. Si no está habilitado,
// Cloudinary rechaza la subida y acá se devuelve su mensaje tal cual en vez de un
// error genérico — es exactamente el dato que hace falta para ir a arreglarlo al
// panel de Cloudinary.
export async function subirDocumento(archivo, rutaCarpeta) {
  if (!archivo) {
    throw new Error('No se seleccionó ningún archivo.')
  }

  if (!TIPOS_DOCUMENTO.includes(archivo.type)) {
    throw new Error('Formato no soportado. Sube un PDF o una foto (JPG, PNG o WEBP).')
  }

  if (archivo.size > TAMANO_MAXIMO_DOCUMENTO_BYTES) {
    throw new Error('El archivo supera los 10 MB. Sube una versión más liviana.')
  }

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    console.error('[storageService] Faltan VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET en .env')
    throw new Error('La subida de documentos no está configurada todavía.')
  }

  const esPdf = archivo.type === 'application/pdf'
  const contenido = esPdf ? archivo : await comprimirImagen(archivo)

  const formData = new FormData()
  formData.append('file', contenido)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', rutaCarpeta)

  let datos
  try {
    const respuesta = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
      method: 'POST',
      body: formData,
    })
    datos = await respuesta.json()
    if (!respuesta.ok) {
      throw new Error(datos?.error?.message || 'Cloudinary rechazó el archivo.')
    }
  } catch (error) {
    console.error('[storageService] Error al subir documento:', error)
    // El mensaje de Cloudinary se propaga tal cual (dice, por ejemplo, que el
    // preset no permite ese tipo de recurso). Un "no se pudo subir" genérico acá
    // cuesta una tarde de diagnóstico.
    throw new Error(error.message || 'No se pudo subir el documento. Revisa tu conexión e intenta nuevamente.')
  }

  return datos.secure_url
}
