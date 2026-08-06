import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

// Botón reutilizable con prevención de doble envío incorporada.
//
// Si `onClick` devuelve una promesa (cualquier función async), el botón se
// bloquea solo hasta que esa promesa termina, sin que quien lo usa tenga que
// manejar un estado de "enviando". El candado es un `useRef`, no un `useState`:
// se lee de forma síncrona, así que un segundo clic disparado antes del
// re-render de React igual lo encuentra cerrado. Ver hooks/useAccionUnica.js
// para el mismo mecanismo aplicado a formularios con type="submit", donde el
// trabajo lo hace el onSubmit del <form> y no pasa por acá.
//
// `cargando` sigue existiendo para los casos en que el estado lo maneja el
// componente padre: gana el que esté activo, nunca se pisan.
export default function Boton({
  children,
  onClick,
  type = 'button',
  variante = 'primario',
  cargando = false,
  disabled = false,
  textoCargando,
  className = '',
}) {
  const [ocupado, setOcupado] = useState(false)
  const candado = useRef(false)
  const montado = useRef(true)

  useEffect(() => () => { montado.current = false }, [])

  async function manejarClick(evento) {
    if (!onClick) return
    if (candado.current) return
    candado.current = true

    try {
      const resultado = onClick(evento)
      // Solo se muestra el spinner si de verdad hay algo asíncrono que esperar;
      // para un onClick sincrónico (abrir un modal) no debe parpadear nada.
      if (resultado && typeof resultado.then === 'function') {
        setOcupado(true)
        await resultado
      }
    } finally {
      candado.current = false
      if (montado.current) setOcupado(false)
    }
  }

  const enEspera = cargando || ocupado

  // Degradado sutil + sombra en el color del municipio, y un leve hundimiento al
  // tocar (active:scale). Se mantiene el texto blanco sobre el color pleno del
  // tenant para no bajar el contraste: la app la usan también adultos mayores y
  // muchas veces con sol directo en la pantalla.
  const estilos = {
    primario: 'bg-gradient-to-b from-primary to-primary-dark text-white shadow-md shadow-primary/25 hover:brightness-110',
    secundario: 'bg-tinta-fuerte/[0.06] text-tinta hover:bg-tinta-fuerte/[0.1]',
    peligro: 'bg-gradient-to-b from-estado-critico to-[#a32e2e] text-white shadow-md shadow-estado-critico/25 hover:brightness-110',
  }

  return (
    <button
      type={type}
      onClick={manejarClick}
      disabled={disabled || enEspera}
      // aria-busy: un lector de pantalla anuncia que la acción está en curso,
      // que es la única señal que tiene quien no ve el spinner.
      aria-busy={enEspera}
      className={`flex min-h-[44px] items-center justify-center gap-2 rounded-2xl px-4 py-3.5 font-medium
        transition-all duration-150 active:scale-[0.98]
        disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:active:scale-100
        ${estilos[variante]} ${className}`}
    >
      {enEspera && <Loader2 className="animate-spin" size={18} />}
      {enEspera && textoCargando ? textoCargando : children}
    </button>
  )
}
