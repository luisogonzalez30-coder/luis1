import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, ChevronDown, X, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { CATEGORIAS, agruparCategorias } from '../../utils/categorias'
import { colorDeGrupo } from '../../utils/coloresGrupo'
import { iconoDeGrupo } from '../../utils/iconosGrupo'

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
// ajena a la app y obligaba a leer las 58 categorías de corrido.
//
// REDISEÑO 02-sep-2026: la hoja pasó a tener DOS NIVELES.
//
//   Nivel 1: los 9 grupos como cuadrícula de 2 columnas, con su ícono en un
//            disco del color del grupo. Es lo que pedía el rediseño (tarjetas
//            táctiles, íconos con fondo circular temático).
//   Nivel 2: las categorías de ese grupo, como lista.
//
// Se hizo en dos niveles y NO como una cuadrícula plana de las 58 categorías,
// que es lo que saldría de aplicar la instrucción al pie de la letra: 58
// tarjetas en 2 columnas son 29 filas de scroll, o sea exactamente el problema
// que la hoja vino a resolver cuando reemplazó al <select> (§29). Con 9 grupos
// la cuadrícula cabe casi entera en una pantalla, que es cuando una cuadrícula
// sirve de algo.
//
// La búsqueda sigue cortando transversalmente: escribir "bache" salta directo a
// los resultados sin pasar por los grupos, así que quien ya sabe lo que busca
// no paga el nivel extra.
export default function SelectorCategoria({ categoria, onCambiar }) {
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [grupoAbierto, setGrupoAbierto] = useState(null)
  const campoBusqueda = useRef(null)

  const seleccionada = CATEGORIAS.find((c) => c.valor === categoria)

  useEffect(() => {
    if (abierto) {
      // NO se enfoca el buscador al abrir, a diferencia de la versión anterior.
      // Antes tenía sentido porque el cuerpo era una lista larga y escribir era
      // la salida rápida; ahora el nivel 1 es una cuadrícula que cabe casi
      // entera en pantalla, y abrir el teclado la taparía justo cuando lo que
      // se quiere es que el vecino la vea. El campo sigue ahí para quien
      // prefiera escribir.
      //
      // Al abrir se muestra la cuadrícula de grupos, salvo que ya haya una
      // categoría elegida: ahí se entra directo a su grupo, para que cambiarla
      // por una vecina no cueste dos toques.
      setGrupoAbierto(seleccionada?.grupo ?? null)
    } else {
      setBusqueda('')
      setGrupoAbierto(null)
    }
    // Solo debe correr al abrir/cerrar, no cada vez que cambia la selección.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  // Cierra con Escape; si hay un grupo abierto, primero vuelve a la cuadrícula.
  useEffect(() => {
    if (!abierto) return
    const alPresionar = (e) => {
      if (e.key !== 'Escape') return
      if (grupoAbierto && !busqueda) setGrupoAbierto(null)
      else setAbierto(false)
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [abierto, grupoAbierto, busqueda])

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

  // Qué se muestra en el cuerpo de la hoja. La búsqueda gana siempre: si hay
  // texto escrito, no importa en qué nivel estabas.
  const buscando = busqueda.trim().length > 0
  const grupoActivo = !buscando && grupoAbierto ? GRUPOS.find((g) => g.nombre === grupoAbierto) : null

  function elegir(valor) {
    onCambiar(valor)
    setAbierto(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-borde bg-white p-3.5 text-left transition-shadow hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
      >
        {seleccionada ? (
          <span className="flex min-w-0 items-center gap-3">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white"
              style={{ backgroundColor: colorDeGrupo(seleccionada.grupo) }}
              aria-hidden="true"
            >
              {(() => {
                const Icono = iconoDeGrupo(seleccionada.grupo)
                return <Icono size={18} />
              })()}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-semibold text-tinta-fuerte">{seleccionada.etiqueta}</span>
              <span className="block truncate text-xs text-tinta-suave">{seleccionada.grupo}</span>
            </span>
          </span>
        ) : (
          <span className="text-base text-tinta-suave">Toca para elegir el problema</span>
        )}
        <ChevronDown size={20} className="shrink-0 text-tinta-tenue" />
      </button>

      {abierto && (
        <div
          // Velo oscuro + desenfoque: el vecino elige esto de pie en la calle,
          // muchas veces con sol. Apagar el fondo es lo que hace que las 58
          // opciones se lean rápido en vez de competir con el formulario.
          className="animar-velo fixed inset-0 z-[2000] flex items-end justify-center bg-tinta-fuerte/60 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setAbierto(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Elegir el problema"
            className="animar-hoja flex max-h-[88vh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-flotante sm:max-h-[85vh] sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-tinta-tenue/40 sm:hidden" />

            <div className="flex items-center gap-1 border-b border-borde px-3 pb-3 pt-3">
              {grupoActivo && (
                <button
                  type="button"
                  onClick={() => setGrupoAbierto(null)}
                  className="toque shrink-0 rounded-full text-tinta-suave transition-colors hover:bg-tinta-fuerte/5 hover:text-tinta-fuerte"
                  aria-label="Volver a las categorías"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <h3 className={`min-w-0 flex-1 truncate text-base font-bold tracking-tight text-tinta-fuerte ${grupoActivo ? '' : 'pl-1.5'}`}>
                {grupoActivo ? grupoActivo.nombre : '¿Qué problema encontraste?'}
              </h3>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="toque shrink-0 rounded-full text-tinta-suave transition-colors hover:bg-tinta-fuerte/5 hover:text-tinta-fuerte"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-4 pt-3">
              <div className="relative">
                <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tinta-tenue" />
                <input
                  ref={campoBusqueda}
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Escribe tu problema: bache, luz, basura..."
                  className="campo pl-11"
                />
              </div>
            </div>

            <div className="mt-3 flex-1 overflow-y-auto px-4 pb-5">
              {/* --- Nivel 1: cuadrícula de grupos --- */}
              {!buscando && !grupoActivo && (
                <ul className="grid grid-cols-2 gap-2.5">
                  {GRUPOS.map((grupo) => {
                    const color = colorDeGrupo(grupo.nombre)
                    const Icono = iconoDeGrupo(grupo.nombre)
                    const contieneLaElegida = seleccionada?.grupo === grupo.nombre

                    return (
                      <li key={grupo.nombre}>
                        <button
                          type="button"
                          onClick={() => setGrupoAbierto(grupo.nombre)}
                          className={`flex h-full w-full flex-col items-start gap-2.5 rounded-2xl p-3.5 text-left transition-all active:scale-[0.98]
                            ${contieneLaElegida
                              ? 'border-2 border-primary bg-primary/[0.06]'
                              : 'border-2 border-borde bg-white hover:border-primary/40 hover:bg-slate-50'}`}
                        >
                          {/* Disco de color del grupo. El ícono va en blanco
                              encima del color pleno: sobre el color al 10% (que
                              es lo habitual en este patrón) los tonos claros de
                              la paleta —el rosa, el amarillo— quedaban casi
                              invisibles al sol. */}
                          <span
                            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white shadow-tarjeta"
                            style={{ backgroundColor: color }}
                            aria-hidden="true"
                          >
                            <Icono size={21} />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold leading-snug text-tinta-fuerte">
                              {grupo.nombre}
                            </span>
                            <span className="mt-0.5 block text-xs text-tinta-suave">
                              {grupo.items.length} {grupo.items.length === 1 ? 'opción' : 'opciones'}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}

              {/* --- Nivel 2: categorías del grupo elegido --- */}
              {grupoActivo && (
                <ListaCategorias
                  items={grupoActivo.items}
                  color={colorDeGrupo(grupoActivo.nombre)}
                  categoria={categoria}
                  onElegir={elegir}
                />
              )}

              {/* --- Búsqueda: resultados planos, agrupados por color --- */}
              {buscando &&
                (totalResultados === 0 ? (
                  <p className="py-8 text-center text-sm text-tinta-suave">
                    No encontramos nada con "{busqueda}". Prueba con otra palabra, o elige{' '}
                    <button type="button" onClick={() => elegir('Otro')} className="font-semibold text-primary underline">
                      Otro
                    </button>{' '}
                    y descríbelo en el paso siguiente.
                  </p>
                ) : (
                  gruposFiltrados.map((grupo) => {
                    const color = colorDeGrupo(grupo.nombre)
                    const Icono = iconoDeGrupo(grupo.nombre)
                    return (
                      <div key={grupo.nombre} className="mt-4 first:mt-0">
                        <div className="flex items-center gap-2 px-1 pb-2">
                          <span
                            className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-white"
                            style={{ backgroundColor: color }}
                            aria-hidden="true"
                          >
                            <Icono size={13} />
                          </span>
                          <span className="text-xs font-semibold uppercase tracking-wide text-tinta-suave">
                            {grupo.nombre}
                          </span>
                        </div>
                        <ListaCategorias items={grupo.items} color={color} categoria={categoria} onElegir={elegir} />
                      </div>
                    )
                  })
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Lista de categorías de un grupo. La barra de color a la izquierda es la que
// mantiene visible a qué grupo pertenece lo que se está mirando cuando ya se
// bajó y el encabezado quedó fuera de pantalla.
function ListaCategorias({ items, color, categoria, onElegir }) {
  return (
    <div className="overflow-hidden rounded-2xl border-l-4 ring-1 ring-borde" style={{ borderLeftColor: color }}>
      {items.map((cat) => {
        const activa = cat.valor === categoria
        return (
          <button
            key={cat.valor}
            type="button"
            onClick={() => onElegir(cat.valor)}
            // min-h-[48px]: área táctil cómoda para el pulgar, que es como se
            // usa esto en la calle.
            className={`flex min-h-[48px] w-full items-center justify-between gap-2 border-b border-borde px-3.5 py-3 text-left text-base transition-colors last:border-b-0
              ${activa ? 'bg-primary/10 font-semibold text-primary' : 'bg-white text-tinta active:bg-slate-50'}`}
          >
            <span>{cat.etiqueta}</span>
            {activa ? (
              <Check size={18} className="shrink-0" />
            ) : (
              <ChevronRight size={16} className="shrink-0 text-tinta-tenue" aria-hidden="true" />
            )}
          </button>
        )
      })}
    </div>
  )
}
