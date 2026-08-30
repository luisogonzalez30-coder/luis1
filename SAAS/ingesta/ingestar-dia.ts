/**
 * FASE 1 — Listado del día.
 *
 * Una sola petición a la API trae todas las licitaciones cuyo estado cambió
 * en esa fecha. Se guardan con los campos mínimos y `detalle_cargado = false`.
 * La ficha completa la pide `enriquecer-fichas.ts`, y solo de las que le
 * pegaron a alguna preferencia.
 *
 *   npx tsx ingesta/ingestar-dia.ts              # hoy
 *   npx tsx ingesta/ingestar-dia.ts 2026-08-29   # una fecha
 *   npx tsx ingesta/ingestar-dia.ts --dias=7     # los últimos 7 días
 *
 * Por qué recuperar días hacia atrás y no solo hoy: si el cron falla una
 * noche —y va a fallar— el día siguiente hay que rellenarlo, y este endpoint
 * es el único que lo permite. Correrlo con `--dias=3` a diario cuesta 3
 * peticiones de 10.000 y hace la ingesta tolerante a fallas.
 */

import { crearCliente, ErrorChileCompra } from './lib/chilecompra.ts';
import { aFechaApi } from './lib/fechas.ts';
import { desdeListado, type FilaLicitacion } from './lib/mapear.ts';
import { upsertPorTandas } from './lib/supabase.ts';

function leerArgumentos(argv: string[]) {
  const dias = Number(argv.find((a) => a.startsWith('--dias='))?.split('=')[1] ?? '1');
  const fechaSuelta = argv.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
  return {
    dias: Number.isFinite(dias) && dias > 0 ? Math.min(dias, 30) : 1,
    fechaSuelta,
  };
}

async function main() {
  const { dias, fechaSuelta } = leerArgumentos(process.argv.slice(2));

  // Presupuesto conservador: esta fase es barata, la cara es la fase 2.
  const mp = crearCliente({ presupuesto: 50 });

  const fechas: Date[] = fechaSuelta
    ? [new Date(`${fechaSuelta}T12:00:00Z`)]
    : Array.from({ length: dias }, (_, i) => new Date(Date.now() - i * 86_400_000));

  let totalNuevas = 0;

  for (const fecha of fechas) {
    const ddmmaaaa = aFechaApi(fecha);
    console.log(`\n▸ Listado del ${ddmmaaaa}`);

    let respuesta: any;
    try {
      respuesta = await mp.licitacionesPorFecha(ddmmaaaa);
    } catch (e) {
      if (e instanceof ErrorChileCompra) {
        console.error(`  ✗ ${e.message}`);
        // Un día que falla no debe abortar los otros: se sigue y se reporta
        // al final. Abortar entero por un 500 puntual pierde datos que sí
        // se podían traer.
        continue;
      }
      throw e;
    }

    const listado: any[] = respuesta?.Listado ?? [];
    if (listado.length === 0) {
      console.log('  sin licitaciones publicadas ese día');
      continue;
    }

    const filas = listado
      .map(desdeListado)
      .filter((f): f is FilaLicitacion => f !== null);

    const descartadas = listado.length - filas.length;
    if (descartadas > 0) {
      console.warn(`  ⚠ ${descartadas} registros sin CodigoExterno o sin Nombre, descartados`);
    }

    // Deduplicar dentro de la misma tanda: la API repite códigos cuando una
    // licitación cambió de estado dos veces el mismo día, y un upsert con
    // dos filas del mismo `codigo_externo` falla entero
    // ("ON CONFLICT DO UPDATE command cannot affect row a second time").
    const unicas = [...new Map(filas.map((f) => [f.codigo_externo, f])).values()];
    if (unicas.length !== filas.length) {
      console.log(`  ${filas.length - unicas.length} códigos repetidos en el mismo día, unificados`);
    }

    // `detalle_cargado` se OMITE del payload a propósito. PostgREST arma un
    // `ON CONFLICT DO UPDATE SET` con las columnas que vienen, así que
    // mandarlo en `false` borraría el `true` que dejó la fase 2 y la ficha
    // se volvería a pedir todos los días —una petición de la cuota diaria
    // por licitación, para nada—. Omitiéndolo: en el insert lo pone el
    // DEFAULT de la columna, y en el update no se toca.
    const paraEscribir = unicas.map(({ detalle_cargado: _omitido, ...resto }) => resto);

    const escritas = await upsertPorTandas('licitaciones_cache', paraEscribir, 'codigo_externo');
    totalNuevas += escritas;
    console.log(`  ✓ ${escritas} licitaciones al día`);
  }

  console.log(`\n${totalNuevas} filas escritas · ${mp.llamadas} peticiones usadas · ${mp.presupuestoRestante} de presupuesto restante`);
}

main().catch((e) => {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
});
