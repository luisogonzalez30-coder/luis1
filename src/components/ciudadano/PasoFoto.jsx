import { Camera, X } from 'lucide-react'

export default function PasoFoto({
  foto,
  previewUrl,
  onCambiarFoto,
  quiereDejarDatos,
  nombreCiudadano,
  contactoCiudadano,
  onCambiarQuiereDejarDatos,
  onCambiarNombre,
  onCambiarContacto,
}) {
  function manejarSeleccion(e) {
    const archivo = e.target.files?.[0]
    if (archivo) {
      onCambiarFoto(archivo)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">3. Foto de la incidencia</h2>
        <p className="text-sm text-gray-500">Una foto ayuda a la cuadrilla a dimensionar el problema.</p>
      </div>

      {previewUrl ? (
        <div className="relative">
          <img src={previewUrl} alt="Vista previa de la incidencia" className="w-full rounded-xl object-cover max-h-64" />
          <button
            type="button"
            onClick={() => onCambiarFoto(null)}
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white"
            aria-label="Quitar foto"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-8 text-gray-500 hover:border-primary hover:text-primary">
          <Camera size={32} />
          <span className="text-sm font-medium">Tomar o subir foto</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={manejarSeleccion}
            className="hidden"
          />
        </label>
      )}

      <p className="text-xs text-gray-400">La foto es opcional, pero muy recomendada.</p>

      <hr className="border-gray-200" />

      <div>
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={quiereDejarDatos}
            onChange={(e) => onCambiarQuiereDejarDatos(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300"
          />
          Quiero dejar mis datos de contacto (opcional)
        </label>
        <p className="mt-1 text-xs text-gray-400">
          Tu reporte se envía igual sin esto — solo lo usa la municipalidad para hacer seguimiento contigo si es necesario.
        </p>
      </div>

      {quiereDejarDatos && (
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={nombreCiudadano}
            onChange={(e) => onCambiarNombre(e.target.value)}
            placeholder="Tu nombre"
            className="w-full rounded-xl border border-gray-300 p-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            type="text"
            value={contactoCiudadano}
            onChange={(e) => onCambiarContacto(e.target.value)}
            placeholder="Teléfono o correo"
            className="w-full rounded-xl border border-gray-300 p-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      )}
    </div>
  )
}
