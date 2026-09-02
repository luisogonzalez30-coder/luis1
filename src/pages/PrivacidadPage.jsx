import { useParams } from 'react-router-dom'
import PaginaLegal, { Seccion, ContactoDatos } from '../components/common/PaginaLegal'

// Política de privacidad pública (/:municipioSlug/privacidad), sin login.
//
// El contenido describe EXACTAMENTE lo que la app guarda hoy — se escribió
// leyendo `crearIncidencia` (incidenciasService.js) y `registrarTicketPublico`
// (ticketsPublicosService.js), no de una plantilla genérica. Si alguna vez se
// agrega o se quita un campo del reporte, hay que actualizar la sección "Qué
// datos recogemos" Y la fecha en ULTIMA_ACTUALIZACION.
//
// Reparto de roles bajo la Ley 21.719: la municipalidad es la RESPONSABLE del
// tratamiento (decide para qué se usan los datos de sus vecinos) y TuMuniAquí
// es el ENCARGADO (solo los trata siguiendo sus instrucciones). Por eso el
// contacto para ejercer derechos es el del municipio, no el nuestro.
export default function PrivacidadPage() {
  const { municipioSlug } = useParams()

  return (
    <PaginaLegal
      municipioSlug={municipioSlug}
      titulo="Política de privacidad"
      bajada="Qué datos te pedimos, para qué los usamos y qué puedes exigir sobre ellos."
    >
      {(municipio) => (
        <>
          <Seccion titulo="En resumen">
            <ul className="list-disc space-y-1 pl-5">
              <li>Te pedimos tu <strong>nombre y tu WhatsApp</strong> para poder avisarte cuando resuelvan tu problema. Nada más.</li>
              <li><strong>Nunca publicamos tu nombre ni tu teléfono.</strong> Lo que se ve en el mapa público es el problema, no quién lo reportó.</li>
              <li>No vendemos tus datos, no los usamos para publicidad y no los compartimos con terceros ajenos a la gestión de tu reporte.</li>
              <li>Puedes pedir que te los muestren, los corrijan o los borren, cuando quieras y gratis.</li>
            </ul>
            <p className="text-xs text-tinta-suave">
              Este resumen es para que se entienda rápido. Lo que obliga legalmente es el detalle de abajo.
            </p>
          </Seccion>

          <Seccion titulo="Quién responde por tus datos">
            <p>
              La <strong>{municipio.nombre}</strong> es la responsable del tratamiento de tus datos
              personales: es quien decide para qué se usan y quien responde ante ti por ellos.
            </p>
            <p>
              TuMuniAquí es la plataforma tecnológica que la municipalidad contrató para gestionar
              los reportes. Actuamos como <em>encargado del tratamiento</em>: tratamos tus datos
              únicamente siguiendo las instrucciones del municipio, y no los usamos para ningún fin
              propio.
            </p>
          </Seccion>

          <Seccion titulo="Qué datos recogemos">
            <p>Cuando envías un reporte se guarda:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Tu nombre</strong> y <strong>tu número de WhatsApp</strong>, que son obligatorios: sin ellos la municipalidad no puede coordinar la visita ni avisarte cuando el trabajo esté hecho.</li>
              <li><strong>La ubicación del problema</strong>: las coordenadas que entrega el GPS de tu teléfono, o el punto que marcaste en el mapa. Es la ubicación del problema que reportas, que puede o no coincidir con dónde estás.</li>
              <li><strong>Las fotos</strong> que adjuntes (hasta 3).</li>
              <li><strong>Lo que escribas</strong> en "referencias de ubicación" y en "detalles adicionales".</li>
              <li><strong>La categoría</strong> del problema y la fecha y hora del reporte.</li>
              <li>
                <strong>Un identificador aleatorio de tu navegador</strong>: un número generado al
                azar que se guarda en tu teléfono. No sabe quién eres ni se comparte con nadie;
                sirve para dos cosas concretas — que no puedas votar dos veces el mismo reporte y
                que nadie pueda inundar el sistema con reportes falsos.
              </li>
            </ul>
            <p>
              No pedimos tu RUT, ni tu dirección particular, ni tu correo, ni tu fecha de
              nacimiento. Tampoco usamos cookies de publicidad ni herramientas de seguimiento de
              terceros.
            </p>
          </Seccion>

          <Seccion titulo="Para qué los usamos">
            <ul className="list-disc space-y-1 pl-5">
              <li>Asignar tu reporte a la dirección municipal que corresponde y a una cuadrilla.</li>
              <li>Contactarte por WhatsApp para coordinar la visita o preguntarte lo que falte.</li>
              <li>Avisarte cuando tu reporte se recibe, cuando se asigna y cuando queda resuelto.</li>
              <li>Detectar que varios vecinos están reportando el mismo problema, para atenderlo como uno solo.</li>
              <li>Producir estadísticas de gestión municipal. Estas estadísticas son <strong>agregadas</strong>: cuentan reportes, tiempos y categorías, nunca personas identificadas.</li>
            </ul>
            <p>
              No usamos tus datos para ningún otro fin. En particular: no se usan para publicidad,
              no se usan para fines electorales y no se transfieren a terceros que quieran
              ofrecerte algo.
            </p>
          </Seccion>

          <Seccion titulo="Qué es público y qué no">
            <p>
              Esta es la parte que más importa, así que va explícita. La app tiene un mapa público
              donde cualquiera puede ver los reportes de la comuna, y una página de transparencia
              con estadísticas.
            </p>
            <p className="rounded-xl bg-emerald-50 p-3">
              <strong>Es público:</strong> la categoría del problema, su gravedad, su ubicación en
              el mapa, la referencia de ubicación que escribiste, las fotos, el estado del reporte
              y la calificación que le pusiste al final.
            </p>
            <p className="rounded-xl bg-amber-50 p-3">
              <strong>No es público nunca:</strong> tu nombre, tu número de WhatsApp y lo que
              hayas escrito en "detalles adicionales". Eso solo lo ven los funcionarios
              municipales autorizados.
            </p>
            <p>
              Dos advertencias honestas. Primero: <strong>las fotos que subes son públicas</strong>,
              así que no fotografíes personas, patentes ni documentos. Segundo: la referencia de
              ubicación también es pública, así que no escribas ahí datos tuyos ni de tus vecinos
              — describe el lugar, no a la gente.
            </p>
            <p>
              Dentro del municipio tampoco todos ven lo mismo: la cuadrilla que va a terreno ve el
              problema y su ubicación, pero <strong>no ve tu nombre ni tu teléfono</strong>, porque
              no los necesita para hacer el trabajo.
            </p>
          </Seccion>

          <Seccion titulo="Con quién se comparten">
            <p>Solo con los proveedores necesarios para que la plataforma funcione:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Google (Firebase)</strong>: almacena la base de datos y sirve la aplicación.</li>
              <li><strong>Cloudinary</strong>: almacena las fotos de los reportes.</li>
              <li><strong>WhatsApp (Meta)</strong>: transporta los mensajes que la municipalidad te envía. Aplican además sus propias condiciones, que aceptaste al instalar WhatsApp.</li>
            </ul>
            <p>
              Estos proveedores almacenan información en servidores fuera de Chile. La
              municipalidad puede informarte la región exacta de almacenamiento si lo solicitas.
            </p>
            <p>
              También podrían entregarse datos a un tribunal o a un organismo público cuando una
              ley lo obligue. Fuera de eso, a nadie más.
            </p>
          </Seccion>

          <Seccion titulo="Por cuánto tiempo los guardamos">
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Tu nombre y tu WhatsApp</strong>: mientras tu reporte esté abierto y hasta 2 años después de cerrado, plazo en que la municipalidad puede necesitar acreditar la gestión realizada.</li>
              <li><strong>El reporte sin tus datos de contacto</strong> (categoría, ubicación, fotos, fechas): se conserva de forma indefinida como registro de gestión municipal y para las estadísticas históricas de la comuna.</li>
              <li><strong>El identificador de tu navegador</strong>: queda en tu teléfono hasta que borres los datos del sitio.</li>
            </ul>
            <p>
              Si pides que borren tus datos antes de esos plazos, se borran tu nombre y tu contacto,
              y el reporte queda de forma anónima. Ver la sección siguiente.
            </p>
          </Seccion>

          <Seccion titulo="Tus derechos">
            <p>
              La Ley 21.719 sobre protección de datos personales te reconoce estos derechos, que
              puedes ejercer <strong>gratuitamente y cuantas veces quieras</strong>:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Acceso</strong>: que te digan qué datos tuyos tienen y qué se ha hecho con ellos.</li>
              <li><strong>Rectificación</strong>: que corrijan un dato equivocado.</li>
              <li><strong>Supresión</strong>: que borren tus datos, cuando ya no sean necesarios o retires tu consentimiento.</li>
              <li><strong>Oposición</strong>: que dejen de usarlos para un fin determinado.</li>
              <li><strong>Portabilidad</strong>: que te entreguen tus datos en un formato que puedas llevarte.</li>
              <li><strong>Bloqueo</strong>: que suspendan su uso mientras se resuelve un reclamo tuyo.</li>
            </ul>
            <p>
              Para ejercerlos, escribe a <ContactoDatos municipio={municipio} />. La municipalidad
              tiene un plazo legal para responderte. Si no te responde, o no quedas conforme, puedes
              reclamar ante la <strong>Agencia de Protección de Datos Personales</strong>.
            </p>
            <p className="text-xs text-tinta-suave">
              La Ley 21.719 entra en plena vigencia el 1 de diciembre de 2026. Hasta esa fecha rige
              la Ley 19.628, que reconoce los derechos de acceso, rectificación, cancelación y
              oposición. La municipalidad aplica desde ya el estándar más exigente de las dos.
            </p>
          </Seccion>

          <Seccion titulo="Si eres menor de edad">
            <p>
              Cualquier vecino puede reportar un problema en la vía pública, sin importar su edad.
              Pero si tienes menos de 14 años, necesitas que tu papá, tu mamá o tu apoderado te
              autoricen antes de dejar tu nombre y tu teléfono.
            </p>
          </Seccion>

          <Seccion titulo="Cómo protegemos tus datos">
            <ul className="list-disc space-y-1 pl-5">
              <li>Todo viaja cifrado entre tu teléfono y los servidores (HTTPS).</li>
              <li>Cada funcionario municipal entra con su propia cuenta y ve solamente lo que su cargo requiere. Ese límite está aplicado en el servidor, no solo en la pantalla.</li>
              <li>La información del municipio se respalda automáticamente todos los días.</li>
              <li>Si llegara a ocurrir una filtración que afecte tus datos, la municipalidad debe notificarlo a la autoridad y, cuando corresponda, a ti.</li>
            </ul>
            <p>
              Ningún sistema es infalible y sería deshonesto decir lo contrario. Lo que sí
              afirmamos es que el sistema pide la menor cantidad de datos posible, precisamente
              para que una eventual filtración exponga lo mínimo.
            </p>
          </Seccion>

          <Seccion titulo="Cambios a esta política">
            <p>
              Si esta política cambia, se publica acá con una nueva fecha de actualización. Si el
              cambio es importante — por ejemplo, si se empezara a pedir un dato nuevo — se avisará
              en la aplicación antes de que tome efecto.
            </p>
          </Seccion>

          <Seccion titulo="Contacto">
            <p>
              Por cualquier duda sobre tus datos personales, o para ejercer los derechos de más
              arriba, escribe a <ContactoDatos municipio={municipio} />.
            </p>
          </Seccion>
        </>
      )}
    </PaginaLegal>
  )
}
