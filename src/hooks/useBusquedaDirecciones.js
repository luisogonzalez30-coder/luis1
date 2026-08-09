import { useEffect, useRef, useState } from 'react'
import { buscarDirecciones } from '../services/geocodificacionService'
import { buscarSectoresPorNombre } from '../utils/sectores'

// Mínimo de letras antes de salir a la red. Con menos, cualquier consulta
// devuelve ruido y gasta peticiones de la cuota de Nominatim.
const MIN_CARACTERES = 3

// Rebote: el vecino escribe en un teclado de celular, y sin esto cada letra
// dispararía una petición. 700 ms es lo que tarda en pensar la siguiente palabra
// y además respeta la política de 1 petición/segundo de Nominatim.
const MS_REBOTE = 700

// Busca direcciones mientras el vecino escribe, combinando dos fuentes:
//  - los sectores del municipio, que resuelven al instante y SIN red (ver
//    utils/sectores.js) — van primero porque en zona rural son lo único que
//    matchea;
//  - Nominatim/OpenStreetMap para calles y números (ver
//    services/geocodificacionService.js).
//
// `sinConexion` apaga solo la parte de red: los sectores siguen buscándose, así
// que el buscador conserva algo de utilidad en un celular sin señal de datos.
export function useBusquedaDirecciones({ texto, municipio, sinConexion = false }) {
  const [resultados, setResultados] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  // Distingue "todavía no busqué nada" de "busqué y no hay nada", que son dos
  // mensajes distintos en la UI (nada vs. "no encontramos esa dirección").
  const [busquedaHecha, setBusquedaHecha] = useState(false)

  // El objeto `municipio` se recrea en cada render de la página, pero su
  // contenido no cambia mientras el vecino está en el formulario: va por ref
  // para que la búsqueda dependa solo del texto y no se reinicie sola.
  const municipioRef = useRef(municipio)
  useEffect(() => {
    municipioRef.current = municipio
  }, [municipio])

  useEffect(() => {
    const consulta = (texto || '').trim()
    const sectores = buscarSectoresPorNombre(consulta, municipioRef.current?.sectores)

    if (consulta.length < MIN_CARACTERES) {
      setResultados(sectores)
      setCargando(false)
      setError(null)
      setBusquedaHecha(false)
      return
    }

    if (sinConexion) {
      setResultados(sectores)
      setCargando(false)
      setError(null)
      setBusquedaHecha(true)
      return
    }

    const control = new AbortController()
    // El spinner arranca junto con el rebote, no cuando sale la petición: al
    // vecino le importa saber que su tecleo fue registrado.
    setCargando(true)
    setResultados(sectores)

    const temporizador = setTimeout(async () => {
      try {
        const encontrados = await buscarDirecciones({
          texto: consulta,
          municipio: municipioRef.current,
          senal: control.signal,
        })
        if (control.signal.aborted) return
        // Los sectores locales van arriba: son los nombres que el vecino de la
        // comuna realmente usa para ubicarse.
        setResultados([...sectores, ...encontrados])
        setError(null)
      } catch (err) {
        if (control.signal.aborted || err.name === 'AbortError') return
        console.error('[useBusquedaDirecciones] Error al buscar la dirección:', err)
        setResultados(sectores)
        setError('No pudimos buscar la dirección. Revisa tu conexión, o toca el mapa para marcar el punto.')
      } finally {
        if (!control.signal.aborted) {
          setCargando(false)
          setBusquedaHecha(true)
        }
      }
    }, MS_REBOTE)

    return () => {
      clearTimeout(temporizador)
      control.abort()
    }
  }, [texto, sinConexion, municipio?.id])

  return { resultados, cargando, error, busquedaHecha }
}
