// Estado de salud del servicio, para que algo externo pueda darse cuenta de que
// esto dejó de funcionar SIN esperar a que reclame un vecino.
//
// Por qué existe (ESTADO_PROYECTO.md §39.5): el 9 de agosto se editaron las dos
// plantillas de WhatsApp, Meta las dejó "En revisión" y falló el 100% de los
// envíos durante ~19 horas. Cuatro reportes se quedaron sin aviso, uno de un
// vecino real, y nadie se enteró hasta revisar a mano al día siguiente. El bot
// seguía "arriba": respondía 200 en / y los listeners estaban conectados. Un
// chequeo de "¿el proceso está vivo?" habría dicho que todo bien.
//
// Por eso acá no se mide si el proceso responde, sino si el TRABAJO está
// saliendo: cuántos reportes llevan mucho rato esperando su aviso y hace cuánto
// que no sale un envío exitoso. Eso es lo que se rompió esa vez.
//
// Todo se guarda en memoria a propósito: escribirlo en Firestore gastaría cuota
// del plan gratis (§19) en cada evento, y un reinicio de Render que borre estos
// contadores no oculta nada — el backlog se recalcula solo desde los listeners,
// que al reconectar vuelven a entregar todo lo pendiente.

// Cuánto puede tardar un aviso antes de considerarse un problema. Generoso a
// propósito: Meta puede demorar, Render puede estar reiniciando, y una alerta
// que salta por un atraso de dos minutos se vuelve ruido que se ignora.
const MINUTOS_TOLERANCIA_PENDIENTE = 45

// Cuánto vale un error de listener antes de darlo por superado. Los listeners
// de Firestore se reconectan solos, así que un error puntual no significa que
// el servicio siga caído. Sin esta ventana el error quedaba anotado para
// siempre y /salud respondía 503 hasta el próximo reinicio, aunque todo se
// hubiera arreglado hace horas — una alarma que no se apaga sola es una alarma
// que se termina ignorando, y entonces no sirve para nada.
const MINUTOS_VIGENCIA_ERROR_LISTENER = 30

const estado = {
  arranque: Date.now(),
  ultimoEnvioOk: null,
  ultimoError: null,
  totalEnviados: 0,
  totalFallidos: 0,
  // clave: id de incidencia -> desde cuándo está esperando su aviso.
  pendientes: new Map(),
  // Un listener caído es invisible: Firestore no reintenta solo y el proceso
  // sigue respondiendo 200 igual. Se anota el último error de cada uno.
  erroresListener: {},
}

function registrarPendiente(id) {
  if (!estado.pendientes.has(id)) estado.pendientes.set(id, Date.now())
}

function registrarEnvioOk(id) {
  estado.pendientes.delete(id)
  estado.ultimoEnvioOk = Date.now()
  estado.totalEnviados += 1
}

function registrarEnvioFallido(id, mensaje) {
  // No se borra de pendientes a propósito: sigue pendiente, que es la verdad.
  // El listener lo reintenta al reconectar (ver server.js).
  estado.totalFallidos += 1
  estado.ultimoError = { cuando: Date.now(), mensaje: String(mensaje).slice(0, 300) }
}

function registrarErrorListener(nombre, mensaje) {
  estado.erroresListener[nombre] = { cuando: Date.now(), mensaje: String(mensaje).slice(0, 300) }
}

function minutosDesde(marca) {
  return marca == null ? null : Math.round((Date.now() - marca) / 60000)
}

// Devuelve el diagnóstico completo. `ok` es lo único que mira el vigilante
// externo; el resto es para entender QUÉ pasa sin tener que abrir los logs de
// Render, que es donde se pierde el tiempo cuando algo se cae.
function diagnostico() {
  const ahora = Date.now()

  let pendienteMasViejoMin = null
  for (const desde of estado.pendientes.values()) {
    const min = Math.round((ahora - desde) / 60000)
    if (pendienteMasViejoMin === null || min > pendienteMasViejoMin) pendienteMasViejoMin = min
  }

  const problemas = []

  if (pendienteMasViejoMin !== null && pendienteMasViejoMin >= MINUTOS_TOLERANCIA_PENDIENTE) {
    problemas.push(
      `Hay ${estado.pendientes.size} aviso(s) sin salir; el más viejo lleva ${pendienteMasViejoMin} min esperando.`
    )
  }

  for (const [nombre, error] of Object.entries(estado.erroresListener)) {
    const hace = minutosDesde(error.cuando)
    if (hace < MINUTOS_VIGENCIA_ERROR_LISTENER) {
      problemas.push(`El listener "${nombre}" falló hace ${hace} min: ${error.mensaje}`)
    }
  }

  // Un error aislado no es una caída —un número mal escrito falla y ya—, pero
  // un error reciente mientras además hay cola sí lo es. Esa combinación es
  // exactamente la firma de la plantilla en revisión.
  if (estado.ultimoError && minutosDesde(estado.ultimoError.cuando) < 30 && estado.pendientes.size > 0) {
    problemas.push(`Envíos fallando: ${estado.ultimoError.mensaje}`)
  }

  return {
    ok: problemas.length === 0,
    problemas,
    detalle: {
      minutosArriba: minutosDesde(estado.arranque),
      avisosPendientes: estado.pendientes.size,
      minutosDelPendienteMasViejo: pendienteMasViejoMin,
      minutosDesdeUltimoEnvioOk: minutosDesde(estado.ultimoEnvioOk),
      totalEnviados: estado.totalEnviados,
      totalFallidos: estado.totalFallidos,
      ultimoError: estado.ultimoError
        ? { haceMinutos: minutosDesde(estado.ultimoError.cuando), mensaje: estado.ultimoError.mensaje }
        : null,
    },
  }
}

module.exports = {
  registrarPendiente,
  registrarEnvioOk,
  registrarEnvioFallido,
  registrarErrorListener,
  diagnostico,
}
