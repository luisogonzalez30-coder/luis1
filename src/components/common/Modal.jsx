import { X } from 'lucide-react'

// Modal genérico centrado, con overlay oscuro. Cierra al hacer clic fuera de
// la tarjeta o en la X — no cierra con click dentro (evita perder el formulario
// por error).
export default function Modal({ titulo, onCerrar, children }) {
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{titulo}</h3>
          <button onClick={onCerrar} className="rounded-full p-1 hover:bg-gray-100" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
