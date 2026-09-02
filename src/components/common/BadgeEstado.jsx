// Estado del reporte en el flujo de trabajo del municipio: Pendiente (nadie lo
// ha tomado) → En Proceso (hay una cuadrilla asignada) → Resuelto.
//
// Es un semáforo de AVANCE, no de gravedad: rosa significa "todavía no
// empezado", no "peligroso". Por eso la píldora de gravedad (BadgeGravedad) usa
// un tratamiento visual distinto —contorno en vez de relleno— aunque las dos
// aparezcan juntas en la misma tarjeta: si ambas fueran píldoras rellenas de
// color, el funcionario leería dos escalas distintas como si fueran la misma.
//
// El punto de color nunca carga solo con el significado: el texto del estado
// siempre va escrito al lado. Es la condición que hace que esto funcione para
// daltonismo y en una pantalla con sol directo.
const ESTILOS_POR_ESTADO = {
  Pendiente: { caja: 'bg-rose-50 text-rose-700 ring-rose-100', punto: 'bg-rose-500' },
  'En Proceso': { caja: 'bg-amber-50 text-amber-700 ring-amber-100', punto: 'bg-amber-500' },
  Resuelto: { caja: 'bg-emerald-50 text-emerald-700 ring-emerald-100', punto: 'bg-emerald-500' },
}

const NEUTRO = { caja: 'bg-slate-100 text-slate-600 ring-slate-200', punto: 'bg-slate-400' }

export default function BadgeEstado({ estado }) {
  const { caja, punto } = ESTILOS_POR_ESTADO[estado] || NEUTRO

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${caja}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${punto}`} aria-hidden="true" />
      {estado}
    </span>
  )
}
