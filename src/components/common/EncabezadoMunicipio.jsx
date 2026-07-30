// Muestra el logo y nombre de la municipalidad activa (tenant), o el título genérico
// de la app si aún no hay municipio cargado (ej. mientras carga, o en la landing).
export default function EncabezadoMunicipio({ municipio, tituloDefecto = 'Reporte de Incidencias Urbanas' }) {
  if (!municipio) {
    return <h1 className="text-xl font-bold text-gray-900">{tituloDefecto}</h1>
  }

  return (
    <div className="flex items-center gap-2">
      {municipio.logo_url && (
        <img src={municipio.logo_url} alt={municipio.nombre} className="h-8 w-8 rounded object-contain" />
      )}
      <h1 className="text-xl font-bold text-gray-900">{municipio.nombre}</h1>
    </div>
  )
}
