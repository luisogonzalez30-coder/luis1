// Muestra el logo y nombre de la municipalidad activa (tenant), o el título genérico
// de la app si aún no hay municipio cargado (ej. mientras carga, o en la landing).
export default function EncabezadoMunicipio({ municipio, tituloDefecto = 'TuMuniAquí' }) {
  if (!municipio) {
    return <h1 className="text-xl font-bold text-gray-900">{tituloDefecto}</h1>
  }

  return (
    <div className="flex items-center gap-2.5">
      {municipio.logo_url && (
        <img
          src={municipio.logo_url}
          alt={municipio.nombre}
          className="h-10 w-10 rounded-xl bg-white object-contain p-0.5 shadow-sm ring-1 ring-black/5"
        />
      )}
      <h1 className="text-xl font-bold leading-tight text-gray-900">{municipio.nombre}</h1>
    </div>
  )
}
