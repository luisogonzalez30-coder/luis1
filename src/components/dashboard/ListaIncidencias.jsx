import TarjetaIncidencia from './TarjetaIncidencia'

export default function ListaIncidencias({ incidencias, incidenciaSeleccionadaId, onSeleccionar }) {
  if (incidencias.length === 0) {
    return <p className="p-4 text-sm text-gray-400">No hay incidencias pendientes por ahora.</p>
  }

  return (
    <div className="flex flex-col gap-2 overflow-y-auto p-3">
      {incidencias.map((inc) => (
        <TarjetaIncidencia
          key={inc.id}
          incidencia={inc}
          seleccionada={inc.id === incidenciaSeleccionadaId}
          onClick={() => onSeleccionar(inc.id)}
        />
      ))}
    </div>
  )
}
