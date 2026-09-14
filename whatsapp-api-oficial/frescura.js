// ¿Todavía vale la pena mandar este aviso, o ya pasó demasiado tiempo?
//
// Por qué existe (14-sep-2026): Render suspendió el servicio el 11-sep y estuvo
// tres días sin correr. El listener de server.js escucha
// `notificado_whatsapp_creacion == false`, así que al reiniciar entra TODO lo
// pendiente de golpe como "added" y se notifica de una vez. No se pierde nada
// —eso está bien y es a propósito— pero significa que a un vecino que reportó el
// lunes le llega "recibimos tu reporte" el jueves, cuando su bache quizá ya está
// arreglado. Y cada uno de esos mensajes es una plantilla que Meta cobra.
//
// Un aviso de "recibimos tu reporte" tiene fecha de vencimiento: informa mientras
// es noticia. Después confunde más de lo que ayuda, y el vecino igual tiene su
// número de ticket — se lo mostró la pantalla al enviar (TicketConfirmacion.jsx),
// no depende de este WhatsApp.
//
// OJO, esto aplica SOLO al aviso de creación. El de "resuelto" no vence: enterarse
// tarde de que tu problema se arregló sigue siendo una buena noticia, y ahí sí el
// WhatsApp puede ser la única forma de saberlo.

// Horas desde la creación a partir de las cuales el aviso ya no se manda.
// 24 h por defecto: dentro del mismo día el aviso todavía informa; al día
// siguiente ya no. Configurable en Render sin tocar código, y con 0 o un valor
// no numérico el tope queda apagado (se manda siempre, que es como se comportaba
// antes de este cambio).
const HORAS_POR_DEFECTO = 24

function leerTope(valorCrudo) {
  if (valorCrudo === undefined || valorCrudo === null || String(valorCrudo).trim() === '') {
    return HORAS_POR_DEFECTO
  }
  const numero = Number(valorCrudo)
  if (!Number.isFinite(numero) || numero < 0) return HORAS_POR_DEFECTO
  return numero
}

// Acepta lo que venga: Timestamp de Firestore, Date, string ISO o número.
// Devuelve null si no se puede interpretar — quien llame decide qué hacer con
// esa duda, y acá la duda SIEMPRE se resuelve mandando el aviso.
function horasDesde(fecha, ahora = Date.now()) {
  if (fecha === undefined || fecha === null) return null

  const instante =
    typeof fecha.toDate === 'function' ? fecha.toDate()
    : fecha instanceof Date ? fecha
    : new Date(fecha)

  if (!(instante instanceof Date) || Number.isNaN(instante.getTime())) return null

  return (ahora - instante.getTime()) / 3600000
}

// Decide si el aviso de creación ya está vencido.
//
// Devuelve { vencido, horas, tope } para que quien llame pueda dejarlo escrito
// en el registro: "no se mandó porque el reporte es de hace 73 h" se entiende;
// "no se mandó" a secas, no.
//
// Los tres casos en los que NO se considera vencido aunque uno podría pensar
// que sí, y son a propósito:
//
//   - Sin fecha de creación. Pasa si el documento se escribió sin ese campo.
//     Ante la duda se manda: dejar a un vecino sin aviso por un dato que falta
//     es peor que mandarle uno tarde.
//   - Fecha en el futuro (reloj desfasado, dato sembrado). horas sale negativo,
//     que nunca supera el tope.
//   - Tope en 0. Apaga la comprobación entera.
function avisoDeCreacionVencido(fechaCreacion, { topeHoras, ahora = Date.now() } = {}) {
  const tope = leerTope(topeHoras)
  const horas = horasDesde(fechaCreacion, ahora)

  if (tope === 0 || horas === null) {
    return { vencido: false, horas, tope }
  }

  return { vencido: horas > tope, horas, tope }
}

module.exports = { avisoDeCreacionVencido, horasDesde, HORAS_POR_DEFECTO }
