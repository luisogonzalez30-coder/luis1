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
  // Degradado sutil + sombra en el color del municipio, y un leve hundimiento al
  // tocar (active:scale). Se mantiene el texto blanco sobre el color pleno del
  // tenant para no bajar el contraste: la app la usan también adultos mayores y
  // muchas veces con sol directo en la pantalla.
  const estilos = {
    primario: 'bg-gradient-to-b from-primary to-primary-dark text-white shadow-md shadow-primary/25 hover:brightness-110',
    secundario: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    peligro: 'bg-gradient-to-b from-red-500 to-red-700 text-white shadow-md shadow-red-500/25 hover:brightness-110',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || cargando}
      className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 font-medium
        transition-all duration-150 active:scale-[0.98]
        disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:active:scale-100
        ${estilos[variante]} ${className}`}
    >
      {cargando && <Loader2 className="animate-spin" size={18} />}
      {children}
    </button>
  )
}
