import { esDelMesActual } from './tiempo'

// Cruza el roster de trabajadores (trabajadores/{id}) con las solicitudes para
// responder lo que el Administrador pregunta al ver un nombre: en qué está, dónde
// está, cuántas horas lleva y de quién depende.
//
// El cruce se hace por `id` contra `presupuesto_estimado.trabajadores_asignados`
//, que guarda `{id, nombre, tarifa_hora}` de
// cada persona elegida al presupuestar. Se compara por id y no por nombre a
// propósito: dos trabajadores pueden llamarse igual, y el nombre guardado es una
// copia del momento de la asignación que puede quedar desactualizada.

// ¿Está esta persona en el equipo asignado de esta solicitud?
function participaEn(solicitud, trabajadorId) {
  const asignados = solicitud?.presupuesto_estimado?.trabajadores_asignados
  if (!Array.isArray(asignados)) return false
  return asignados.some((t) => t.id === trabajadorId)
}

// Los trabajos "En Proceso" en los que esta persona está asignada. Son los que
// justifican el estado "Designado" y los que tienen una dirección real a la que
// ir — por eso se devuelven completos y no solo contados.
export function trabajosEnCursoDe(trabajadorId, solicitudes) {
  return solicitudes.filter((i) => i.estado === 'En Proceso' && participaEn(i, trabajadorId))
}

// Horas de una persona. Tres números distintos que responden preguntas
// distintas, y conviene no mezclarlos:
// - comprometidas: horas estimadas de lo que tiene abierto ahora mismo.
// - esteMes: horas REALES de lo que ya cerró dentro del mes calendario.
// - historicas: horas reales de todo lo que ha cerrado.
//
// Importante y a propósito: NO existe "horas trabajadas hoy". La asistencia solo
// guarda una fecha (`fecha_asistencia`, "YYYY-MM-DD"), no una hora de entrada,
// así que cualquier cifra diaria sería inventada. Ver trabajadoresService.js.
export function horasDeTrabajador(trabajadorId, solicitudes) {
  let comprometidas = 0
  let esteMes = 0
  let historicas = 0
  let trabajosCerrados = 0

  for (const solicitud of solicitudes) {
    if (!participaEn(solicitud, trabajadorId)) continue

    if (solicitud.estado === 'En Proceso') {
      comprometidas += solicitud.presupuesto_estimado?.horas_estimadas || 0
      continue
    }

    if (solicitud.estado === 'Resuelto') {
      const reales = solicitud.gasto_real?.horas_reales || 0
      historicas += reales
      trabajosCerrados += 1
      if (esDelMesActual(solicitud.fecha_cierre)) esteMes += reales
    }
  }

  return { comprometidas, esteMes, historicas, trabajosCerrados }
}

// Un cargo es de jefatura si lo dice su nombre. El roster no tiene un campo
// booleano para esto (los cargos son texto libre que escribe el Jefe de
// Area), así que se detecta por el texto — con `normalize` para que
// "Jefe", "jefe" y "Jefatura" caigan todos.
export function esCargoDeJefatura(cargo) {
  if (!cargo) return false
  const limpio = cargo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  return limpio.includes('jefe') || limpio.includes('jefatura') || limpio.includes('supervisor') || limpio.includes('capataz')
}

// De quién depende una persona. Son dos niveles distintos y el Administrador necesita
// los dos: el usuario con cuenta que responde por el área completo,
// y —si existe— el jefe de equipo que está en terreno con ella.
//
// `usuarios` viene de usuarios_condominio (suscribirUsuarios);
// `companeros` es el roster del mismo area.
export function jefaturaDe({ area, usuarios = [], companeros = [], trabajadorId = null }) {
  const jefeArea = usuarios.find(
    (f) => f.rol === 'COMITE' && f.area === area
 ) || null

  // El jefe de equipo no puede ser la persona misma: si el que estamos
  // mirando ES el jefe de equipo, su jefatura directa es el Jefe de
  // Area y nada más.
  const jefeEquipo = companeros.find(
    (t) => t.id !== trabajadorId && esCargoDeJefatura(t.cargo)
 ) || null

  return { jefeArea, jefeEquipo }
}

// Enlace de WhatsApp a partir de un teléfono guardado en cualquier formato.
// Devuelve null si no hay número, para que quien lo use no tenga que decidir.
export function enlaceWhatsapp(telefono) {
  if (!telefono) return null
  const digitos = String(telefono).replace(/\D/g, '')
  if (digitos.length < 8) return null
  const conPais = digitos.startsWith('56') ? digitos : `56${digitos}`
  return `https://wa.me/${conPais}`
}
