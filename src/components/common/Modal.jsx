import { useEffect } from 'react'
import { X } from 'lucide-react'

// Anchos disponibles. `sm` es el de siempre (formularios cortos); `lg` es para
// contenido que se lee, no que se llena — fichas, listados con detalle.
const ANCHOS = {
  sm: 'max-w-sm',
  lg: 'max-w-lg',
}

// Modal genérico centrado, con overlay oscuro. Cierra al hacer clic fuera de
// la tarjeta o en la X — no cierra con click dentro (evita perder el formulario
// por error).
//
// El alto se acota al viewport (`max-h`) con scroll interno: sin eso, un modal
// con mucho contenido crece más que la pantalla y su encabezado —con el botón
// de cerrar— queda fuera de alcance.
export default function Modal({ titulo, subtitulo, onCerrar, ancho = 'sm', children }) {
  // Escape cierra: es lo que espera cualquiera que use teclado, y no costaba nada.
  useEffect(() => {
    const alPresionar = (e) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [onCerrar])

  return (
    <div
      // El desenfoque del fondo es lo que hace que se lea como una capa por
      // encima y no como otra sección de la misma página. El velo va más oscuro
      // que antes (40% → 50%) para que el contraste del contenido del modal no
      // dependa de lo que haya debajo.
      className="animar-velo fixed inset-0 z-[2000] flex items-end justify-center bg-tinta-fuerte/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onCerrar}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        // En móvil es una hoja pegada abajo (esquinas superiores redondeadas,
        // ancho completo); desde `sm` vuelve a ser una tarjeta centrada.
        className={`animar-hoja flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-flotante sm:max-h-[88vh] sm:rounded-2xl ${ANCHOS[ancho] || ANCHOS.sm}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Agarradera: en una hoja móvil indica "esto se cierra tirando hacia
            abajo", que es el gesto que la gente intenta primero. */}
        <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-tinta-tenue/40 sm:hidden" />

        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold leading-tight text-tinta-fuerte">{titulo}</h3>
            {subtitulo && <p className="mt-0.5 text-xs text-tinta-suave">{subtitulo}</p>}
          </div>
          <button
            onClick={onCerrar}
            className="toque -mr-2 -mt-2 shrink-0 rounded-full text-tinta-suave transition-colors hover:bg-tinta-fuerte/5 hover:text-tinta-fuerte"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  )
}
