import { ShieldAlert, Wand2 } from 'lucide-react'
import { CATEGORIAS } from '../../utils/categorias'
import SelectorCategoria from './SelectorCategoria'

const MIN_DIRECCION = 3
const MIN_DETALLES = 5

// Paso 2. Los dos campos de texto pasaron de "opcional" a obligatorios el
// 02-ago-2026 (decisión del usuario, ver §29): saber el punto en el mapa no
// alcanza para que la cuadrilla llegue al lugar exacto ni para dimensionar el
// trabajo antes de salir.
export default function PasoCategoria({ categoria, direccionTexto, detallesAdicionales, direccionAutocompletada = false, onCambiarCategoria, onCambiarDireccion, onCambiarDetalles }) {
  const categoriaSeleccionada = CATEGORIAS.find((cat) => cat.valor === categoria)

  const direccionCorta = direccionTexto.trim().length > 0 && direccionTexto.trim().length < MIN_DIRECCION
  const detallesCortos = detallesAdicionales.trim().length > 0 && detallesAdicionales.trim().length < MIN_DETALLES

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-tinta-fuerte">¿Qué problema encontraste?</h2>
        <p className="mt-1 text-sm font-medium text-tinta-suave">
          Elige el área y después el problema, o búscalo escribiendo.
        </p>
      </div>

      <SelectorCategoria categoria={categoria} onCambiar={onCambiarCategoria} />

      {categoriaSeleccionada?.avisoSeguridad && (
        <div className="flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-100">
          <ShieldAlert size={18} className="mt-0.5 shrink-0" />
          <span>
            Este formulario informa a la municipalidad, <strong>no reemplaza una denuncia policial</strong>.
            Si es una emergencia o un delito en curso, llama al <strong>133</strong> (Carabineros).
            Para denunciar de forma anónima, usa <strong>Denuncia Segura</strong> (*4242).
          </span>
        </div>
      )}

      <div>
        <label className="etiqueta-campo">¿Dónde exactamente?</label>
        <input
          type="text"
          value={direccionTexto}
          onChange={(e) => onCambiarDireccion(e.target.value)}
          placeholder="Ej: Pasando el puente, frente a la escuela"
          className={`campo ${direccionCorta ? 'campo-error' : ''}`}
        />
        {/* Cuando el texto lo puso la app (dirección del punto marcado en el
            Paso 1), hay que decirlo: si no, el vecino cree que ese campo ya
            está resuelto y no le agrega la referencia que la cuadrilla
            necesita para encontrar el problema dentro de la cuadra. */}
        {direccionAutocompletada && !direccionCorta ? (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-primary">
            <Wand2 size={13} className="mt-0.5 shrink-0" />
            <span>
              La completamos con la dirección del punto que marcaste. Corrígela si no calza, y agrégale una
              referencia ("frente a la escuela").
            </span>
          </p>
        ) : (
          <p className={`mt-1.5 text-xs ${direccionCorta ? 'font-medium text-rose-600' : 'text-tinta-suave'}`}>
            Una referencia que ayude a la cuadrilla a llegar al lugar exacto.
          </p>
        )}
      </div>

      <div>
        <label className="etiqueta-campo">Cuéntanos qué pasa</label>
        <textarea
          value={detallesAdicionales}
          onChange={(e) => onCambiarDetalles(e.target.value)}
          placeholder="Ej: Lleva 2 semanas así, afecta el paso de sillas de ruedas..."
          rows={3}
          className={`campo resize-none ${detallesCortos ? 'campo-error' : ''}`}
        />
        <p className={`mt-1.5 text-xs ${detallesCortos ? 'font-medium text-rose-600' : 'text-tinta-suave'}`}>
          Mientras más nos cuentes, mejor preparada llega la cuadrilla.
        </p>
      </div>
    </div>
  )
}
