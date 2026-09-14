import { Building2, MapPin, Trees } from 'lucide-react'
import { TIPO_COMUN } from '../../utils/unidades'

// Dónde ocurre una solicitud, escrito para quien la va a ir a resolver.
//
// Reemplaza al enlace a Google Maps del producto municipal, que acá no sirve:
// todas las solicitudes de un condominio comparten dirección, así que el enlace
// llevaría siempre al mismo portón. Lo que el conserje necesita es "Torre A ·
// 802", y eso no está en ningún mapa.
export default function EtiquetaUbicacion({ ubicacion, referencia, className = '' }) {
  const esComun = ubicacion?.tipo === TIPO_COMUN
  const Icono = ubicacion ? (esComun ? Trees : Building2) : MapPin
  const texto = ubicacion?.etiqueta || 'Ubicación no registrada'

  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <p className="flex items-center gap-1.5 text-sm font-medium text-tinta-fuerte">
        <Icono size={15} className="shrink-0 text-tinta-tenue" aria-hidden="true" />
        {texto}
      </p>
      {referencia && <p className="pl-[22px] text-sm text-gray-500">{referencia}</p>}
    </div>
 )
}
