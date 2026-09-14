// Fila de fotos (hasta 3, ver "Hasta 3 fotos") con scroll
// horizontal — usado en todos los paneles que muestran la foto "antes" de una
// solicitud. Antes cada uno mostraba una sola <img>; ahora es un array.
export default function GaleriaFotos({ urls, alt = 'Foto de la solicitud', className = '' }) {
  if (!urls?.length) return null

  return (
    <div className={`flex gap-2 overflow-x-auto ${className}`}>
      {urls.map((url) => (
        <img key={url} src={url} alt={alt} className="h-40 w-40 shrink-0 rounded-lg object-cover" />
     ))}
    </div>
 )
}
