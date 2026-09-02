import { BadgeCheck } from 'lucide-react'

// Muestra el logo y nombre de la municipalidad activa (tenant), o el título genérico
// de la app si aún no hay municipio cargado (ej. mientras carga, o en la landing).
//
// El badge "Municipalidad" bajo el nombre no es decorativo: esta app pide el
// nombre y el teléfono del vecino, y lo primero que hay que responder es "¿a
// quién le estoy dando mis datos?". Una marca institucional visible es lo que
// separa esto de un formulario cualquiera — y es gratis, porque el dato ya
// estaba cargado.
//
// El logo va en una caja blanca con anillo en vez de suelto: los logos
// municipales chilenos suelen venir en PNG con fondo transparente y colores
// oscuros, que sobre un encabezado claro se ven sucios sin una superficie
// propia debajo.
export default function EncabezadoMunicipio({ municipio, tituloDefecto = 'TuMuniAquí' }) {
  if (!municipio) {
    return <h1 className="text-xl font-bold tracking-tight text-tinta-fuerte">{tituloDefecto}</h1>
  }

  return (
    <div className="flex items-center gap-3">
      {municipio.logo_url && (
        <img
          src={municipio.logo_url}
          alt=""
          className="h-11 w-11 shrink-0 rounded-xl bg-white object-contain p-1 shadow-tarjeta ring-1 ring-borde"
        />
      )}
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold leading-tight tracking-tight text-tinta-fuerte">
          {municipio.nombre}
        </h1>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-tinta-suave">
          <BadgeCheck size={12} className="shrink-0 text-primary" aria-hidden="true" />
          Municipalidad
        </p>
      </div>
    </div>
  )
}
