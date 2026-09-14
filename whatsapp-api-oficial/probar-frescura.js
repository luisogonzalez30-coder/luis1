// Pruebas del tope de antigüedad del aviso de creación (frescura.js).
//
//   node probar-frescura.js
//
// Existe por el corte del 11-sep-2026: Render suspendió el servicio tres días y,
// al volver, el listener iba a mandar de golpe todos los avisos pendientes —
// "recibimos tu reporte" a vecinos cuyo reporte era del lunes.
//
// Lo que cuidan estas pruebas es lo único delicado del cambio: que el tope NO se
// coma avisos que sí hay que mandar. Un aviso de más molesta; uno de menos deja
// a un vecino creyendo que su reporte no entró. Por eso la mitad de los casos de
// abajo comprueban que ante cualquier duda —sin fecha, fecha ilegible, reloj
// desfasado, tope mal configurado— la respuesta sea "mándalo igual".

const { avisoDeCreacionVencido, horasDesde, HORAS_POR_DEFECTO } = require('./frescura')

let pasadas = 0
let fallidas = 0

function afirmar(condicion, nombre, detalle) {
  if (condicion) {
    pasadas++
    console.log(`  ✓ ${nombre}`)
  } else {
    fallidas++
    console.log(`  ✗ ${nombre}${detalle !== undefined ? ` — ${JSON.stringify(detalle)}` : ''}`)
  }
}

// Instante fijo, para que las pruebas no dependan de cuándo se corran.
const AHORA = new Date('2026-09-14T12:00:00Z').getTime()
const haceHoras = (h) => new Date(AHORA - h * 3600000)

// Timestamp de Firestore de mentira: lo único que se usa de él es .toDate().
const comoTimestamp = (fecha) => ({ toDate: () => fecha })

console.log('\nhorasDesde()')
{
  afirmar(Math.round(horasDesde(haceHoras(5), AHORA)) === 5, 'Date de hace 5 h → 5')
  afirmar(Math.round(horasDesde(comoTimestamp(haceHoras(73)), AHORA)) === 73, 'Timestamp de Firestore de hace 73 h → 73')
  afirmar(Math.round(horasDesde(haceHoras(2).toISOString(), AHORA)) === 2, 'string ISO de hace 2 h → 2')
  afirmar(horasDesde(null, AHORA) === null, 'null → null')
  afirmar(horasDesde(undefined, AHORA) === null, 'undefined → null')
  afirmar(horasDesde('no es una fecha', AHORA) === null, 'texto ilegible → null')
  afirmar(horasDesde(haceHoras(-3), AHORA) < 0, 'fecha en el futuro → negativo')
}

console.log('\nQué SÍ se considera vencido')
{
  const r = avisoDeCreacionVencido(comoTimestamp(haceHoras(73)), { ahora: AHORA })
  afirmar(r.vencido === true, 'reporte de hace 73 h con tope por defecto (24 h)', r)
  afirmar(Math.round(r.horas) === 73, 'informa cuántas horas tenía, para poder escribirlo en el registro', r)
  afirmar(r.tope === HORAS_POR_DEFECTO, 'informa contra qué tope se comparó', r)

  const justoPasado = avisoDeCreacionVencido(comoTimestamp(haceHoras(24.5)), { ahora: AHORA })
  afirmar(justoPasado.vencido === true, 'media hora pasado el tope ya está vencido', justoPasado)

  const topeCorto = avisoDeCreacionVencido(comoTimestamp(haceHoras(3)), { topeHoras: 2, ahora: AHORA })
  afirmar(topeCorto.vencido === true, 'respeta un tope más corto configurado a mano', topeCorto)
}

console.log('\nQué NO se considera vencido — ante la duda, se manda')
{
  const reciente = avisoDeCreacionVencido(comoTimestamp(haceHoras(3)), { ahora: AHORA })
  afirmar(reciente.vencido === false, 'reporte de hace 3 h', reciente)

  const justoEnElTope = avisoDeCreacionVencido(comoTimestamp(haceHoras(24)), { ahora: AHORA })
  afirmar(justoEnElTope.vencido === false, 'exactamente 24 h no está vencido (el tope es "más de")', justoEnElTope)

  const sinFecha = avisoDeCreacionVencido(undefined, { ahora: AHORA })
  afirmar(sinFecha.vencido === false, 'SIN fecha de creación se manda igual', sinFecha)

  const fechaRota = avisoDeCreacionVencido('cualquier cosa', { ahora: AHORA })
  afirmar(fechaRota.vencido === false, 'con fecha ilegible se manda igual', fechaRota)

  const futuro = avisoDeCreacionVencido(comoTimestamp(haceHoras(-10)), { ahora: AHORA })
  afirmar(futuro.vencido === false, 'con el reloj desfasado hacia el futuro se manda igual', futuro)

  const apagado = avisoDeCreacionVencido(comoTimestamp(haceHoras(500)), { topeHoras: 0, ahora: AHORA })
  afirmar(apagado.vencido === false, 'tope en 0 apaga la comprobación, aunque sean 500 h', apagado)
}

console.log('\nUn tope mal configurado no puede apagar los avisos ni dejarlos pasar todos')
{
  // El valor viene de una variable de entorno, o sea de alguien escribiendo a
  // mano en el panel de Render. Cualquier cosa rara cae al valor por defecto,
  // que es el comportamiento conocido.
  for (const malo of ['', '  ', 'veinticuatro', '-5', null, undefined, {}]) {
    const r = avisoDeCreacionVencido(comoTimestamp(haceHoras(10)), { topeHoras: malo, ahora: AHORA })
    afirmar(
      r.tope === HORAS_POR_DEFECTO && r.vencido === false,
      `tope ${JSON.stringify(malo)} → cae al valor por defecto`,
      r
    )
  }
}

console.log(`\n${pasadas} pasadas, ${fallidas} fallidas\n`)
process.exit(fallidas > 0 ? 1 : 0)
