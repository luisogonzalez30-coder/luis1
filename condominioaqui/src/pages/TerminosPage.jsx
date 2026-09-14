import { useParams, Link } from 'react-router-dom'
import { Phone } from 'lucide-react'
import PaginaLegal, { Seccion, ContactoDatos } from '../components/common/PaginaLegal'

// Términos de servicio públicos (/:condominioSlug/terminos), sin login.
//
// La sección "Esto no es un canal de emergencias" va deliberadamente arriba de
// todo y destacada: el catálogo de categorías incluye fugas de gas, cableado
// expuesto y socavones, y un residente que reporte una fuga de gas por acá y se
// quede esperando corre un riesgo real. La app ya muestra un aviso de seguridad
// al elegir esas categorías (PasoCategoria.jsx); esto es la versión formal del
// mismo aviso.
export default function TerminosPage() {
  const { condominioSlug } = useParams()

  return (
    <PaginaLegal
      condominioSlug={condominioSlug}
      titulo="Términos de servicio"
      bajada="Las reglas de uso de esta plataforma. En simple, y sin letra chica."
    >
      {(condominio) => (
        <>
          <div className="mt-6 rounded-2xl border-2 border-red-200 bg-red-50 p-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-red-900">
              <Phone size={18} /> Esto no es un canal de emergencias
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-red-900">
              Los reportes se revisan en horario de trabajo del condominio. <strong>Nadie está mirando
              esta aplicación a las 3 de la mañana.</strong> Si hay peligro para la vida o los
              bienes de alguien, llama primero y reporta después:
            </p>
            <ul className="mt-2 space-y-0.5 text-sm font-medium text-red-900">
              <li>Ambulancia (SAMU) — <strong>131</strong></li>
              <li>Bomberos — <strong>132</strong></li>
              <li>Carabineros — <strong>133</strong></li>
              <li>Emergencia de gas, cables cortados o postes caídos: llama a la empresa de servicio y a Bomberos.</li>
            </ul>
          </div>

          <Seccion titulo="Qué es esta plataforma">
            <p>
              CondominioAquí es el canal por el que la administración de <strong>{condominio.nombre}</strong>
              recibe las solicitudes de sus residentes: filtraciones, ascensores detenidos, luces
              quemadas, ruidos molestos, aseo y similares. No requiere registrarse ni instalar nada.
            </p>
            <p>
              El servicio lo presta la administración del condominio. La plataforma tecnológica la
              provee CondominioAquí.
            </p>
          </Seccion>

          <Seccion titulo="Qué pasa cuando reportas">
            <p>
              Tu solicitud recibe un número, se clasifica automáticamente por gravedad y se deriva al
              área responsable que corresponde.
            </p>
            <p>
              <strong>Reportar no garantiza que el problema se resuelva, ni en qué plazo.</strong>{' '}
              El condominio prioriza según la gravedad, los recursos disponibles y sus
              competencias legales. Hay problemas que no le corresponden al condominio —una falla en
              la red eléctrica, un camino que administra Vialidad, algo dentro de una propiedad
              privada— y en esos casos el condominio deriva o te informa a quién acudir.
            </p>
            <p>
              Puedes seguir el estado de tu reporte en cualquier momento con su número, en{' '}
              <Link to="/estado" className="font-medium text-primary underline">la página de consulta</Link>.
            </p>
          </Seccion>

          <Seccion titulo="Tus responsabilidades al usar la app">
            <p>Al enviar un reporte te comprometes a lo siguiente:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Que sea verdad.</strong> Reportar problemas inexistentes desvía equipos que hacen falta en otra parte.</li>
              <li><strong>Que sea un problema de la vía pública</strong>, no un conflicto con un residente ni una denuncia contra una persona. Para eso existen otros canales del condominio.</li>
              <li><strong>No fotografiar personas identificables, patentes ni documentos.</strong> Las fotos de los reportes son públicas. Fotografía el problema, no a la gente.</li>
              <li><strong>No escribir datos personales de terceros</strong> —nombres, teléfonos, direcciones particulares— en los campos de texto.</li>
              <li><strong>No usar lenguaje ofensivo, discriminatorio ni amenazas.</strong></li>
              <li><strong>No enviar reportes masivos ni automatizados.</strong> Hay un tiempo mínimo entre reportes desde un mismo teléfono, justamente para eso.</li>
              <li><strong>Usar el "+1" en vez de repetir.</strong> Si tu problema ya fue reportado, súmate a ese reporte: hace más fuerte el caso ante el condominio que abrir uno nuevo.</li>
            </ul>
          </Seccion>

          <Seccion titulo="Las fotos que subes">
            <p>
              Las fotos siguen siendo tuyas. Al subirlas le das a el condominio permiso para
              usarlas en la gestión del reporte y en sus informes públicos de gestión, incluida la
              Cuenta Pública anual, sin pagarte nada por ello y sin límite de tiempo.
            </p>
            <p>
              Al subir una foto declaras que la tomaste tú o que tienes derecho a usarla, y que no
              aparecen en ella personas identificables que no hayan autorizado su publicación.
            </p>
          </Seccion>

          <Seccion titulo="Si se usa mal">
            <p>
              El condominio puede cerrar sin tramitar un reporte falso, ofensivo o que no
              corresponda a su competencia, y puede bloquear el acceso desde un dispositivo que
              envíe reportes masivos o falsos de forma reiterada.
            </p>
            <p>
              Reportar hechos falsos a un organismo público puede, además, tener consecuencias
              legales fuera de esta plataforma.
            </p>
          </Seccion>

          <Seccion titulo="Disponibilidad del servicio">
            <p>
              Trabajamos para que la plataforma esté siempre disponible, pero puede haber
              interrupciones por mantención, fallas de proveedores externos o cortes de red. La
              aplicación permite escribir un reporte sin señal y lo envía solo cuando vuelve la
              conexión, pero eso <strong>no reemplaza a los teléfonos de emergencia</strong>.
            </p>
            <p>
              Ni el condominio ni CondominioAquí responden por daños derivados de la
              indisponibilidad del servicio, ni por el contenido que publiquen los propios usuarios.
              Esto no limita la responsabilidad que la ley imponga a el condominio por el
              ejercicio de sus funciones.
            </p>
          </Seccion>

          <Seccion titulo="Tus datos personales">
            <p>
              El detalle de qué datos se recogen, para qué se usan, qué es público y cómo pides que
              los borren está en la{' '}
              <Link to={`/${condominioSlug}/privacidad`} className="font-medium text-primary underline">
                política de privacidad
              </Link>, que forma parte de estos términos.
            </p>
          </Seccion>

          <Seccion titulo="Cambios">
            <p>
              Estos términos pueden actualizarse. La versión vigente es siempre la publicada en
              esta página, con su fecha de actualización arriba. Seguir usando la plataforma
              después de un cambio significa que lo aceptas.
            </p>
          </Seccion>

          <Seccion titulo="Ley aplicable">
            <p>
              Estos términos se rigen por la ley chilena. Cualquier controversia se somete a los
              tribunales ordinarios de justicia competentes en el territorio de el condominio.
            </p>
            <p>
              Consultas sobre estos términos: <ContactoDatos condominio={condominio} />.
            </p>
          </Seccion>
        </>
     )}
    </PaginaLegal>
 )
}
