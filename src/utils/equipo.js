import { esDelMesActual } from './tiempo'

// Cruza el roster de trabajadores (trabajadores/{id}) con las incidencias para
// responder lo que el Alcalde pregunta al ver un nombre: en qué está, dónde
// está, cuántas horas lleva y de quién depende.
//
// El cruce se hace por `id` contra `presupuesto_estimado.trabajadores_asignados`
// (ver §17 en ESTADO_PROYECTO.md), que guarda `{id, nombre, tarifa_hora}` de
// cada persona elegida al presupuestar. Se compara por id y no por nombre a
// propósito: dos trabajadores pueden llamarse igual, y el nombre guardado es una
// copia del momento de la asignación que puede quedar desactualizada.

// ¿Está esta persona en el equipo asignado de esta incidencia?
function participaEn(incidencia, trabajadorId) {
  const asignados = incidencia?.presupuesto_estimado?.trabajadores_asignados
  if (!Array.isArray(asignados)) return false
  return asignados.some((t) => t.id === trabajadorId)
}

// Los trabajos "En Proceso" en los que esta persona está asignada. Son los que
// justifican el estado "Designado" y los que tienen una dirección real a la que
// ir — por eso se devuelven completos y no solo contados.
export function trabajosEnCursoDe(trabajadorId, incidencias) {
  return incidencias.filter((i) => i.estado === 'En Proceso' && participaEn(i, trabajadorId))
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
export function horasDeTrabajador(trabajadorId, incidencias) {
  let comprometidas = 0
  let esteMes = 0
  let historicas = 0
  let trabajosCerrados = 0

  for (const incidencia of incidencias) {
    if (!participaEn(incidencia, trabajadorId)) continue

    if (incidencia.estado === 'En Proceso') {
      comprometidas += incidencia.presupuesto_estimado?.horas_estimadas || 0
      continue
    }

    if (incidencia.estado === 'Resuelto') {
      const reales = incidencia.gasto_real?.horas_reales || 0
      historicas += reales
      trabajosCerrados += 1
      if (esDelMesActual(incidencia.fecha_cierre)) esteMes += reales
    }
  }

  return { comprometidas, esteMes, historicas, trabajosCerrados }
}

// Un cargo es de jefatura si lo dice su nombre. El roster no tiene un campo
// booleano para esto (los cargos son texto libre que escribe el Jefe de
// Departamento), así que se detecta por el texto — con `normalize` para que
// "Jefe", "jefe" y "Jefatura" caigan todos.
export function esCargoDeJefatura(cargo) {
  if (!cargo) return false
  const limpio = cargo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  return limpio.includes('jefe') || limpio.includes('jefatura') || limpio.includes('supervisor') || limpio.includes('capataz')
}

// De quién depende una persona. Son dos niveles distintos y el Alcalde necesita
// los dos: el funcionario con cuenta que responde por el departamento completo,
// y —si existe— el jefe de cuadrilla que está en terreno con ella.
//
// `funcionarios` viene de usuarios_municipales (suscribirFuncionarios);
// `companeros` es el roster del mismo departamento.
export function jefaturaDe({ departamento, funcionarios = [], companeros = [], trabajadorId = null }) {
  const jefeDepartamento = funcionarios.find(
    (f) => f.rol === 'JEFE_DEPARTAMENTO' && f.departamento === departamento
  ) || null

  // El jefe de cuadrilla no puede ser la persona misma: si el que estamos
  // mirando ES el jefe de cuadrilla, su jefatura directa es el Jefe de
  // Departamento y nada más.
  const jefeCuadrilla = companeros.find(
    (t) => t.id !== trabajadorId && esCargoDeJefatura(t.cargo)
  ) || null

  return { jefeDepartamento, jefeCuadrilla }
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
