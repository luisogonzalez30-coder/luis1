import { Star } from 'lucide-react'

// Widget de calificación 1-5 estrellas. En modo interactivo, cada clic dispara
// onSeleccionar de inmediato (sin botón "enviar" aparte) — mismo criterio que
// otras interacciones de un solo clic ya usadas en la app (ej. asistencia de
// trabajadores en ModalPersonalDeArea.jsx).
export default function EstrellasCalificacion({ valor = 0, onSeleccionar, soloLectura = false }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={soloLectura}
          onClick={() => onSeleccionar?.(n)}
          className={soloLectura ? 'cursor-default' : 'transition-transform hover:scale-110'}
          aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
        >
          <Star size={22} className={n <= valor ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />
        </button>
     ))}
    </div>
 )
}
