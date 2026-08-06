// Compresión de fotos en el celular del vecino, ANTES de subirlas.
//
// Por qué en el cliente y no en el servidor: una foto de celular moderno pesa
// entre 3 y 8 MB. Subirla entera tiene dos costos que caen justo sobre quien
// menos puede pagarlos — los datos móviles del vecino en zona rural, y la cuota
// del plan gratis de Cloudinary del municipio. Comprimir antes ataca los dos a
// la vez: se sube ~20 veces menos, y lo que llega ya está listo para mostrarse.
//
// Se usa `browser-image-compression` en vez de un canvas a mano por dos razones
// concretas: corre en un Web Worker (en un celular de gama baja, redimensionar
// en el hilo principal congela la interfaz varios segundos) y respeta la
// orientación EXIF, que es lo que hace que las fotos verticales de Android no
// terminen giradas.

// Ajustables. 800 px y 500 kB son suficientes para que la cuadrilla dimensione
// un bache o un basural. Si el municipio necesitara leer patentes o carteles en
// las fotos, subir MAX_LADO_PX a 1280 es el único cambio necesario.
const MAX_LADO_PX = 800
const MAX_MB = 0.5

// Debajo de esto no vale la pena: el costo de descomprimir y recomprimir supera
// lo que se ahorra, y una segunda pasada de JPEG siempre degrada la imagen.
const MINIMO_PARA_COMPRIMIR_BYTES = 300 * 1024

export async function comprimirImagen(archivo) {
  if (!archivo) return archivo

  // Los PNG con transparencia y los formatos raros se dejan pasar tal cual:
  // convertirlos puede ennegrecer el fondo transparente.
  if (!/^image\/(jpeg|png|webp)$/.test(archivo.type)) return archivo

  if (archivo.size <= MINIMO_PARA_COMPRIMIR_BYTES) return archivo

  try {
    // Import dinámico: la librería pesa ~56 kB y solo hace falta cuando alguien
    // efectivamente adjunta una foto. Cargarla en el bundle principal se lo
    // habría cobrado a TODOS los vecinos que abren la app —incluidos los que
    // solo consultan un ticket—, justo el peso que el resto de la app evita.
    const { default: imageCompression } = await import('browser-image-compression')

    const comprimido = await imageCompression(archivo, {
      maxSizeMB: MAX_MB,
      maxWidthOrHeight: MAX_LADO_PX,
      useWebWorker: true,
      // Salida siempre JPEG: es el formato con mejor relación peso/calidad para
      // fotos, y evita que un PNG de 6 MB sacado con la cámara siga pesando.
      fileType: 'image/jpeg',
      initialQuality: 0.75,
    })

    // Salvaguarda: si por lo que sea el resultado pesa más que el original
    // (pasa con imágenes ya muy optimizadas), se manda el original.
    if (comprimido.size >= archivo.size) return archivo

    console.info(
      `[comprimirImagen] ${(archivo.size / 1024).toFixed(0)} kB → ${(comprimido.size / 1024).toFixed(0)} kB`
    )
    return comprimido
  } catch (error) {
    // Nunca bloquear el reporte por no poder comprimir. Es una optimización,
    // no un requisito: si falla, se sube el original y el vecino ni se entera.
    console.error('[comprimirImagen] No se pudo comprimir, se sube el original:', error)
    return archivo
  }
}
