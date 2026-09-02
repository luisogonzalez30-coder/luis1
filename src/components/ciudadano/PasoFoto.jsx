import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Camera, X, AlertTriangle, MessageCircle, WifiOff, Loader2, ImagePlus } from 'lucide-react'
import { esWhatsappValido } from '../../utils/telefono'
import SugerenciaCategoria from './SugerenciaCategoria'

const MAX_FOTOS = 3

// Paso 3: foto + datos de contacto. A diferencia de versiones anteriores, acá
// ya nada es opcional (decisión del usuario, ver §29 en ESTADO_PROYECTO.md):
// la municipalidad necesita al menos una foto para dimensionar el trabajo y un
// WhatsApp real para coordinar con el vecino. La única excepción es la foto
// cuando el celular está sin señal — ver el aviso de más abajo.
export default function PasoFoto({
  fotos,
  onCambiarFotos,
  nombreCiudadano,
  contactoCiudadano,
  onCambiarNombre,
  onCambiarContacto,
  sinConexion,
  municipioSlug,
  // Revisión de la categoría a partir de la foto. Todo esto es opcional: si la
  // IA está apagada llegan en null/false y el paso se ve exactamente como antes.
  categoria,
  sugerenciaCategoria,
  revisandoFoto = false,
  onAceptarSugerencia,
  onDescartarSugerencia,
}) {
  const previews = useMemo(() => fotos.map((f) => URL.createObjectURL(f)), [fotos])

  const contactoEscrito = contactoCiudadano.trim().length > 0
  const contactoInvalido = contactoEscrito && !esWhatsappValido(contactoCiudadano)
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
        <h2 className="text-xl font-bold tracking-tight text-tinta-fuerte">Foto y tus datos</h2>
        <p className="mt-1 text-sm font-medium text-tinta-suave">
          Una foto ayuda a la cuadrilla a dimensionar el problema antes de salir a terreno.
        </p>
      </div>

      <div>
        <label className="etiqueta-campo">
          Fotos del problema{' '}
          <span className="font-normal text-tinta-suave">
            {sinConexion ? '(no disponible sin señal)' : `· al menos 1, hasta ${MAX_FOTOS}`}
          </span>
        </label>

        {/* Zona de captura amplia mientras NO hay ninguna foto. Ocupa el ancho
            completo a propósito: es la acción del paso, y un cuadrito de 1/3 de
            pantalla no se lee como "toca acá" en un celular al sol. Cuando ya
            hay una foto se cambia por la cuadrícula de miniaturas, donde el
            botón de agregar sí puede ser chico. */}
        {fotos.length === 0 ? (
          <label
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-9 text-center transition-colors
              ${faltaFoto
                ? 'border-rose-300 bg-rose-50/60'
                : 'border-slate-300 bg-slate-50 hover:border-primary hover:bg-primary/[0.04]'}`}
          >
            <span
              className={`grid h-14 w-14 place-items-center rounded-full shadow-tarjeta ring-1
                ${faltaFoto ? 'bg-white text-rose-500 ring-rose-100' : 'bg-white text-primary ring-borde'}`}
            >
              <Camera size={26} />
            </span>
            <span className="text-base font-semibold text-tinta-fuerte">Tomar o subir una foto</span>
            <span className="text-xs font-medium text-tinta-suave">
              Se abre la cámara de tu celular. JPG, PNG o WEBP.
            </span>
            <input type="file" accept="image/*" capture="environment" onChange={manejarSeleccion} className="hidden" />
          </label>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            {previews.map((url, i) => (
              <div key={url} className="group relative">
                <img
                  src={url}
                  alt={`Foto ${i + 1}`}
                  className="h-24 w-full rounded-2xl object-cover shadow-tarjeta ring-1 ring-borde"
                />
                <button
                  type="button"
                  onClick={() => quitarFoto(i)}
                  className="absolute -right-1.5 -top-1.5 grid h-7 w-7 place-items-center rounded-full bg-tinta-fuerte/80 text-white shadow-flotante backdrop-blur-sm transition-transform active:scale-90"
                  aria-label={`Quitar foto ${i + 1}`}
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>
            ))}

            {fotos.length < MAX_FOTOS && (
              <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-tinta-suave transition-colors hover:border-primary hover:bg-primary/[0.04] hover:text-primary">
                <ImagePlus size={20} />
                <span className="text-xs font-semibold">Agregar</span>
                <input type="file" accept="image/*" capture="environment" onChange={manejarSeleccion} className="hidden" />
              </label>
            )}
          </div>
        )}

        {sinConexion ? (
          <div className="mt-2.5 flex items-start gap-1.5 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-800 ring-1 ring-inset ring-amber-100">
            <WifiOff size={14} className="mt-0.5 shrink-0" />
            <span>
              Estás sin señal. Tu reporte se va a guardar y enviar solo cuando vuelva internet, pero
              <strong> sin foto</strong> — no alcanza a guardarse en el celular.
            </span>
          </div>
        ) : (
          faltaFoto && (
            <p className="mt-2.5 text-xs font-medium text-rose-600">
              Agrega al menos una foto para poder enviar tu reporte.
            </p>
          )
        )}

        {revisandoFoto && (
          <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-tinta-suave">
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

      <hr className="border-borde" />

      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-2.5 rounded-2xl bg-primary/[0.06] p-3.5 text-sm text-tinta ring-1 ring-inset ring-primary/10">
          <MessageCircle size={18} className="mt-0.5 shrink-0 text-primary" />
          <span>
            Cuando tomen tu caso <strong>te van a llamar o escribir por WhatsApp</strong> para coordinar la visita
            o hacerte las preguntas que falten. Por ahí mismo te llega el número de tu reporte y el aviso cuando
            quede resuelto.
          </span>
        </div>

        <div>
          <label className="etiqueta-campo">Tu nombre</label>
          <input
            type="text"
            value={nombreCiudadano}
            onChange={(e) => onCambiarNombre(e.target.value)}
            placeholder="Ej: María González"
            className="campo"
          />
        </div>

        <div>
          <label className="etiqueta-campo">Tu WhatsApp</label>
          <input
            type="tel"
            inputMode="numeric"
            value={contactoCiudadano}
            onChange={(e) => onCambiarContacto(e.target.value)}
            placeholder="9 1234 5678"
            className={`campo ${contactoInvalido ? 'campo-error' : ''}`}
          />
          {contactoInvalido ? (
            <p className="mt-1.5 flex items-start gap-1 text-xs font-medium text-rose-600">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              Revisa el número: son 9 dígitos y parte con 9 (ej: 9 1234 5678).
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-tinta-suave">Solo lo usa la municipalidad para este reporte.</p>
          )}
        </div>

        {/* Aviso de tratamiento de datos, exigido por la Ley 21.719. Va acá y no
            en un pie de página: el vecino tiene que poder leerlo en el momento
            en que entrega su nombre y su teléfono, que es justo arriba. Los
            enlaces abren en pestaña nueva para no perder el reporte a medio
            escribir — el formulario no persiste el borrador entre navegaciones. */}
        <p className="text-xs leading-relaxed text-tinta-suave">
          Tu nombre y tu teléfono los usa la municipalidad solo para este reporte, y{' '}
          <strong>nunca se publican</strong>. Las fotos y la ubicación sí son públicas. Al enviar
          aceptas los{' '}
          <Link
            to={`/${municipioSlug}/terminos`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline"
          >
            términos de servicio
          </Link>{' '}
          y la{' '}
          <Link
            to={`/${municipioSlug}/privacidad`}
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
