// Identidad de dispositivo para el sistema de votos ("+1", tipo Waze). La app
// ciudadana no tiene login, así que no hay un userId real — se genera un ID
// aleatorio y se guarda en localStorage, igual que colaOffline.js. Esto evita
// el doble-click accidental y que la MISMA persona vote dos veces desde el
// mismo navegador; no es una garantía criptográfica (alguien podría borrar el
// localStorage o usar incógnito para volver a votar) — mismo límite conocido
// que tiene cualquier sistema de votos anónimo sin cuentas de usuario.
const CLAVE_ID = 'dispositivo_id'
const CLAVE_VOTOS = 'incidencias_votadas'
const CLAVE_TICKETS_POR_RUT = 'tickets_por_rut'

function generarId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `dispositivo-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// Devuelve el ID de este dispositivo, generándolo la primera vez. Si
// localStorage no está disponible (modo privado, cuota llena), devuelve un ID
// efímero: el voto igual funciona, solo que no se recuerda entre recargas.
export function obtenerIdDispositivo() {
  try {
    let id = localStorage.getItem(CLAVE_ID)
    if (!id) {
      id = generarId()
      localStorage.setItem(CLAVE_ID, id)
    }
    return id
  } catch (error) {
    console.error('[dispositivo] No se pudo persistir el ID de dispositivo:', error)
    return generarId()
  }
}

export function yaVotoPorIncidencia(incidenciaId) {
  try {
    const votos = JSON.parse(localStorage.getItem(CLAVE_VOTOS) || '[]')
    return votos.includes(incidenciaId)
  } catch (error) {
    console.error('[dispositivo] No se pudo leer el registro de votos local:', error)
    return false
  }
}

export function registrarVotoLocal(incidenciaId) {
  try {
    const votos = JSON.parse(localStorage.getItem(CLAVE_VOTOS) || '[]')
    if (!votos.includes(incidenciaId)) {
      votos.push(incidenciaId)
      localStorage.setItem(CLAVE_VOTOS, JSON.stringify(votos))
    }
  } catch (error) {
    console.error('[dispositivo] No se pudo guardar el voto local:', error)
  }
}

// Índice LOCAL (nunca sale de este dispositivo) de qué números de ticket
// corresponden a qué RUT — permite el buscador "Mis reportes" en
// ConsultaTicketPage.jsx sin necesitar una consulta al servidor por RUT, que
// expondría públicamente qué vecino reportó qué (/estado es de lectura
// pública sin login). Si el vecino cambia de celular, no lo va a encontrar
// por RUT — solo por el número de ticket que ya se le mostró al crear.
export function registrarTicketPorRut(rutLimpio, numeroTicket) {
  if (!rutLimpio) return
  try {
    const indice = JSON.parse(localStorage.getItem(CLAVE_TICKETS_POR_RUT) || '{}')
    const tickets = indice[rutLimpio] || []
    if (!tickets.includes(numeroTicket)) {
      indice[rutLimpio] = [...tickets, numeroTicket]
      localStorage.setItem(CLAVE_TICKETS_POR_RUT, JSON.stringify(indice))
    }
  } catch (error) {
    console.error('[dispositivo] No se pudo guardar el ticket en el índice local por RUT:', error)
  }
}

export function buscarTicketsPorRutLocal(rutLimpio) {
  try {
    const indice = JSON.parse(localStorage.getItem(CLAVE_TICKETS_POR_RUT) || '{}')
    return indice[rutLimpio] || []
  } catch (error) {
    console.error('[dispositivo] No se pudo leer el índice local por RUT:', error)
    return []
  }
}
