import { ESTADO_MANTENCION } from '../../utils/mantenciones'
import { ESTILO_POR_ESTADO } from './BadgeCumplimiento'

// Lo primero que ve el administrador al entrar, y lo que le muestra al comité en
// la rendición mensual. Un número y cuatro contadores.
//
// El porcentaje cuenta "por vencer" como cumplido, porque todavía lo está. Lo
// que no cuenta es "vencida" ni "sin registro" — un certificado que nadie cargó
// no sirve de nada ante una fiscalización, aunque el papel exista en un cajón.

const ORDEN_TARJETAS = [
  ESTADO_MANTENCION.VENCIDA,
  ESTADO_MANTENCION.SIN_REGISTRO,
  ESTADO_MANTENCION.POR_VENCER,
  ESTADO_MANTENCION.AL_DIA,
]

// El anillo de progreso se dibuja con un degradado cónico, no con una librería
// de gráficos: es un solo número y cargar recharts acá sería traerse 400 kB para
// pintar un círculo.
function colorDelPorcentaje(porcentaje) {
  if (porcentaje >= 90) return '#0ca30c'
  if (porcentaje >= 60) return '#fab219'
  return '#d03b3b'
}

export default function ResumenCumplimiento({ resumen, onFiltrar, filtroActivo }) {
  const color = colorDelPorcentaje(resumen.porcentaje)

  return (
    <section className="rounded-2xl border border-borde bg-white p-4 shadow-tarjeta sm:p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div
            className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full"
            style={{ background: `conic-gradient(${color} ${resumen.porcentaje * 3.6}deg, #e9e7e2 0deg)` }}
            role="img"
            aria-label={`${resumen.porcentaje}% de cumplimiento`}
          >
            <div className="grid h-[76px] w-[76px] place-items-center rounded-full bg-white">
              <span className="text-2xl font-bold" style={{ color }}>
                {resumen.porcentaje}%
              </span>
            </div>
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-semibold text-tinta-fuerte">Cumplimiento Ley 21.442</h2>
            <p className="mt-0.5 text-sm text-tinta-suave">
              {resumen[ESTADO_MANTENCION.VENCIDA] + resumen[ESTADO_MANTENCION.SIN_REGISTRO]} de {resumen.total}{' '}
              obligaciones sin respaldo vigente
            </p>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
          {ORDEN_TARJETAS.map((estado) => {
            const estilo = ESTILO_POR_ESTADO[estado]
            const activa = filtroActivo === estado
            return (
              <button
                key={estado}
                type="button"
                onClick={() => onFiltrar(activa ? null : estado)}
                aria-pressed={activa}
                className={`flex min-h-[64px] flex-col items-start justify-center gap-0.5 rounded-xl border px-3 py-2 text-left transition-colors
                  ${activa ? 'border-primary bg-primary/5' : 'border-borde bg-white hover:bg-tinta-fuerte/[0.03]'}`}
              >
                <span className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${estilo.puntoClases}`} aria-hidden="true" />
                  <span className="text-lg font-bold text-tinta-fuerte">{resumen[estado]}</span>
                </span>
                <span className="text-xs leading-tight text-tinta-suave">{estado}</span>
              </button>
           )
          })}
        </div>
      </div>
    </section>
 )
}
