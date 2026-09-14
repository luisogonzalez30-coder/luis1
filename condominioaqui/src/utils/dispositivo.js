// Identidad de dispositivo para el sistema de votos ("+1", tipo Waze). La app
// ciudadana no tiene login, así que no hay un userId real — se genera un ID
// aleatorio y se guarda en localStorage, igual que colaOffline.js. Esto evita
// el doble-click accidental y que la MISMA persona vote dos veces desde el
// mismo navegador; no es una garantía criptográfica (alguien podría borrar el
// localStorage o usar incógnito para volver a votar) — mismo límite conocido
// que tiene cualquier sistema de votos anónimo sin cuentas de usuario.
const CLAVE_ID = 'dispositivo_id'
const CLAVE_VOTOS = 'solicitudes_votadas'
const CLAVE_ULTIMO_REPORTE = 'ultimo_reporte_ms'

// Enfriamiento entre reportes del mismo dispositivo. Debe coincidir con el
// valor de firestore.rules (ENFRIAMIENTO_SEGUNDOS): allá es la defensa real
// —enforced en el servidor— y acá abajo es solo para poder avisarle al residente
// con un mensaje claro antes de intentar, en vez de mostrarle un error crudo
// de permisos. Ver la documentación
export const ENFRIAMIENTO_REPORTE_SEGUNDOS = 60

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

export function yaVotoPorSolicitud(solicitudId) {
  try {
    const votos = JSON.parse(localStorage.getItem(CLAVE_VOTOS) || '[]')
    return votos.includes(solicitudId)
  } catch (error) {
    console.error('[dispositivo] No se pudo leer el registro de votos local:', error)
    return false
  }
}

export function registrarVotoLocal(solicitudId) {
  try {
    const votos = JSON.parse(localStorage.getItem(CLAVE_VOTOS) || '[]')
    if (!votos.includes(solicitudId)) {
      votos.push(solicitudId)
      localStorage.setItem(CLAVE_VOTOS, JSON.stringify(votos))
    }
  } catch (error) {
    console.error('[dispositivo] No se pudo guardar el voto local:', error)
  }
}

// Segundos que faltan para poder reportar de nuevo, o 0 si ya se puede. Solo
// es una ayuda de UX (ver ENFRIAMIENTO_REPORTE_SEGUNDOS): si el reloj del
// celular está mal o alguien borra el localStorage, esto se equivoca — el
// límite de verdad lo aplica firestore.rules contra la hora del servidor.
export function segundosParaPoderReportar() {
  try {
    const ultimo = Number(localStorage.getItem(CLAVE_ULTIMO_REPORTE))
    if (!ultimo) return 0
    const transcurridos = (Date.now() - ultimo) / 1000
    const restantes = Math.ceil(ENFRIAMIENTO_REPORTE_SEGUNDOS - transcurridos)
    // Un reloj adelantado/atrasado puede dar valores absurdos: se ignoran en
    // vez de dejar al residente bloqueado sin poder reportar.
    return restantes > 0 && restantes <= ENFRIAMIENTO_REPORTE_SEGUNDOS ? restantes : 0
  } catch (error) {
    console.error('[dispositivo] No se pudo leer el último reporte local:', error)
    return 0
  }
}

export function registrarReporteLocal() {
  try {
    localStorage.setItem(CLAVE_ULTIMO_REPORTE, String(Date.now()))
  } catch (error) {
    console.error('[dispositivo] No se pudo guardar la marca del último reporte:', error)
  }
}

// El índice local de tickets por RUT se eliminó el 02-ago-2026 junto con el
// campo RUT: ahora el residente recupera sus reportes escribiéndole
// "mis reportes" al WhatsApp de el condominio, y el bot le responde solo a
// ese número — no hace falta guardar nada acá ni pedirle un dato sensible.
