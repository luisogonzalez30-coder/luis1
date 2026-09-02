import { COLOR_POR_GRAVEDAD } from '../../utils/gravedad'

// Gravedad del problema (triage automático por categoría). Convive con
// BadgeEstado en la misma tarjeta, así que a propósito se ve DISTINTA: contorno
// neutro sobre blanco, no píldora rellena de color.
//
// El motivo es que son dos escalas independientes —cuán urgente es el problema
// vs. en qué punto del trabajo va— y con el mismo tratamiento visual se leen
// como una sola. El caso feo concreto: un reporte "Resuelto" de "Gravedad Alta"
// mostraría una píldora verde y una roja lado a lado, que parece una
// contradicción y no lo es.
//
// EL COLOR VA EN EL PUNTO, NO EN EL TEXTO. Se intentó al revés y no se puede:
// el amarillo de "Media" (#fab219) sobre blanco da ~1.8:1 de contraste, o sea
// ilegible — la propia paleta de la skill dataviz advierte que ese amarillo
// tiene bajo contraste por diseño y nunca debe cargar solo con el significado.
// El punto identifica y el texto en tinta se lee; es la regla de la skill
// ("el texto usa tokens de texto, nunca el color de la serie").
//
// El valor sale de utils/gravedad.js —la misma paleta que pintan los pines del
// mapa y las barras del gráfico— y no de las clases de Tailwind: así el rojo
// del badge y el del pin del mismo reporte son el mismo valor, en vez de dos
// rojos parecidos.
export default function BadgeGravedad({ nivel }) {
  if (!nivel) return null

  const color = COLOR_POR_GRAVEDAD[nivel]

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-tinta ring-1 ring-inset ring-borde">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      Gravedad {nivel}
    </span>
  )
}
