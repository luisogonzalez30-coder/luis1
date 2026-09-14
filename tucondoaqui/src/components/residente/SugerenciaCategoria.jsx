import { Sparkles, Check, X } from 'lucide-react'
import { CATEGORIAS } from '../../utils/categorias'

// Aviso que aparece cuando, mirando la foto, la categoría elegida no parece la
// que corresponde.
//
// Por qué esto existe: el residente elige entre 58 categorías repartidas en 9
// grupos, y esa elección decide sola la gravedad, el área y a quién le
// llega el reporte (el catálogo de categorías). O sea que el punto de mayor fricción del
// formulario es también el que gobierna todo el ruteo. Ya hay evidencia de que
// falla: un reporte que dice "Reja rota" puede quedar
// categorizado como **Árbol caído**, que lo manda al área equivocado.
//
// Dos decisiones que hacen que esto no pueda hacer daño:
//
//   1. **Propone, no corrige.** La categoría no cambia sola nunca. Si el residente
//      no toca nada, se manda lo que él eligió. Un error de la IA cuesta un
//      aviso ignorado, no un reporte mal clasificado.
//   2. **Solo aparece cuando discrepa.** Si coincide con lo elegido no se
//      muestra nada: un aviso que aparece siempre se vuelve invisible.
export default function SugerenciaCategoria({ sugerencia, categoriaElegida, onAceptar, onDescartar }) {
  if (!sugerencia) return null
  if (sugerencia.categoria === categoriaElegida) return null

  // Con confianza baja no se molesta al residente: el modelo mismo está diciendo
  // que no está seguro, y un aviso dudoso es peor que ningún aviso.
  if (sugerencia.confianza === 'baja') return null

  const elegida = CATEGORIAS.find((c) => c.valor === categoriaElegida)

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-start gap-2">
        <Sparkles size={18} className="mt-0.5 shrink-0 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">
            Por la foto, esto parece <span className="text-primary">{sugerencia.etiqueta}</span>
          </p>

          {sugerencia.motivo && <p className="mt-1 text-sm text-gray-600">{sugerencia.motivo}</p>}

          <p className="mt-2 text-xs text-gray-500">
            Tú lo marcaste como <strong>{elegida?.etiqueta || categoriaElegida}</strong>. Si te
            equivocaste, cámbialo acá — si no, déjalo así y sigue.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onAceptar(sugerencia.categoria)}
              className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <Check size={15} />
              Sí, cambiar
            </button>
            <button
              type="button"
              onClick={onDescartar}
              className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              <X size={15} />
              Dejarlo así
            </button>
          </div>
        </div>
      </div>
    </div>
 )
}
