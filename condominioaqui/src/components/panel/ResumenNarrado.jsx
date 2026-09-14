import { useState } from 'react'
import { Sparkles, Loader2, RefreshCw, Copy, Check } from 'lucide-react'
import { redactarResumenCuentaPublica } from '../../services/iaService'

// Redacta el párrafo de resumen de la Cuenta Pública a partir de las cifras que
// la página YA calculó.
//
// La regla que hace que esto sea seguro de usar frente a un concejo del condominio:
// **la IA no calcula nada**. Recibe los números terminados y solo los narra. Si
// inventara una cifra, terminaría dicha en voz alta por un Administrador, así que el
// prompt del servidor se lo prohíbe explícitamente y acá no se le manda nada
// que no esté ya en pantalla.
//
// Es a pedido, con un botón, y no automático: no tiene sentido gastar en un
// resumen cada vez que alguien abre la página para mirar un número.
export default function ResumenNarrado({ datos, periodo, nombreCondominio }) {
  const [texto, setTexto] = useState(null)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState(false)
  const [copiado, setCopiado] = useState(false)

  async function generar() {
    setGenerando(true)
    setError(false)
    const resultado = await redactarResumenCuentaPublica({
      condominio: nombreCondominio,
      periodo,
      ...datos,
    })
    if (resultado) {
      setTexto(resultado)
    } else {
      setError(true)
    }
    setGenerando(false)
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Sin permiso de portapapeles no pasa nada: el texto está en pantalla y
      // se puede seleccionar a mano.
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 print:border-gray-300">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-primary" />
          <h3 className="font-semibold text-gray-900">Resumen para leer en el concejo</h3>
        </div>

        {!generando && (
          <button
            type="button"
            onClick={generar}
            className="flex items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 print:hidden"
          >
            {texto ? <RefreshCw size={14} /> : <Sparkles size={14} />}
            {texto ? 'Rehacer' : 'Redactar'}
          </button>
       )}
      </div>

      {generando && (
        <p className="mt-3 flex items-center gap-2 text-sm text-gray-500">
          <Loader2 size={15} className="animate-spin" />
          Redactando con las cifras del período...
        </p>
     )}

      {!generando && !texto && !error && (
        <p className="mt-2 text-sm text-gray-500">
          Convierte las cifras de arriba en un párrafo para leer en voz alta. Usa solo estos
          números, no agrega ninguno.
        </p>
     )}

      {error && (
        <p className="mt-2 text-sm text-gray-500">
          No se pudo redactar el resumen en este momento. Las cifras de arriba están completas
          igual; puedes intentarlo de nuevo más tarde.
        </p>
     )}

      {texto && (
        <>
          <div className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-gray-800">{texto}</div>
          <div className="mt-3 flex items-center gap-3 print:hidden">
            <button
              type="button"
              onClick={copiar}
              className="flex items-center gap-1.5 text-sm font-medium text-primary transition-opacity hover:opacity-80"
            >
              {copiado ? <Check size={14} /> : <Copy size={14} />}
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
            <span className="text-xs text-gray-400">
              Redactado a partir de las cifras del período. Revísalo antes de leerlo en público.
            </span>
          </div>
        </>
     )}
    </div>
 )
}
