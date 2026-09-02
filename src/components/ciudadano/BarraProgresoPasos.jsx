import { Check } from 'lucide-react'

// Barra de progreso segmentada del formulario ciudadano.
//
// Reemplaza a tres barritas iguales sin etiqueta, que decían "vas por algún
// lado" pero no cuántos pasos faltaban ni qué venía después. En un formulario
// que se abandona a la mitad, saber que quedan dos pasos cortos es lo que hace
// la diferencia entre seguir y cerrar.
//
// Tres decisiones que valen el comentario:
//
//  1. **El segmento se llena, no se mueve el layout.** El relleno es un
//     `scale-x` sobre un hijo absoluto, no un cambio de ancho del contenedor:
//     así el texto de abajo no salta y el pulgar no pierde el punto donde iba.
//  2. **El paso hecho muestra un ✓, no un número.** El número ya se sabe; lo
//     que el vecino necesita ver es qué queda pendiente.
//  3. **Etiquetas visibles siempre, no solo la del paso actual.** Es lo que
//     convierte la barra en un mapa del trámite completo. Caben porque son tres
//     palabras cortas; con cinco pasos habría que ocultarlas en móvil.
//
// El orden de los pasos lo decide quien la usa (`pasos`), no este componente.
export default function BarraProgresoPasos({ pasos, pasoActual }) {
  const total = pasos.length

  return (
    <nav aria-label="Progreso del reporte">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Paso {pasoActual} de {total}
        </p>
        <p className="text-xs font-medium text-tinta-suave">{pasos[pasoActual - 1]?.etiqueta}</p>
      </div>

      <ol className="flex items-center gap-1.5">
        {pasos.map((paso, indice) => {
          const numero = indice + 1
          const completado = numero < pasoActual
          const actual = numero === pasoActual

          return (
            <li key={paso.etiqueta} className="flex-1">
              <div
                className="relative h-1.5 overflow-hidden rounded-full bg-slate-200"
                // El estado real del paso viaja en aria, no en el color: un
                // lector de pantalla no ve el relleno.
                aria-current={actual ? 'step' : undefined}
              >
                <span
                  className={`absolute inset-0 origin-left rounded-full bg-gradient-to-r from-primary to-primary-dark
                    transition-transform duration-500 ease-out
                    ${completado || actual ? 'scale-x-100' : 'scale-x-0'}`}
                />
                {/* Barrido de brillo, solo sobre el segmento activo: confirma el
                    avance sin desplazar nada. */}
                {actual && (
                  <span
                    key={pasoActual}
                    className="absolute inset-y-0 w-1/2 animate-brillo-progreso bg-gradient-to-r from-transparent via-white/60 to-transparent"
                    aria-hidden="true"
                  />
                )}
              </div>

              <p
                className={`mt-1.5 flex items-center gap-1 text-[11px] leading-tight transition-colors
                  ${actual ? 'font-semibold text-tinta-fuerte' : completado ? 'font-medium text-tinta-suave' : 'text-tinta-tenue'}`}
              >
                {completado && <Check size={11} strokeWidth={3} className="shrink-0 text-primary" aria-hidden="true" />}
                <span className="truncate">{paso.etiqueta}</span>
                <span className="sr-only">{completado ? '(completado)' : actual ? '(paso actual)' : '(pendiente)'}</span>
              </p>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
