import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import EncabezadoMunicipio from './EncabezadoMunicipio'
import Spinner from './Spinner'
import { useMunicipio } from '../../hooks/useMunicipio'

// Fecha de la última revisión de los textos legales. Se muestra en ambas
// páginas: una política sin fecha no sirve para acreditar qué versión aceptó el
// vecino. Actualizarla CADA vez que cambie el contenido de PrivacidadPage o
// TerminosPage.
export const ULTIMA_ACTUALIZACION = '3 de agosto de 2026'

// Correo al que el vecino escribe para ejercer sus derechos. Sale de la
// configuración de cada municipalidad (`municipalidades/{id}.contacto_datos`)
// porque el responsable del tratamiento es el municipio, no la plataforma —
// ver "Quién responde por tus datos" en PrivacidadPage. Si no está configurado
// se dirige al vecino a la oficina de partes en vez de inventar una dirección
// que rebota.
export function ContactoDatos({ municipio }) {
  const correo = municipio?.contacto_datos

  if (!correo) {
    return (
      <span>
        la Oficina de Partes de {municipio?.nombre || 'la municipalidad'}, presencialmente o por
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
      <h2 className="mb-2 text-base font-semibold text-tinta-fuerte">{titulo}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-tinta">{children}</div>
    </section>
  )
}

// Envoltorio común de las dos páginas legales públicas (/:slug/privacidad y
// /:slug/terminos): resuelve el tenant, el encabezado y el pie, y le pasa el
// municipio al contenido. Sin login, igual que /transparencia — un vecino tiene
// que poder leer esto ANTES de entregar sus datos, no después.
export default function PaginaLegal({ municipioSlug, titulo, bajada, children }) {
  const { municipio, cargando, noEncontrado } = useMunicipio(municipioSlug)

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (noEncontrado) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center text-tinta-suave">
        No encontramos esta municipalidad.
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <Link to={`/${municipioSlug}`} className="mb-4 flex items-center gap-1 text-sm text-tinta-suave">
        <ArrowLeft size={16} /> Volver
      </Link>

      <EncabezadoMunicipio municipio={municipio} />
      <h1 className="mt-3 text-2xl font-bold text-tinta-fuerte">{titulo}</h1>
      <p className="mt-1 text-sm text-tinta-suave">{bajada}</p>
      <p className="mt-1 text-xs text-tinta-tenue">Última actualización: {ULTIMA_ACTUALIZACION}</p>

      {children(municipio)}

      <div className="mt-10 border-t border-borde pt-4 text-xs text-tinta-tenue">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <Link to={`/${municipioSlug}/privacidad`} className="underline">Política de privacidad</Link>
          <Link to={`/${municipioSlug}/terminos`} className="underline">Términos de servicio</Link>
          <Link to={`/${municipioSlug}/transparencia`} className="underline">Transparencia</Link>
        </div>
        <p className="mt-2">TuMuniAquí — plataforma de reportes ciudadanos.</p>
      </div>
    </div>
  )
}
