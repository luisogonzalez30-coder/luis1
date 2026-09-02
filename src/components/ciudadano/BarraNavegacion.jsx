import { Link, useLocation } from 'react-router-dom'
import { Plus, Search, BarChart3 } from 'lucide-react'

// Barra inferior del lado ciudadano. Tres destinos y nada más: en una app que
// un vecino abre dos veces al año, cada opción extra es una decisión que
// retrasa lo único que vino a hacer.
//
// "Reportar" va al centro y elevado (patrón FAB): es la acción principal, tiene
// que ser lo primero que el pulgar encuentra. Los otros dos son consulta.
export default function BarraNavegacion({ municipioSlug }) {
  const { pathname } = useLocation()

  const base = `/${municipioSlug}`
  const destinos = [
    {
      to: `${base}/estado`,
      icono: Search,
      etiqueta: 'Mis reportes',
      activo: pathname.startsWith(`${base}/estado`),
    },
    {
      to: `${base}/reportar`,
      icono: Plus,
      etiqueta: 'Reportar',
      activo: pathname.startsWith(`${base}/reportar`),
      principal: true,
    },
    {
      to: `${base}/transparencia`,
      icono: BarChart3,
      etiqueta: 'Cómo vamos',
      activo: pathname.startsWith(`${base}/transparencia`),
    },
  ]

  return (
    <nav
      className="no-imprimir fixed inset-x-0 bottom-0 z-40 border-t border-borde bg-white/85 shadow-barra backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Navegación principal"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {destinos.map(({ to, icono: Icono, etiqueta, activo, principal }) => (
          <li key={to} className="flex flex-1 justify-center">
            {principal ? (
              // El FAB sobresale de la barra. `-mt-5` lo levanta; el anillo
              // blanco lo separa del borde superior sin dibujarle un borde.
              <Link
                to={to}
                aria-current={activo ? 'page' : undefined}
                className="group flex flex-col items-center gap-1 pb-1.5 pt-1"
              >
                <span className="-mt-5 grid h-14 w-14 place-items-center rounded-full bg-primary text-white shadow-flotante ring-4 ring-white transition-transform duration-200 group-active:scale-95">
                  <Plus size={26} strokeWidth={2.5} />
                </span>
                <span className={`text-[11px] font-semibold ${activo ? 'text-primary' : 'text-tinta-suave'}`}>
                  {etiqueta}
                </span>
              </Link>
            ) : (
              <Link
                to={to}
                aria-current={activo ? 'page' : undefined}
                className={`relative flex min-h-[56px] w-full flex-col items-center justify-center gap-1 rounded-xl transition-colors
                  ${activo ? 'text-primary' : 'text-tinta-suave hover:text-tinta'}`}
              >
                {/* Indicador sutil de la pestaña activa: una barrita arriba,
                    no un fondo de color que compita con el FAB. */}
                <span
                  className={`absolute inset-x-5 top-0 h-0.5 rounded-full bg-primary transition-opacity duration-200
                    ${activo ? 'opacity-100' : 'opacity-0'}`}
                />
                <Icono size={21} strokeWidth={activo ? 2.3 : 2} />
                <span className="text-[11px] font-medium">{etiqueta}</span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
