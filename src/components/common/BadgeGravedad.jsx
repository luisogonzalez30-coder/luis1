const ESTILOS_POR_GRAVEDAD = {
  Alta: 'bg-red-100 text-red-800',
  Media: 'bg-orange-100 text-orange-800',
  Baja: 'bg-green-100 text-green-800',
}

// No renderiza nada para incidencias antiguas sin nivel_gravedad (creadas antes
// del triage automático), en vez de mostrar un badge vacío o engañoso.
export default function BadgeGravedad({ nivel }) {
  if (!nivel) return null

  const estilo = ESTILOS_POR_GRAVEDAD[nivel] || 'bg-gray-100 text-gray-800'

  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${estilo}`}>
      Gravedad {nivel}
    </span>
  )
}
