const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore')
const { defineSecret } = require('firebase-functions/params')
const { setGlobalOptions } = require('firebase-functions/v2')
const logger = require('firebase-functions/logger')
const admin = require('firebase-admin')
const axios = require('axios')

admin.initializeApp()

// Secretos en Secret Manager (no en functions:config:set — ese mecanismo está
// deprecado y Firebase ya no lo ofrece para proyectos nuevos). Se configuran
// con "firebase functions:secrets:set NOMBRE" — ver instrucciones al final.
const WHATSAPP_TOKEN = defineSecret('WHATSAPP_TOKEN')
const WHATSAPP_PHONE_NUMBER_ID = defineSecret('WHATSAPP_PHONE_NUMBER_ID')

setGlobalOptions({ region: 'us-central1', maxInstances: 10 })

const GRAPH_API_VERSION = 'v19.0'
const PORTAL_URL_ESTADO = 'https://app-incidencias-urbanas.web.app/estado'

// Duplicado a propósito desde src/utils/categorias.js: Cloud Functions se
// despliega como paquete aislado (solo lo que hay dentro de functions/), no
// puede importar archivos de src/ del proyecto principal. Si agregas una
// categoría nueva allá, agrégala acá también (o el WhatsApp mostrará el slug
// crudo en vez de la etiqueta legible — degrada bien, no rompe nada).
const ETIQUETA_POR_CATEGORIA = {
  Bache: 'Bache en la vía',
  Semaforo: 'Semáforo con falla',
  Semaforo_peatonal: 'Semáforo peatonal con falla',
  Senaletica_vial: 'Señalética vial dañada o faltante',
  Pavimento_deteriorado: 'Pavimento deteriorado o agrietado',
  Socavon: 'Socavón / hundimiento de calzada',
  Vereda_danada: 'Vereda en mal estado',
  Rampa_accesibilidad: 'Rampa de accesibilidad dañada o faltante',
  Ciclovia_danada: 'Ciclovía dañada u obstruida',
  Estacionamiento_irregular: 'Estacionamiento irregular',
  Anegamiento: 'Anegamiento / calle inundada',
  Baranda_danada: 'Baranda o barrera de contención dañada',
  Luminaria: 'Luminaria pública apagada',
  Luminaria_parpadea: 'Luminaria parpadeando',
  Poste_danado: 'Poste de luz dañado o caído',
  Cableado_expuesto: 'Cableado eléctrico expuesto',
  Basural: 'Basural / microbasural',
  Escombros: 'Acumulación de escombros',
  Contenedor_danado: 'Contenedor de basura dañado o desbordado',
  Falta_recoleccion: 'Falta de recolección de basura',
  Punto_limpio: 'Punto limpio saturado o dañado',
  Grafiti: 'Grafiti / rayado en espacio público',
  Mal_olor: 'Mal olor persistente',
  Falta_basureros: 'Falta de basureros públicos',
  Arbol_caido: 'Árbol caído o en riesgo',
  Poda_necesaria: 'Poda de árboles necesaria',
  Plaza_mal_estado: 'Plaza o parque en mal estado',
  Juegos_infantiles: 'Juegos infantiles dañados',
  Riego_deficiente: 'Riego de áreas verdes deficiente',
  Ruido_ambiental: 'Contaminación acústica / ruidos molestos',
  Quema_ilegal: 'Quema ilegal de basura o pastizales',
  Pasto_alto: 'Pasto sin cortar en áreas verdes',
  Filtracion_agua: 'Filtración de agua potable',
  Alcantarillado: 'Alcantarillado tapado o rebalsado',
  Fuga_gas: 'Fuga de gas',
  Corte_agua: 'Corte de agua no informado',
  Grifo_danado: 'Grifo o llave pública dañada',
  Sitio_eriazo: 'Sitio eriazo o propiedad abandonada en mal estado',
  Construccion_irregular: 'Construcción irregular o sin permiso',
  Muro_riesgo: 'Muro o cierre perimetral en riesgo de derrumbe',
  Estructura_danada: 'Techumbre o estructura dañada en espacio público',
  Patente_irregular: 'Local comercial funcionando sin patente',
  Falta_vigilancia: 'Falta de vigilancia / cámara dañada',
  Animal_abandonado: 'Perro o animal abandonado / en riesgo',
  Plaga: 'Plaga de roedores o insectos',
  Foco_delincuencia: 'Foco de delincuencia reportado',
  Robo_hurto_frecuente: 'Robos o hurtos frecuentes en el sector',
  Consumo_via_publica: 'Consumo de alcohol/drogas en vía pública',
  Comercio_ambulante: 'Comercio ambulante irregular',
  Vehiculo_abandonado: 'Vehículo abandonado en la vía pública',
  Excremento_mascotas: 'Excremento de mascotas no recogido',
  Mobiliario_danado: 'Banca o mobiliario urbano dañado',
  Paradero_danado: 'Paradero de locomoción dañado',
  Bano_publico: 'Baño público en mal estado',
  Feria_desorden: 'Desorden en feria libre / vía pública',
  Ruido_local_comercial: 'Ruido molesto de local comercial',
  Publicidad_ilegal: 'Publicidad ilegal (pasacalles, carteles)',
  Otro: 'Otro',
}

function etiquetaCategoria(slug) {
  return ETIQUETA_POR_CATEGORIA[slug] || (slug || '').replace(/_/g, ' ')
}

// La Graph API exige SOLO dígitos, con código de país, sin "+". contacto_ciudadano
// ya se guarda normalizado como "+56912345678" (ver src/utils/telefono.js), pero
// esto igual valida por si hay registros viejos o mal formados — null si no se
// puede reconocer, para no mandarle un mensaje al número equivocado.
function formatearParaGraphApi(contacto) {
  const digitos = (contacto || '').replace(/\D/g, '')
  if (digitos.length === 9 && digitos.startsWith('9')) return `56${digitos}`
  if (digitos.length === 11 && digitos.startsWith('569')) return digitos
  return null
}

async function enviarTemplateWhatsapp({ para, template, parametrosBody }) {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID.value()}/messages`

  const body = {
    messaging_product: 'whatsapp',
    to: para,
    type: 'template',
    template: {
      name: template,
      language: { code: 'es' },
      components: [
        {
          type: 'body',
          parameters: parametrosBody.map((texto) => ({ type: 'text', text: String(texto) })),
        },
      ],
    },
  }

  const respuesta = await axios.post(url, body, {
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN.value()}`,
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  })

  return respuesta.data
}

// Trigger 1: se crea una incidencia nueva -> template "alerta_nuevo_ticket".
// Variables del body (en ESE orden — deben coincidir exactamente con como
// quedó aprobado el template en Meta Business Manager): {{1}} número de
// ticket, {{2}} categoría legible.
exports.onIncidenciaCreada = onDocumentCreated(
  { document: 'incidencias/{incidenciaId}', secrets: [WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID] },
  async (event) => {
    const incidencia = event.data?.data()
    if (!incidencia) return

    // Reportes anónimos (incidencia.es_anonimo) no traen contacto_ciudadano —
    // no es un error, simplemente no hay a quién notificar.
    const para = formatearParaGraphApi(incidencia.contacto_ciudadano)
    if (!para) {
      logger.info(`[onIncidenciaCreada] ${event.params.incidenciaId}: sin WhatsApp válido, no se notifica.`)
      return
    }

    try {
      await enviarTemplateWhatsapp({
        para,
        template: 'alerta_nuevo_ticket',
        parametrosBody: [incidencia.numero_ticket || event.params.incidenciaId, etiquetaCategoria(incidencia.categoria)],
      })
      logger.info(`[onIncidenciaCreada] Notificado ${para} — ticket ${incidencia.numero_ticket}.`)
    } catch (error) {
      // Nunca dejar que un fallo de la API de Meta tumbe la función ni bloquee
      // la creación de la incidencia (que ya ocurrió antes de que esto corra).
      logger.error(
        `[onIncidenciaCreada] Falló el envío a ${para} (ticket ${event.params.incidenciaId}):`,
        error.response?.data || error.message
      )
    }
  }
)

// Trigger 2: una incidencia entra a "Resuelto" -> template "ticket_resuelto".
// Dispara al pasar de CUALQUIER estado a Resuelto (no solo Pendiente -> Resuelto:
// en el flujo real casi todo pasa primero por "En Proceso", ver
// PanelGestionDepartamento.jsx). Variables del body: {{1}} número de ticket,
// {{2}} link con la foto de término si ya se subió, o al portal si no.
//
// OJO con esto: foto_despues_url se escribe en una SEGUNDA escritura asíncrona
// después de que estado ya quedó en "Resuelto" (ver marcarResuelto en
// incidenciasService.js — a propósito, para no bloquear el cierre con mala
// señal). Casi siempre esta función corre ANTES de que la foto exista. Si tu
// template "ticket_resuelto" tiene la foto como IMAGEN en el header (no como
// variable de texto), esta función va a fallar la mayoría de las veces porque
// no hay foto todavía — en ese caso hay que rediseñar el template para no
// depender de la foto, o escuchar también el segundo update (cuando aparece
// foto_despues_url) y mandar un mensaje aparte en ese momento.
exports.onIncidenciaResuelta = onDocumentUpdated(
  { document: 'incidencias/{incidenciaId}', secrets: [WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID] },
  async (event) => {
    const antes = event.data?.before?.data()
    const despues = event.data?.after?.data()
    if (!antes || !despues) return
    if (antes.estado === 'Resuelto' || despues.estado !== 'Resuelto') return

    const para = formatearParaGraphApi(despues.contacto_ciudadano)
    if (!para) {
      logger.info(`[onIncidenciaResuelta] ${event.params.incidenciaId}: sin WhatsApp válido, no se notifica.`)
      return
    }

    try {
      await enviarTemplateWhatsapp({
        para,
        template: 'ticket_resuelto',
        parametrosBody: [despues.numero_ticket || event.params.incidenciaId, despues.foto_despues_url || PORTAL_URL_ESTADO],
      })
      logger.info(`[onIncidenciaResuelta] Notificado ${para} — ticket ${despues.numero_ticket}.`)
    } catch (error) {
      logger.error(
        `[onIncidenciaResuelta] Falló el envío a ${para} (ticket ${event.params.incidenciaId}):`,
        error.response?.data || error.message
      )
    }
  }
)
