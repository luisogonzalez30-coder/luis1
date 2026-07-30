import { Loader2 } from 'lucide-react'

// Botón reutilizable con estado de carga integrado para evitar doble-click
// en acciones que hacen submit a Firestore/Storage.
export default function Boton({
  children,
  onClick,
  type = 'button',
  variante = 'primario',
  cargando = false,
  disabled = false,
  className = '',
}) {
  const estilos = {
    primario: 'bg-primary hover:bg-primary-dark text-white',
    secundario: 'bg-gray-100 hover:bg-gray-200 text-gray-800',
    peligro: 'bg-red-600 hover:bg-red-700 text-white',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || cargando}
      className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium
        transition-colors disabled:opacity-50 disabled:cursor-not-allowed
        ${estilos[variante]} ${className}`}
    >
      {cargando && <Loader2 className="animate-spin" size={18} />}
      {children}
    </button>
  )
}
