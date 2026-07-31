const ESTILOS_POR_ESTADO = {
  Pendiente: 'bg-amber-100 text-amber-800',
  'En Proceso': 'bg-blue-100 text-blue-800',
  Resuelto: 'bg-green-100 text-green-800',
}

export default function BadgeEstado({ estado }) {
  const estilo = ESTILOS_POR_ESTADO[estado] || 'bg-gray-100 text-gray-800'

  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${estilo}`}>
      {estado}
    </span>
  )
}
