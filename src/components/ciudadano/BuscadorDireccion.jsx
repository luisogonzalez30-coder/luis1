import { useEffect, useRef, useState } from 'react'
import { Search, X, Loader2, MapPin, Landmark, WifiOff } from 'lucide-react'
import { useBusquedaDirecciones } from '../../hooks/useBusquedaDirecciones'

// Tercera forma de fijar la ubicación en el Paso 1, junto al GPS y al toque
// directo en el mapa: el vecino escribe su dirección y la elige de una lista.
//
// Por qué hace falta, teniendo GPS: el GPS falla justo donde más se reporta
// —adentro de la casa, con el celular sin señal, o en un celular viejo que da
// 200 m de error— y buscar el punto en el mapa a mano exige saber leerlo. Poder
// escribir "Los Aromos 320" es la forma en que un adulto mayor ubica un lugar.
//
// Los resultados vienen de dos fuentes (ver useBusquedaDirecciones.js): los
// sectores del propio municipio, que funcionan sin red, y OpenStreetMap para
// calles y números.
export default function BuscadorDireccion({ municipio, sinConexion = false, onElegir }) {
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [resaltado, setResaltado] = useState(-1)
  const contenedor = useRef(null)
  const campo = useRef(null)

  const { resultados, cargando, error, busquedaHecha } = useBusquedaDirecciones({
    texto,
    municipio,
    sinConexion,
  })

  // Cierra la lista al tocar fuera, como cualquier autocompletado. Va en
  // mousedown/touchstart (no click) para que cerrar no dispare de rebote el
  // botón que hay debajo.
  useEffect(() => {
    if (!abierto) return
    const alTocarFuera = (evento) => {
      if (!contenedor.current?.contains(evento.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', alTocarFuera)
    document.addEventListener('touchstart', alTocarFuera)
    return () => {
      document.removeEventListener('mousedown', alTocarFuera)
      document.removeEventListener('touchstart', alTocarFuera)
    }
  }, [abierto])

  // Si cambian los resultados, el resaltado del teclado vuelve al inicio: si no,
  // Enter podría elegir una dirección que ya no está en la lista.
  useEffect(() => {
    setResaltado(-1)
  }, [resultados])

  function elegir(resultado) {
    onElegir(resultado)
    // Se deja escrita la dirección elegida: es la confirmación de qué se buscó,
    // y permite corregir sobre lo ya escrito en vez de empezar de nuevo.
    setTexto(resultado.etiqueta)
    setAbierto(false)
    campo.current?.blur()
  }

  function limpiar() {
    setTexto('')
    setAbierto(false)
    campo.current?.focus()
  }

  function alPresionarTecla(evento) {
    if (evento.key === 'Escape') {
      setAbierto(false)
      return
    }
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      if (!resultados.length) return
      evento.preventDefault()
      setAbierto(true)
      setResaltado((actual) => {
        const paso = evento.key === 'ArrowDown' ? 1 : -1
        return (actual + paso + resultados.length) % resultados.length
      })
      return
    }
    if (evento.key === 'Enter') {
      // Enter con algo resaltado elige; sin nada resaltado, el primer resultado
      // (que es el más cercano al centro de la comuna).
      const elegido = resultados[resaltado] || resultados[0]
      if (elegido) {
        evento.preventDefault()
        elegir(elegido)
      }
    }
  }

  const mostrarLista = abierto && (resultados.length > 0 || cargando || error || busquedaHecha)
  const sinResultados = busquedaHecha && !cargando && !error && resultados.length === 0

  return (
    <div ref={contenedor} className="relative">
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta-tenue" />
        <input
          ref={campo}
          type="text"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            setAbierto(true)
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={alPresionarTecla}
          placeholder="Escribe tu dirección: calle y número"
          // search: el teclado del celular muestra la tecla "Buscar" en vez de
          // "Ir", y el autocorrector no pelea con nombres de calle.
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={mostrarLista}
          aria-controls="lista-direcciones"
          aria-autocomplete="list"
          aria-label="Buscar dirección"
          className="min-h-[48px] w-full rounded-2xl border border-borde py-3 pl-10 pr-10 text-base transition-shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {cargando ? (
          <Loader2 size={18} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-primary" />
        ) : texto ? (
          <button
            type="button"
            onClick={limpiar}
            aria-label="Borrar la dirección escrita"
            className="absolute right-1 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full text-tinta-tenue transition-colors hover:bg-slate-100 hover:text-tinta"
          >
            <X size={18} />
          </button>
        ) : null}
      </div>

      {mostrarLista && (
        // z-[1100]: por encima del mapa de Leaflet, cuyo contenedor y controles
        // llegan hasta z-1000 (ver MapaSeleccionUbicacion.jsx).
        <div
          id="lista-direcciones"
          role="listbox"
          className="absolute left-0 right-0 top-full z-[1100] mt-1 max-h-64 overflow-y-auto rounded-2xl border border-borde bg-white shadow-flotante"
        >
          {resultados.map((resultado, i) => (
            <button
              key={resultado.id}
              type="button"
              role="option"
              aria-selected={i === resaltado}
              onClick={() => elegir(resultado)}
              className={`flex min-h-[52px] w-full items-center gap-3 border-b border-borde px-3.5 py-2.5 text-left transition-colors last:border-b-0
                ${i === resaltado ? 'bg-primary/10' : 'bg-white active:bg-tinta-fuerte/[0.04]'}`}
            >
              {resultado.origen === 'sector' ? (
                <Landmark size={18} className="shrink-0 text-primary" />
              ) : (
                <MapPin size={18} className="shrink-0 text-tinta-tenue" />
              )}
              <span className="min-w-0">
                <span className="block truncate text-base text-tinta-fuerte">{resultado.etiqueta}</span>
                {resultado.detalle && (
                  <span className="block truncate text-xs text-tinta-suave">{resultado.detalle}</span>
                )}
              </span>
            </button>
          ))}

          {cargando && resultados.length === 0 && (
            <p className="px-3.5 py-4 text-sm text-tinta-suave">Buscando direcciones...</p>
          )}

          {error && <p className="px-3.5 py-3 text-sm text-rose-700">{error}</p>}

          {sinResultados && (
            <p className="px-3.5 py-4 text-sm text-tinta-suave">
              {sinConexion ? (
                <span className="flex items-start gap-2">
                  <WifiOff size={16} className="mt-0.5 shrink-0" />
                  Sin conexión no podemos buscar direcciones. Usa el GPS o toca el mapa para marcar el punto.
                </span>
              ) : (
                <>
                  No encontramos "{texto.trim()}" en la comuna. Prueba con la calle y el número, con el
                  nombre del sector, o toca el mapa para marcar el punto a mano.
                </>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
