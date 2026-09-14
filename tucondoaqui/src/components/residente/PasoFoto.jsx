import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Camera, X, AlertTriangle, MessageCircle, WifiOff, Loader2 } from 'lucide-react'
import { esWhatsappValido } from '../../utils/telefono'
import SugerenciaCategoria from './SugerenciaCategoria'

const MAX_FOTOS = 3

// Paso 3: foto + datos de contacto. A diferencia de versiones anteriores, acá
// ya nada es opcional (decisión del usuario):
// la administración necesita al menos una foto para dimensionar el trabajo y un
// WhatsApp real para coordinar con el residente. La única excepción es la foto
// cuando el celular está sin señal — ver el aviso de más abajo.
export default function PasoFoto({
  fotos,
  onCambiarFotos,
  nombreResidente,
  contactoResidente,
  onCambiarNombre,
  onCambiarContacto,
  sinConexion,
  condominioSlug,
  // Revisión de la categoría a partir de la foto. Todo esto es opcional: si la
  // IA está apagada llegan en null/false y el paso se ve exactamente como antes.
  categoria,
  sugerenciaCategoria,
  revisandoFoto = false,
  onAceptarSugerencia,
  onDescartarSugerencia,
}) {
  const previews = useMemo(() => fotos.map((f) => URL.createObjectURL(f)), [fotos])

  const contactoEscrito = contactoResidente.trim().length > 0
  const contactoInvalido = contactoEscrito && !esWhatsappValido(contactoResidente)
  const faltaFoto = fotos.length === 0 && !sinConexion

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
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">3. Foto y tus datos</h2>
        <p className="text-sm text-gray-500">
          Una foto ayuda a el equipo a dimensionar el problema antes de salir a terreno.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Fotos del problema {sinConexion ? '(no disponible sin señal)' : '· al menos 1'}
        </label>

        <div className="grid grid-cols-3 gap-2">
          {previews.map((url, i) => (
            <div key={url} className="relative">
              <img src={url} alt={`Foto ${i + 1}`} className="h-24 w-full rounded-2xl object-cover shadow-sm" />
              <button
                type="button"
                onClick={() => quitarFoto(i)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black/80"
                aria-label="Quitar foto"
              >
                <X size={14} />
              </button>
            </div>
         ))}

          {fotos.length < MAX_FOTOS && (
            <label
              className={`flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed transition-colors
                ${faltaFoto ? 'border-red-300 bg-red-50/50 text-red-500' : 'border-gray-300 text-gray-500 hover:border-primary hover:text-primary'}`}
            >
              <Camera size={22} />
              <span className="text-xs font-medium">Agregar</span>
              <input type="file" accept="image/*" capture="environment" onChange={manejarSeleccion} className="hidden" />
            </label>
         )}
        </div>

        {sinConexion ? (
          <div className="mt-2 flex items-start gap-1.5 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-800">
            <WifiOff size={14} className="mt-0.5 shrink-0" />
            <span>
              Estás sin señal. Tu reporte se va a guardar y enviar solo cuando vuelva internet, pero
              <strong> sin foto</strong> — no alcanza a guardarse en el celular.
            </span>
          </div>
       ) : (
          faltaFoto && <p className="mt-2 text-xs text-red-600">Agrega al menos una foto para poder enviar tu reporte.</p>
       )}

        {revisandoFoto && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
            <Loader2 size={13} className="animate-spin" />
            Revisando la foto...
          </p>
       )}
      </div>

      <SugerenciaCategoria
        sugerencia={sugerenciaCategoria}
        categoriaElegida={categoria}
        onAceptar={onAceptarSugerencia}
        onDescartar={onDescartarSugerencia}
      />

      <hr className="border-gray-200" />

      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-2 rounded-2xl bg-primary/5 p-3 text-sm text-gray-700">
          <MessageCircle size={18} className="mt-0.5 shrink-0 text-primary" />
          <span>
            Cuando tomen tu caso <strong>te van a llamar o escribir por WhatsApp</strong> para coordinar la visita
            o hacerte las preguntas que falten. Por ahí mismo te llega el número de tu reporte y el aviso cuando
            quede resuelto.
          </span>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Tu nombre</label>
          <input
            type="text"
            value={nombreResidente}
            onChange={(e) => onCambiarNombre(e.target.value)}
            placeholder="Ej: María González"
            className="w-full rounded-2xl border border-gray-300 p-3 text-base transition-shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Tu WhatsApp</label>
          <input
            type="tel"
            inputMode="numeric"
            value={contactoResidente}
            onChange={(e) => onCambiarContacto(e.target.value)}
            placeholder="9 1234 5678"
            className={`w-full rounded-2xl border p-3 text-base transition-shadow focus:outline-none focus:ring-2 ${
              contactoInvalido ? 'border-red-400 focus:ring-red-200' : 'border-gray-300 focus:border-primary focus:ring-primary/30'
            }`}
          />
          {contactoInvalido ? (
            <p className="mt-1 flex items-start gap-1 text-xs text-red-600">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              Revisa el número: son 9 dígitos y parte con 9 (ej: 9 1234 5678).
            </p>
         ) : (
            <p className="mt-1 text-xs text-gray-400">Solo lo usa la administración para este reporte.</p>
         )}
        </div>

        {/* Aviso de tratamiento de datos, exigido por la Ley 21.719. Va acá y no
            en un pie de página: el residente tiene que poder leerlo en el momento
            en que entrega su nombre y su teléfono, que es justo arriba. Los
            enlaces abren en pestaña nueva para no perder el reporte a medio
            escribir — el formulario no persiste el borrador entre navegaciones. */}
        <p className="text-xs leading-relaxed text-gray-500">
          Tu nombre y tu teléfono los usa la administración solo para este reporte, y{' '}
          <strong>nunca se publican</strong>. Las fotos y la ubicación sí son públicas. Al enviar
          aceptas los{' '}
          <Link
            to={`/${condominioSlug}/terminos`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline"
          >
            términos de servicio
          </Link>{' '}
          y la{' '}
          <Link
            to={`/${condominioSlug}/privacidad`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline"
          >
            política de privacidad
          </Link>.
        </p>
      </div>
    </div>
 )
}
