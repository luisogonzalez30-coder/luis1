import { useEffect, useState } from 'react'
import { obtenerDireccionAproximada } from '../services/geocodificacionService'

// Rebote generoso a propósito: mientras el vecino arrastra el pin las
// coordenadas cambian decenas de veces, y acá solo interesa dónde lo suelta.
const MS_REBOTE = 900

// Dado un punto del mapa, averigua qué dirección es (geocodificación inversa).
// Sirve para dos cosas: confirmarle al vecino que el pin quedó donde cree que
// lo puso, y llegar al Paso 2 con "¿Dónde exactamente?" ya escrito.
//
// Es un extra, nunca un requisito: si falla la red, si el navegador está sin
// conexión o si el punto cae en campo abierto (Nominatim contesta solo la
// región), devuelve null y no se muestra ni se avisa nada — el reporte se envía
// igual con las coordenadas, que es el dato que de verdad importa.
//
// `activo` en false apaga la consulta sin desmontar nada: se usa cuando el
// vecino eligió la dirección en el buscador y por lo tanto ya sabemos cómo se
// llama el punto — preguntárselo de vuelta a Nominatim gastaría una petición de
// la cuota para llegar al mismo nombre, o a uno peor.
export function useDireccionInversa(coordenadas, { activo = true } = {}) {
  const [direccion, setDireccion] = useState(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    if (!activo || typeof coordenadas?.lat !== 'number' || typeof coordenadas?.lng !== 'number') {
      setDireccion(null)
      setCargando(false)
      return
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setDireccion(null)
      setCargando(false)
      return
    }

    const control = new AbortController()
    // Se limpia la dirección anterior de inmediato: dejarla puesta mientras se
    // resuelve la nueva le mostraría al vecino una dirección que ya no
    // corresponde al pin que acaba de mover.
    setDireccion(null)
    setCargando(true)

    const temporizador = setTimeout(async () => {
      try {
        const encontrada = await obtenerDireccionAproximada({ coordenadas, senal: control.signal })
        if (!control.signal.aborted) setDireccion(encontrada)
      } catch (err) {
        if (control.signal.aborted || err.name === 'AbortError') return
        console.error('[useDireccionInversa] No se pudo obtener la dirección del punto:', err)
        setDireccion(null)
      } finally {
        if (!control.signal.aborted) setCargando(false)
      }
    }, MS_REBOTE)

    return () => {
      clearTimeout(temporizador)
      control.abort()
    }
  }, [coordenadas?.lat, coordenadas?.lng, activo])

  return { direccion, cargando }
}
