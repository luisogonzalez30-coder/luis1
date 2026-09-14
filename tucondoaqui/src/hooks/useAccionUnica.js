import { useCallback, useEffect, useRef, useState } from 'react'

// Envuelve una acción asíncrona para que no pueda ejecutarse dos veces a la vez.
//
// Por qué no basta con `const [enviando, setEnviando] = useState(false)` y
// chequear `if (enviando) return`: `setEnviando(true)` NO actualiza la variable
// de inmediato — React re-renderiza después. Entre el primer clic y ese
// re-render hay unos milisegundos en los que `enviando` sigue valiendo false, y
// un segundo clic (o el doble toque involuntario que hace mucha gente en el
// celular) pasa el chequeo y crea el reporte dos veces.
//
// El candado real es el `useRef`: se escribe y se lee de forma síncrona, así
// que el segundo clic lo ve levantado aunque React todavía no haya pintado
// nada. El `useState` existe solo para que la UI pueda mostrar el spinner.
export function useAccionUnica(accion) {
  const [ejecutando, setEjecutando] = useState(false)
  const candado = useRef(false)
  const montado = useRef(true)

  useEffect(() => () => { montado.current = false }, [])

  const ejecutar = useCallback(
    async (...args) => {
      if (candado.current) return undefined
      candado.current = true
      setEjecutando(true)

      try {
        return await accion(...args)
      } finally {
        candado.current = false
        // Si el componente se desmontó mientras corría la acción (ej. el modal
        // se cerró solo al terminar), actualizar estado acá dispararía un aviso
        // de React sobre fuga de memoria.
        if (montado.current) setEjecutando(false)
      }
    },
    [accion]
 )

  return [ejecutar, ejecutando]
}
