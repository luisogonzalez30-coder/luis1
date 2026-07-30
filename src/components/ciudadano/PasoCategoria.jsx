import { ShieldAlert } from 'lucide-react'
import { CATEGORIAS, agruparCategorias } from '../../utils/categorias'

const GRUPOS_CATEGORIAS = agruparCategorias(CATEGORIAS)

export default function PasoCategoria({ categoria, direccionTexto, detallesAdicionales, onCambiarCategoria, onCambiarDireccion, onCambiarDetalles }) {
  const categoriaSeleccionada = CATEGORIAS.find((cat) => cat.valor === categoria)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">2. ¿Qué problema encontraste?</h2>
        <p className="text-sm text-gray-500">Selecciona la categoría que mejor describe la incidencia.</p>
      </div>

      <select
        value={categoria}
        onChange={(e) => onCambiarCategoria(e.target.value)}
        className="w-full rounded-xl border border-gray-300 p-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <option value="">Selecciona una categoría</option>
        {GRUPOS_CATEGORIAS.map((grupo) => (
          <optgroup key={grupo.nombre} label={grupo.nombre}>
            {grupo.items.map((cat) => (
              <option key={cat.valor} value={cat.valor}>
                {cat.etiqueta}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {categoriaSeleccionada?.avisoSeguridad && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          <ShieldAlert size={18} className="mt-0.5 shrink-0" />
          <span>
            Este formulario informa a la municipalidad, <strong>no reemplaza una denuncia policial</strong>.
            Si es una emergencia o un delito en curso, llama al <strong>133</strong> (Carabineros).
            Para denunciar de forma anónima, usa <strong>Denuncia Segura</strong> (*4242).
          </span>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Referencias de ubicación (opcional)
        </label>
        <input
          type="text"
          value={direccionTexto}
          onChange={(e) => onCambiarDireccion(e.target.value)}
          placeholder="Ej: Pasando el puente, frente a la escuela"
          className="w-full rounded-xl border border-gray-300 p-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Detalles adicionales (opcional)
        </label>
        <textarea
          value={detallesAdicionales}
          onChange={(e) => onCambiarDetalles(e.target.value)}
          placeholder="Ej: Lleva 2 semanas así, afecta el paso de sillas de ruedas..."
          rows={3}
          className="w-full resize-none rounded-xl border border-gray-300 p-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
    </div>
  )
}
