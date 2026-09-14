import TarjetaSolicitud from './TarjetaSolicitud'

export default function ListaSolicitudes({ solicitudes, solicitudSeleccionadaId, onSeleccionar }) {
  if (solicitudes.length === 0) {
    return <p className="p-4 text-sm text-gray-400">No hay solicitudes pendientes por ahora.</p>
  }

  return (
    <div className="flex flex-col gap-2 overflow-y-auto p-3">
      {solicitudes.map((inc) => (
        <TarjetaSolicitud
          key={inc.id}
          solicitud={inc}
          seleccionada={inc.id === solicitudSeleccionadaId}
          onClick={() => onSeleccionar(inc.id)}
        />
     ))}
    </div>
 )
}
