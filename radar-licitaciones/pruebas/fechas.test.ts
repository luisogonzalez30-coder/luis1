import { aFechaApi, desdeHoraChilena } from '../ingesta/lib/fechas.ts';

const casos: [string, string, string][] = [
  // [entrada de la API, esperado UTC, por qué]
  ['2026-01-15T15:00:00', '2026-01-15T18:00:00.000Z', 'verano chileno: UTC-3'],
  ['2026-07-15T15:00:00', '2026-07-15T19:00:00.000Z', 'invierno chileno: UTC-4'],
  ['2026-09-15T09:30:00', '2026-09-15T12:30:00.000Z', 'septiembre, ya con horario de verano'],
  ['2026-05-20T23:59:00', '2026-05-21T03:59:00.000Z', 'cruza el día al pasar a UTC'],
];

let fallas = 0;
for (const [entrada, esperado, porque] of casos) {
  const obtenido = desdeHoraChilena(entrada);
  const ok = obtenido === esperado;
  if (!ok) fallas++;
  console.log(`${ok ? '✓' : '✗'} ${entrada} -> ${obtenido}   (${porque})`);
  if (!ok) console.log(`   esperado: ${esperado}`);
}

// Casos que deben devolver null en vez de inventar una fecha
for (const basura of ['', '   ', 'sin fecha', null, undefined, 42, '15-09-2026']) {
  const r = desdeHoraChilena(basura as any);
  const ok = r === null;
  if (!ok) fallas++;
  console.log(`${ok ? '✓' : '✗'} ${JSON.stringify(basura)} -> ${r}`);
}

// Si la API algún día empieza a mandar zona, se respeta
const conZona = desdeHoraChilena('2026-07-15T15:00:00-04:00');
console.log(`${conZona === '2026-07-15T19:00:00.000Z' ? '✓' : '✗'} con offset explícito -> ${conZona}`);
if (conZona !== '2026-07-15T19:00:00.000Z') fallas++;

// Formato DDMMAAAA
const f = aFechaApi(new Date('2026-08-05T12:00:00Z'));
console.log(`${f === '05082026' ? '✓' : '✗'} aFechaApi -> ${f}`);
if (f !== '05082026') fallas++;

console.log(fallas === 0 ? '\nTodo verde' : `\n${fallas} fallas`);
process.exit(fallas === 0 ? 0 : 1);
