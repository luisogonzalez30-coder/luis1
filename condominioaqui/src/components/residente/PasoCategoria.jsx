import { ShieldAlert, Wand2 } from 'lucide-react'
import { CATEGORIAS } from '../../utils/categorias'
import SelectorCategoria from './SelectorCategoria'

const MIN_DIRECCION = 3
const MIN_DETALLES = 5

// Paso 2. Los dos campos de texto pasaron de "opcional" a obligatorios el
// 02-ago-2026 (decisión del usuario): saber el punto en el mapa no
// alcanza para que el equipo llegue al lugar exacto ni para dimensionar el
// trabajo antes de salir.
export default function PasoCategoria({ categoria, direccionTexto, detallesAdicionales, direccionAutocompletada = false, onCambiarCategoria, onCambiarDireccion, onCambiarDetalles }) {
  const categoriaSeleccionada = CATEGORIAS.find((cat) => cat.valor === categoria)

  const direccionCorta = direccionTexto.trim().length > 0 && direccionTexto.trim().length < MIN_DIRECCION
  const detallesCortos = detallesAdicionales.trim().length > 0 && detallesAdicionales.trim().length < MIN_DETALLES

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">2. ¿Qué problema encontraste?</h2>
        <p className="text-sm text-gray-500">Busca tu problema por nombre o elígelo de la lista por color.</p>
      </div>

      <SelectorCategoria categoria={categoria} onCambiar={onCambiarCategoria} />

      {categoriaSeleccionada?.avisoSeguridad && (
        <div className="flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
          <ShieldAlert size={18} className="mt-0.5 shrink-0" />
          <span>
            Esto avisa a la administración y a conserjería, <strong>no reemplaza una llamada de
            emergencia</strong>. Si hay riesgo para alguien, llama primero al <strong>133</strong>
            (Carabineros) o al <strong>132</strong> (Bomberos), y deja el registro acá después.
          </span>
        </div>
     )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Referencia exacta (opcional, pero ayuda)</label>
        <input
          type="text"
          value={direccionTexto}
          onChange={(e) => onCambiarDireccion(e.target.value)}
          placeholder="Ej: Pasando el puente, frente a la escuela"
          className={`w-full rounded-2xl border p-3 text-base transition-shadow focus:outline-none focus:ring-2 ${
            direccionCorta ? 'border-red-400 focus:ring-red-200' : 'border-gray-300 focus:border-primary focus:ring-primary/30'
          }`}
        />
        {/* Cuando el texto lo puso la app (dirección del punto marcado en el
            Paso 1), hay que decirlo: si no, el residente cree que ese campo ya
            está resuelto y no le agrega la referencia que el equipo
            necesita para encontrar el problema dentro de la cuadra. */}
        {direccionAutocompletada && !direccionCorta ? (
          <p className="mt-1 flex items-start gap-1.5 text-xs text-primary">
            <Wand2 size={13} className="mt-0.5 shrink-0" />
            <span>
              La completamos con la dirección del punto que marcaste. Corrígela si no calza, y agrégale una
              referencia ("frente a la escuela").
            </span>
          </p>
       ) : (
          <p className={`mt-1 text-xs ${direccionCorta ? 'text-red-600' : 'text-gray-400'}`}>
            Una referencia que ayude a el equipo a llegar al lugar exacto.
          </p>
       )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Cuéntanos qué pasa</label>
        <textarea
          value={detallesAdicionales}
          onChange={(e) => onCambiarDetalles(e.target.value)}
          placeholder="Ej: Lleva 2 semanas así, afecta el paso de sillas de ruedas..."
          rows={3}
          className={`w-full resize-none rounded-2xl border p-3 text-base transition-shadow focus:outline-none focus:ring-2 ${
            detallesCortos ? 'border-red-400 focus:ring-red-200' : 'border-gray-300 focus:border-primary focus:ring-primary/30'
          }`}
        />
        <p className={`mt-1 text-xs ${detallesCortos ? 'text-red-600' : 'text-gray-400'}`}>
          Mientras más nos cuentes, mejor preparada llega el equipo.
        </p>
      </div>
    </div>
 )
}
