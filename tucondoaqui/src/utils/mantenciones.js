// Calendario de mantenciones y certificaciones obligatorias de un condominio
// (vertical TuCondoAquí).
//
// POR QUÉ ESTO ES EL NÚCLEO DEL PRODUCTO Y NO UN ACCESORIO
//
// La Ley 21.442 de Copropiedad Inmobiliaria pone sobre el administrador el
// deber de ejecutar las inspecciones y certificaciones obligatorias de las
// instalaciones del condominio —ascensores, gas, electricidad, equipos contra
// incendio, agua— y de mantener un plan de emergencia. El incumplimiento se
// sanciona, y frente a un siniestro la responsabilidad recae sobre quien
// administra.
//
// El software de administración que hoy existe en Chile está construido
// alrededor del DINERO (gasto común, recaudación, conciliación bancaria). El
// vencimiento de una certificación no vive en ninguno de esos sistemas: vive
// en una planilla Excel, en la memoria del administrador, o en ninguna parte.
// Ver docs/ESTUDIO-MERCADO.md — es el hueco más grande y el más
// caro del mercado.
//
// ⚠️ SOBRE LAS PERIODICIDADES DE ABAJO
//
// Son valores POR DEFECTO, editables por condominio. La periodicidad real de
// cada obligación depende de la normativa vigente, del reglamento de
// copropiedad, del manual del fabricante del equipo y del uso que se le dé.
// El sistema no decide la ley: lleva el calendario que el administrador (o su
// asesor legal) configura, y avisa antes de que se venza. Nunca se debe
// presentar la lista como asesoría legal, ni al vender ni en pantalla.

export const ESTADO_MANTENCION = {
  AL_DIA: 'Al día',
  POR_VENCER: 'Por vencer',
  VENCIDA: 'Vencida',
  SIN_REGISTRO: 'Sin registro',
}

// Cuántos días antes del vencimiento se enciende la alerta amarilla. 60 días
// es el plazo con el que alcanza a cotizar, aprobar en comité y agendar al
// proveedor sin llegar al vencimiento — que es exactamente el problema que
// hoy hace que las certificaciones se renueven atrasadas.
export const DIAS_AVISO_ANTICIPADO = 60

// `evidencia` es el documento que prueba el cumplimiento. Importa: sin el
// papel cargado, el registro en la app no sirve ante una fiscalización ni ante
// la aseguradora.
export const OBLIGACIONES = [
  {
    id: 'certificacion_ascensores',
    nombre: 'Certificación de ascensores',
    grupo: 'Ascensores y Accesos',
    periodicidad_meses: 12,
    responsable: 'Proveedor Externo',
    evidencia: 'Certificado del organismo certificador',
    base_legal: 'Ley 21.442 art. 20 (inspecciones y certificaciones obligatorias)',
    solo_si: 'tiene_ascensores',
  },
  {
    id: 'mantencion_ascensores',
    nombre: 'Mantención preventiva de ascensores',
    grupo: 'Ascensores y Accesos',
    periodicidad_meses: 1,
    responsable: 'Proveedor Externo',
    evidencia: 'Informe mensual firmado por el servicio técnico',
    base_legal: 'Contrato de mantención + manual del fabricante',
    solo_si: 'tiene_ascensores',
  },
  {
    id: 'extintores',
    nombre: 'Recarga y certificación de extintores',
    grupo: 'Gas e Incendios',
    periodicidad_meses: 12,
    responsable: 'Proveedor Externo',
    evidencia: 'Etiqueta vigente + factura del servicio',
    base_legal: 'Ley 21.442 art. 20 (equipos de seguridad)',
  },
  {
    id: 'red_humeda',
    nombre: 'Revisión de red húmeda y red seca',
    grupo: 'Gas e Incendios',
    periodicidad_meses: 12,
    responsable: 'Proveedor Externo',
    evidencia: 'Informe de presión y estado',
    base_legal: 'Ley 21.442 art. 20 (equipos de seguridad)',
  },
  {
    id: 'deteccion_incendio',
    nombre: 'Prueba del sistema de detección y alarma de incendio',
    grupo: 'Gas e Incendios',
    periodicidad_meses: 12,
    responsable: 'Proveedor Externo',
    evidencia: 'Protocolo de prueba del sistema',
    base_legal: 'Ley 21.442 art. 20 (equipos de seguridad)',
  },
  {
    id: 'instalacion_gas',
    nombre: 'Certificación de la instalación interior de gas',
    grupo: 'Gas e Incendios',
    periodicidad_meses: 24,
    responsable: 'Proveedor Externo',
    evidencia: 'Declaración del instalador autorizado ante la SEC',
    base_legal: 'Normativa SEC + Ley 21.442 art. 20',
    solo_si: 'tiene_gas_comun',
  },
  {
    id: 'instalacion_electrica',
    nombre: 'Revisión de la instalación eléctrica común',
    grupo: 'Electricidad e Iluminación',
    periodicidad_meses: 12,
    responsable: 'Proveedor Externo',
    evidencia: 'Informe del instalador autorizado',
    base_legal: 'Normativa SEC + Ley 21.442 art. 20',
  },
  {
    id: 'estanques_agua',
    nombre: 'Limpieza y sanitización de estanques de agua',
    grupo: 'Agua y Filtraciones',
    periodicidad_meses: 6,
    responsable: 'Proveedor Externo',
    evidencia: 'Certificado de sanitización',
    base_legal: 'Normativa sanitaria + Ley 21.442 art. 20',
  },
  {
    id: 'bombas_agua',
    nombre: 'Mantención de bombas de agua y presurización',
    grupo: 'Agua y Filtraciones',
    periodicidad_meses: 6,
    responsable: 'Proveedor Externo',
    evidencia: 'Informe del servicio técnico',
    base_legal: 'Manual del fabricante',
  },
  {
    id: 'grupo_electrogeno',
    nombre: 'Mantención y prueba del grupo electrógeno',
    grupo: 'Electricidad e Iluminación',
    periodicidad_meses: 6,
    responsable: 'Proveedor Externo',
    evidencia: 'Informe de prueba en carga',
    base_legal: 'Manual del fabricante',
    solo_si: 'tiene_grupo_electrogeno',
  },
  {
    id: 'plan_emergencia',
    nombre: 'Actualización del plan de emergencia',
    grupo: 'Gas e Incendios',
    periodicidad_meses: 12,
    responsable: 'Administración',
    evidencia: 'Plan actualizado + constancia de entrega a Carabineros y Bomberos de el condominio',
    base_legal: 'Ley 21.442 (plan de emergencia del condominio)',
  },
  {
    id: 'fumigacion',
    nombre: 'Desratización y control de plagas',
    grupo: 'Aseo y Áreas Verdes',
    periodicidad_meses: 6,
    responsable: 'Proveedor Externo',
    evidencia: 'Certificado de la empresa aplicadora',
    base_legal: 'Normativa sanitaria',
  },
  {
    id: 'piscina',
    nombre: 'Autorización sanitaria y análisis de agua de piscina',
    grupo: 'Aseo y Áreas Verdes',
    periodicidad_meses: 12,
    responsable: 'Administración',
    evidencia: 'Resolución sanitaria de la temporada',
    base_legal: 'Reglamento de piscinas de uso público',
    solo_si: 'tiene_piscina',
  },
  {
    id: 'rendicion_cuentas',
    nombre: 'Rendición de cuentas al comité de administración',
    grupo: 'Administración y Cuentas',
    periodicidad_meses: 1,
    responsable: 'Administración',
    evidencia: 'Rendición mensual entregada al comité',
    base_legal: 'Ley 21.442 (deberes del administrador)',
  },
]

const MS_POR_DIA = 24 * 60 * 60 * 1000

function sumarMeses(fecha, meses) {
  const resultado = new Date(fecha.getTime())
  resultado.setMonth(resultado.getMonth() + meses)
  return resultado
}

function aFecha(valor) {
  if (!valor) return null
  // Acepta Timestamp de Firestore, Date y string ISO: los tres llegan según
  // venga del cliente, del listener o de un script de mantención.
  const fecha = typeof valor?.toDate === 'function' ? valor.toDate() : new Date(valor)
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

// Calcula en qué situación está UNA obligación, dada la fecha de su última
// ejecución. `hoy` es parámetro (y no `new Date()` adentro) para que la
// función sea pura y se pueda probar sin tocar el reloj del sistema.
export function estadoMantencion(obligacion, ultimaFecha, hoy = new Date()) {
  const ultima = aFecha(ultimaFecha)

  if (!ultima) {
    return { estado: ESTADO_MANTENCION.SIN_REGISTRO, vence: null, diasRestantes: null }
  }

  const vence = sumarMeses(ultima, obligacion.periodicidad_meses)
  const diasRestantes = Math.ceil((vence.getTime() - hoy.getTime()) / MS_POR_DIA)

  let estado = ESTADO_MANTENCION.AL_DIA
  if (diasRestantes < 0) estado = ESTADO_MANTENCION.VENCIDA
  else if (diasRestantes <= DIAS_AVISO_ANTICIPADO) estado = ESTADO_MANTENCION.POR_VENCER

  return { estado, vence, diasRestantes }
}

// Qué obligaciones aplican a este condominio. Un conjunto de casas sin
// ascensor no tiene que ver "certificación de ascensores" en rojo para
// siempre: la lista se filtra por lo que el condominio declara tener.
export function obligacionesAplicables(condominio) {
  const instalaciones = condominio?.instalaciones || {}
  return OBLIGACIONES.filter((o) => !o.solo_si || instalaciones[o.solo_si] === true)
}

const ORDEN_ESTADO = {
  [ESTADO_MANTENCION.VENCIDA]: 0,
  [ESTADO_MANTENCION.SIN_REGISTRO]: 1,
  [ESTADO_MANTENCION.POR_VENCER]: 2,
  [ESTADO_MANTENCION.AL_DIA]: 3,
}

// El plan completo, ordenado por urgencia real: primero lo vencido, después lo
// que nunca se registró (que a efectos de una fiscalización es igual de malo,
// pero puede ser solo falta de carga), después lo que está por vencer.
//
// `registros` es un mapa { [obligacion.id]: { ultima_fecha, proveedor, documento_url,
// periodicidad_meses? } } tal como se guarda en condominios/{slug}/mantenciones.
//
// `periodicidad_meses` en el registro PISA a la del catálogo. Existe porque la
// periodicidad real depende del contrato con el proveedor, del manual del
// equipo y del reglamento de copropiedad: dos condominios pueden tener el mismo
// ascensor con visitas mensuales y quincenales. El default del catálogo es un
// punto de partida, no una regla.
export function planMantenciones(condominio, registros = {}, hoy = new Date()) {
  return obligacionesAplicables(condominio)
    .map((obligacion) => {
      const registro = registros[obligacion.id] || {}
      const periodicidad = Number(registro.periodicidad_meses) || obligacion.periodicidad_meses
      const efectiva = { ...obligacion, periodicidad_meses: periodicidad }

      return {
        ...efectiva,
        ...estadoMantencion(efectiva, registro.ultima_fecha, hoy),
        periodicidad_personalizada: periodicidad !== obligacion.periodicidad_meses,
        ultima_fecha: registro.ultima_fecha || null,
        proveedor: registro.proveedor || '',
        documento_url: registro.documento_url || '',
        historial: Array.isArray(registro.historial) ? registro.historial : [],
      }
    })
    .sort((a, b) => {
      const porEstado = ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado]
      if (porEstado !== 0) return porEstado
      return (a.diasRestantes ?? Infinity) - (b.diasRestantes ?? Infinity)
    })
}

// Resumen de una línea para el panel del administrador y para el informe que
// se le entrega al comité: cuántas obligaciones están en cada situación.
export function resumenCumplimiento(plan) {
  const conteo = {
    [ESTADO_MANTENCION.VENCIDA]: 0,
    [ESTADO_MANTENCION.SIN_REGISTRO]: 0,
    [ESTADO_MANTENCION.POR_VENCER]: 0,
    [ESTADO_MANTENCION.AL_DIA]: 0,
  }

  for (const item of plan) conteo[item.estado]++

  const total = plan.length
  const cumplidas = conteo[ESTADO_MANTENCION.AL_DIA] + conteo[ESTADO_MANTENCION.POR_VENCER]

  return {
    ...conteo,
    total,
    // Porcentaje de cumplimiento: "por vencer" cuenta como cumplido porque
    // todavía lo está. Vencida y sin registro, no.
    porcentaje: total === 0 ? 100 : Math.round((cumplidas / total) * 100),
  }
}

// Texto corto de periodicidad para la UI. Se escribe acá y no en el componente
// porque lo usan la tarjeta, el modal y el informe, y son tres lugares donde
// "cada 12 meses" tiene que decirse igual.
export function textoPeriodicidad(meses) {
  if (meses === 1) return 'Mensual'
  if (meses === 3) return 'Trimestral'
  if (meses === 6) return 'Semestral'
  if (meses === 12) return 'Anual'
  if (meses === 24) return 'Cada 2 años'
  return `Cada ${meses} meses`
}

// Fecha en formato chileno a partir de un Date, un Timestamp o un 'YYYY-MM-DD'.
// No se reusó utils/tiempo.js porque aquel exige Timestamp de Firestore y acá
// las fechas son strings: el administrador escribe "el certificado es del 3 de
// marzo", no un instante con hora.
export function formatearDia(valor) {
  const fecha = aFecha(valor)
  if (!fecha) return '—'
  return fecha.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Frase de vencimiento lista para mostrar. Devuelve el texto y nada más: la
// decisión de qué color usar es del componente, que es quien sabe en qué
// superficie lo va a pintar.
export function textoVencimiento({ estado, vence, diasRestantes }) {
  if (estado === ESTADO_MANTENCION.SIN_REGISTRO) return 'Nunca se ha registrado'
  if (diasRestantes === null) return '—'
  if (diasRestantes < 0) {
    const dias = Math.abs(diasRestantes)
    return `Venció hace ${dias} día${dias === 1 ? '' : 's'} (${formatearDia(vence)})`
  }
  if (diasRestantes === 0) return `Vence hoy (${formatearDia(vence)})`
  return `Vence en ${diasRestantes} día${diasRestantes === 1 ? '' : 's'} (${formatearDia(vence)})`
}
