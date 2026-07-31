import { useMemo } from 'react'
import { Camera, X, AlertTriangle } from 'lucide-react'
import { esRutValido, formatearRut } from '../../utils/rut'

const MAX_FOTOS = 3

export default function PasoFoto({
  fotos,
  onCambiarFotos,
  quiereDejarDatos,
  nombreCiudadano,
  rutCiudadano,
  contactoCiudadano,
  onCambiarQuiereDejarDatos,
  onCambiarNombre,
  onCambiarRut,
  onCambiarContacto,
}) {
  const previews = useMemo(() => fotos.map((f) => URL.createObjectURL(f)), [fotos])
  const rutEscrito = rutCiudadano.trim().length > 0
  const rutInvalido = rutEscrito && !esRutValido(rutCiudadano)

  function manejarSeleccion(e) {
    const archivo = e.target.files?.[0]
    if (archivo && fotos.length < MAX_FOTOS) {
      onCambiarFotos([...fotos, archivo])
    }
    e.target.value = '' // permite volver a elegir el mismo archivo si se saca y se agrega de nuevo
  }

  function quitarFoto(indice) {
    onCambiarFotos(fotos.filter((_, i) => i !== indice))
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">3. Fotos de la incidencia</h2>
        <p className="text-sm text-gray-500">Hasta 3 fotos — ayudan a la cuadrilla a dimensionar el problema.</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {previews.map((url, i) => (
          <div key={url} className="relative">
            <img src={url} alt={`Foto ${i + 1}`} className="h-24 w-full rounded-xl object-cover" />
            <button
              type="button"
              onClick={() => quitarFoto(i)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
              aria-label="Quitar foto"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {fotos.length < MAX_FOTOS && (
          <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-primary hover:text-primary">
            <Camera size={22} />
            <span className="text-xs font-medium">Agregar</span>
            <input type="file" accept="image/*" capture="environment" onChange={manejarSeleccion} className="hidden" />
          </label>
        )}
      </div>

      <p className="text-xs text-gray-400">Las fotos son opcionales, pero muy recomendadas.</p>

      <hr className="border-gray-200" />

      <div>
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={quiereDejarDatos}
            onChange={(e) => onCambiarQuiereDejarDatos(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300"
          />
          Quiero que me avisen cuando resuelvan mi reporte
        </label>
        <div className="mt-1 flex items-start gap-1.5 text-xs text-amber-700">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>Tu reporte se envía igual sin esto — pero sin tu RUT y un WhatsApp o correo, no vamos a poder avisarte cuando se resuelva tu problema.</span>
        </div>
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
          <div>
            <input
              type="text"
              value={rutCiudadano}
              onChange={(e) => onCambiarRut(e.target.value)}
              onBlur={() => rutEscrito && !rutInvalido && onCambiarRut(formatearRut(rutCiudadano))}
              placeholder="Tu RUT (ej: 12.345.678-9)"
              className={`w-full rounded-xl border p-3 text-base focus:outline-none focus:ring-2 ${
                rutInvalido ? 'border-red-400 focus:ring-red-200' : 'border-gray-300 focus:border-primary focus:ring-primary/30'
              }`}
            />
            {rutInvalido && <p className="mt-1 text-xs text-red-600">Ese RUT no parece válido — revisa el número.</p>}
          </div>
          <input
            type="text"
            value={contactoCiudadano}
            onChange={(e) => onCambiarContacto(e.target.value)}
            placeholder="WhatsApp o correo"
            className="w-full rounded-xl border border-gray-300 p-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      )}
    </div>
  )
}
