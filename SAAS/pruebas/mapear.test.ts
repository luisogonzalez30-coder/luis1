import { desdeListado, desdeFicha, tipoDesdeCodigo } from '../ingesta/lib/mapear.ts';

let fallas = 0;
const comprobar = (ok: boolean, que: string, detalle?: unknown) => {
  if (!ok) { fallas++; console.log(`✗ ${que}`, detalle ?? ''); }
  else console.log(`✓ ${que}`);
};

// --- tipo desde el código ---------------------------------------------
comprobar(tipoDesdeCodigo('1509-12-LE26') === 'LE', 'tipo LE desde 1509-12-LE26');
comprobar(tipoDesdeCodigo('2239-2-LR26') === 'LR', 'tipo LR desde 2239-2-LR26');
comprobar(tipoDesdeCodigo('3300-1-L126') === 'L1', 'tipo L1 desde 3300-1-L126');
comprobar(tipoDesdeCodigo('sin-formato') === null, 'código sin formato -> null');

// --- listado (fase 1) --------------------------------------------------
const fila = desdeListado({
  CodigoExterno: '1509-12-LE26',
  Nombre: 'Servicio de plataforma web',
  CodigoEstado: 5,
  FechaCierre: '2026-07-15T15:00:00',
});
comprobar(fila?.codigo_externo === '1509-12-LE26', 'listado: código');
comprobar(fila?.tipo === 'LE', 'listado: tipo deducido del código');
comprobar(fila?.fecha_cierre === '2026-07-15T19:00:00.000Z', 'listado: cierre convertido a UTC', fila?.fecha_cierre);
comprobar(fila?.detalle_cargado === false, 'listado: marcado como sin ficha');
comprobar(desdeListado({ Nombre: 'sin código' }) === null, 'listado: sin CodigoExterno -> descartado');
comprobar(desdeListado({ CodigoExterno: 'X-1-LE26' }) === null, 'listado: sin Nombre -> descartado');

// --- ficha (fase 2) ----------------------------------------------------
const ficha = desdeFicha({
  Listado: [{
    CodigoExterno: '2239-2-LR26',
    Nombre: 'Convenio Marco Desarrollo de Software',
    Descripcion: 'Catálogo electrónico',
    CodigoEstado: 5,
    MontoEstimado: 4126,
    Moneda: 'Unidad de Fomento',          // 4.126 UF, NO 4.126 pesos
    Comprador: {
      CodigoOrganismo: '7002',
      NombreOrganismo: 'Servicio de Salud del Maule',
      RegionUnidad: 'Maule',
      ComunaUnidad: 'Talca',
    },
    Fechas: { FechaPublicacion: '2026-07-01T09:00:00', FechaCierre: '2026-07-15T15:00:00' },
    Items: { Listado: [
      { CodigoProducto: '81111500' },
      { CodigoProducto: '81112200' },
      { CodigoProducto: '81111500' },      // repetido a propósito
    ] },
  }],
});

comprobar(ficha?.licitacion.moneda === 'CLF', 'ficha: "Unidad de Fomento" -> CLF', ficha?.licitacion.moneda);
comprobar(ficha?.licitacion.monto_estimado === 4126, 'ficha: monto sin tocar');
comprobar(ficha?.licitacion.unspsc?.length === 2, 'ficha: códigos ONU sin repetidos', ficha?.licitacion.unspsc);
comprobar(ficha?.licitacion.detalle_cargado === true, 'ficha: marcada como completa');
comprobar(ficha?.comprador?.codigo_organismo === '7002', 'ficha: comprador extraído');
comprobar(ficha?.licitacion.fecha_publicacion === '2026-07-01T13:00:00.000Z', 'ficha: publicación en UTC');

// Nunca inventar un cero: un monto ausente tiene que quedar null, porque
// un 0 es indistinguible de un monto real y rompe el filtro por monto.
const sinMonto = desdeFicha({ CodigoExterno: 'X-1-LE26', Nombre: 'Algo', Comprador: {} });
comprobar(sinMonto?.licitacion.monto_estimado === null, 'ficha: monto ausente -> null, no 0', sinMonto?.licitacion.monto_estimado);
comprobar(sinMonto?.comprador === null, 'ficha: sin organismo -> comprador null');
comprobar(sinMonto?.licitacion.moneda === 'CLP', 'ficha: sin moneda -> CLP por omisión');

console.log(fallas === 0 ? '\nTodo verde' : `\n${fallas} fallas`);
process.exit(fallas === 0 ? 0 : 1);
