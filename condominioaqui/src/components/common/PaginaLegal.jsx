import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import EncabezadoCondominio from './EncabezadoCondominio'
import Spinner from './Spinner'
import { useCondominio } from '../../hooks/useCondominio'

// Fecha de la última revisión de los textos legales. Se muestra en ambas
// páginas: una política sin fecha no sirve para acreditar qué versión aceptó el
// residente. Actualizarla CADA vez que cambie el contenido de PrivacidadPage o
// TerminosPage.
export const ULTIMA_ACTUALIZACION = '3 de agosto de 2026'

// Correo al que el residente escribe para ejercer sus derechos. Sale de la
// configuración de cada condominio (`condominios/{id}.contacto_datos`)
// porque el responsable del tratamiento es el condominio, no la plataforma —
// ver "Quién responde por tus datos" en PrivacidadPage. Si no está configurado
// se dirige al residente a la oficina de partes en vez de inventar una dirección
// que rebota.
export function ContactoDatos({ condominio }) {
  const correo = condominio?.contacto_datos

  if (!correo) {
    return (
      <span>
        la administración de {condominio?.nombre || 'tu condominio'}, presencialmente o por
        los canales de contacto publicados en su sitio web
      </span>
   )
  }

  return (
    <a href={`mailto:${correo}`} className="font-medium text-primary underline">
      {correo}
    </a>
 )
}

export function Seccion({ titulo, children }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-base font-semibold text-gray-900">{titulo}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-gray-700">{children}</div>
    </section>
 )
}

// Envoltorio común de las dos páginas legales públicas (/:slug/privacidad y
// /:slug/terminos): resuelve el tenant, el encabezado y el pie, y le pasa el
// condominio al contenido. Sin login, igual que /transparencia — un residente tiene
// que poder leer esto ANTES de entregar sus datos, no después.
export default function PaginaLegal({ condominioSlug, titulo, bajada, children }) {
  const { condominio, cargando, noEncontrado } = useCondominio(condominioSlug)

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
   )
  }

  if (noEncontrado) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center text-gray-500">
        No encontramos este condominio.
      </div>
   )
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <Link to={`/${condominioSlug}`} className="mb-4 flex items-center gap-1 text-sm text-gray-500">
        <ArrowLeft size={16} /> Volver
      </Link>

      <EncabezadoCondominio condominio={condominio} />
      <h1 className="mt-3 text-2xl font-bold text-gray-900">{titulo}</h1>
      <p className="mt-1 text-sm text-gray-500">{bajada}</p>
      <p className="mt-1 text-xs text-gray-400">Última actualización: {ULTIMA_ACTUALIZACION}</p>

      {children(condominio)}

      <div className="mt-10 border-t border-gray-200 pt-4 text-xs text-gray-400">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <Link to={`/${condominioSlug}/privacidad`} className="underline">Política de privacidad</Link>
          <Link to={`/${condominioSlug}/terminos`} className="underline">Términos de servicio</Link>
          <Link to={`/${condominioSlug}/transparencia`} className="underline">Transparencia</Link>
        </div>
        <p className="mt-2">CondominioAquí — plataforma de gestión de solicitudes para condominios.</p>
      </div>
    </div>
 )
}
