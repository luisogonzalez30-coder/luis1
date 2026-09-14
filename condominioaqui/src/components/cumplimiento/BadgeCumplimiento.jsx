import { AlertTriangle, CircleHelp, Clock, ShieldCheck } from 'lucide-react'
import { ESTADO_MANTENCION } from '../../utils/mantenciones'

// Los cuatro estados de una obligación, con su color y su ícono.
//
// El color NUNCA carga solo con el significado: siempre va acompañado del texto
// y de un ícono distinto por estado. Es la misma regla que ya se aplica en
// BadgeGravedad, y acá importa más todavía: "vencida" y "por vencer" son rojo y
// ámbar, el par que peor distingue un daltónico, y confundirlos es confundir
// "estás infringiendo la ley" con "te quedan 40 días".
//
// "Sin registro" va en gris y no en rojo a propósito: no sabemos si está vencida
// o no, solo que nadie lo ha cargado. Pintarlo de rojo sería afirmar algo que no
// consta — aunque para una fiscalización el efecto práctico sea parecido, y por
// eso igual se ordena arriba en la lista.
export const ESTILO_POR_ESTADO = {
  [ESTADO_MANTENCION.VENCIDA]: {
    clases: 'bg-red-100 text-red-800',
    puntoClases: 'bg-red-500',
    icono: AlertTriangle,
  },
  [ESTADO_MANTENCION.SIN_REGISTRO]: {
    clases: 'bg-gray-100 text-gray-700',
    puntoClases: 'bg-gray-400',
    icono: CircleHelp,
  },
  [ESTADO_MANTENCION.POR_VENCER]: {
    clases: 'bg-amber-100 text-amber-800',
    puntoClases: 'bg-amber-500',
    icono: Clock,
  },
  [ESTADO_MANTENCION.AL_DIA]: {
    clases: 'bg-green-100 text-green-800',
    puntoClases: 'bg-green-600',
    icono: ShieldCheck,
  },
}

export default function BadgeCumplimiento({ estado }) {
  const estilo = ESTILO_POR_ESTADO[estado] || ESTILO_POR_ESTADO[ESTADO_MANTENCION.SIN_REGISTRO]
  const Icono = estilo.icono

  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${estilo.clases}`}>
      <Icono size={13} aria-hidden="true" />
      {estado}
    </span>
 )
}
