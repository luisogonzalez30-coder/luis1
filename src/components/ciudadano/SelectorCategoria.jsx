import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, ChevronDown, X, Check } from 'lucide-react'
import { CATEGORIAS, agruparCategorias } from '../../utils/categorias'
import { colorDeGrupo } from '../../utils/coloresGrupo'

const GRUPOS = agruparCategorias(CATEGORIAS)

// Quita tildes y pasa a minúscula: el vecino escribe "arbol" o "semaforo" sin
// acentos, y igual tiene que encontrar "Árbol caído" y "Semáforo con falla".
function normalizar(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

// Reemplaza al <select> nativo, que en Android se dibujaba como una lista negra
// ajena a la app y obligaba a leer las 58 categorías de corrido. Acá el vecino
// puede escribir para buscar su problema, y cada grupo tiene su color (ver
// utils/coloresGrupo.js) para ubicarse sin leerlo todo.
export default function SelectorCategoria({ categoria, onCambiar }) {
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const campoBusqueda = useRef(null)

  const seleccionada = CATEGORIAS.find((c) => c.valor === categoria)

  useEffect(() => {
    if (abierto) campoBusqueda.current?.focus()
    else setBusqueda('')
  }, [abierto])

  // Cierra con Escape, como cualquier diálogo.
  useEffect(() => {
    if (!abierto) return
    const alPresionar = (e) => e.key === 'Escape' && setAbierto(false)
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [abierto])

  const gruposFiltrados = useMemo(() => {
    const texto = normalizar(busqueda.trim())
    if (!texto) return GRUPOS

    return GRUPOS
      .map((grupo) => {
        // Si el vecino escribe el nombre del grupo ("aseo"), se muestra entero.
        const coincideGrupo = normalizar(grupo.nombre).includes(texto)
        const items = coincideGrupo
          ? grupo.items
          : grupo.items.filter((c) => normalizar(c.etiqueta).includes(texto))
        return { ...grupo, items }
      })
      .filter((grupo) => grupo.items.length > 0)
  }, [busqueda])

  const totalResultados = gruposFiltrados.reduce((n, g) => n + g.items.length, 0)

  function elegir(valor) {
    onCambiar(valor)
    setAbierto(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-gray-300 bg-white p-3.5 text-left transition-shadow hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {seleccionada ? (
          <span className="flex min-w-0 items-center gap-2.5">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: colorDeGrupo(seleccionada.grupo) }}
              aria-hidden="true"
            />
            <span className="min-w-0">
              <span className="block truncate text-base text-gray-900">{seleccionada.etiqueta}</span>
              <span className="block truncate text-xs text-gray-400">{seleccionada.grupo}</span>
            </span>
          </span>
        ) : (
          <span className="text-base text-gray-500">Toca para elegir el problema</span>
        )}
        <ChevronDown size={20} className="shrink-0 text-gray-400" />
      </button>

      {abierto && (
        <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setAbierto(false)}>
          <div
            className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 p-4 pb-3">
              <h3 className="text-base font-semibold text-gray-900">¿Qué problema encontraste?</h3>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-4 pt-3">
              <div className="relative">
                <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={campoBusqueda}
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Escribe tu problema: bache, luz, basura..."
                  className="w-full rounded-2xl border border-gray-300 py-3 pl-10 pr-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="mt-2 flex-1 overflow-y-auto px-4 pb-4">
              {totalResultados === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  No encontramos nada con "{busqueda}". Prueba con otra palabra, o elige{' '}
                  <button type="button" onClick={() => elegir('Otro')} className="font-medium text-primary underline">
                    Otro
                  </button>{' '}
                  y descríbelo en el paso siguiente.
                </p>
              ) : (
                gruposFiltrados.map((grupo) => {
                  const color = colorDeGrupo(grupo.nombre)
                  return (
                    <div key={grupo.nombre} className="mt-3 first:mt-1">
                      <div className="flex items-center gap-2 px-1 py-1.5">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{grupo.nombre}</span>
                      </div>
                      <div className="overflow-hidden rounded-2xl border-l-4" style={{ borderLeftColor: color }}>
                        {grupo.items.map((cat) => {
                          const activa = cat.valor === categoria
                          return (
                            <button
                              key={cat.valor}
                              type="button"
                              onClick={() => elegir(cat.valor)}
                              className={`flex w-full items-center justify-between gap-2 border-b border-gray-100 px-3 py-3 text-left text-base transition-colors last:border-b-0
                                ${activa ? 'bg-primary/10 font-medium text-primary' : 'bg-gray-50/60 text-gray-700 active:bg-gray-100'}`}
                            >
                              <span>{cat.etiqueta}</span>
                              {activa && <Check size={18} className="shrink-0" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
