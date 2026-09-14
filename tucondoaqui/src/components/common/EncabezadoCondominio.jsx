// Muestra el logo y nombre de la administración activa (tenant), o el título genérico
// de la app si aún no hay condominio cargado (ej. mientras carga, o en la landing).
export default function EncabezadoCondominio({ condominio, tituloDefecto = 'TuCondoAquí' }) {
  if (!condominio) {
    return <h1 className="text-xl font-bold text-gray-900">{tituloDefecto}</h1>
  }

  return (
    <div className="flex items-center gap-2.5">
      {condominio.logo_url && (
        <img
          src={condominio.logo_url}
          alt={condominio.nombre}
          className="h-10 w-10 rounded-xl bg-white object-contain p-0.5 shadow-sm ring-1 ring-black/5"
        />
     )}
      <h1 className="text-xl font-bold leading-tight text-gray-900">{condominio.nombre}</h1>
    </div>
 )
}
