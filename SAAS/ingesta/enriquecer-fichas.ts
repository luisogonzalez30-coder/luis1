/**
 * FASE 2 — Fichas completas, solo de lo que le interesa a alguien.
 *
 * Acá es donde se gasta la cuota, así que acá es donde hay que ser tacaño.
 * Cada ficha cuesta 1 petición de las 10.000 diarias y ~7 segundos reales
 * (1,2 s de pausa más los reintentos por 429). Pedir la ficha de todo lo
 * publicado en un día es imposible en la práctica: no por la cuota, por el
 * tiempo.
 *
 * Por eso el orden es al revés de lo intuitivo: primero se cruza con las
 * preferencias usando SOLO el nombre —que ya vino gratis en el listado— y
 * después se pide la ficha de las que pasaron el filtro. La ficha sirve
 * para enriquecer y para afinar el cruce con los códigos ONU, que en el
 * listado no vienen.
 *
 *   npx tsx ingesta/enriquecer-fichas.ts --max=200
 */

import { crearCliente, ErrorChileCompra } from './lib/chilecompra.ts';
import { desdeFicha } from './lib/mapear.ts';
import { supabaseAdmin, upsertPorTandas } from './lib/supabase.ts';

const MAX_POR_CORRIDA = 200;

/**
 * Qué fichas pedir, en orden de urgencia.
 *
 * El criterio no es "las más nuevas" sino "las que alguien está esperando":
 * una licitación que no le pega a ninguna preferencia no necesita ficha,
 * por muy reciente que sea. Y entre las que sí, primero las que cierran
 * antes — una ficha que llega después del cierre no vale nada.
 */
async function fichasPendientes(max: number): Promise<string[]> {
  const db = supabaseAdmin();

  const { data, error } = await db.rpc('licitaciones_por_enriquecer', { p_max: max });

  if (error) {
    // Si la función todavía no existe (migración 0003 sin aplicar), se cae
    // a un criterio simple en vez de fallar: menos preciso, pero corre.
    console.warn(`  ⚠ sin priorización por preferencias (${error.message}); se usa orden por cierre`);
    const { data: simple, error: e2 } = await db
      .from('licitaciones_cache')
      .select('codigo_externo')
      .eq('detalle_cargado', false)
      .eq('codigo_estado', 5)
      .gt('fecha_cierre', new Date().toISOString())
      .order('fecha_cierre', { ascending: true })
      .limit(max);
    if (e2) throw new Error(`No se pudo leer la cola: ${e2.message}`);
    return (simple ?? []).map((r: any) => r.codigo_externo);
  }

  return (data ?? []).map((r: any) => r.codigo_externo);
}

async function main() {
  const max = Number(process.argv.find((a) => a.startsWith('--max='))?.split('=')[1] ?? MAX_POR_CORRIDA);
  const codigos = await fichasPendientes(max);

  if (codigos.length === 0) {
    console.log('Nada pendiente de enriquecer.');
    return;
  }

  console.log(`▸ ${codigos.length} fichas por pedir (~${Math.round(codigos.length * 7 / 60)} min a 7 s por ficha)`);

  // El presupuesto deja margen: si esta corrida se lleva las 10.000, la
  // recuperación de días de `ingestar-dia.ts` se queda sin cuota mañana.
  const mp = crearCliente({ presupuesto: Math.min(codigos.length + 20, 8_000) });

  const licitaciones: any[] = [];
  const compradores = new Map<string, any>();
  let fallidas = 0;

  for (const [i, codigo] of codigos.entries()) {
    try {
      const ficha = await mp.licitacion(codigo);
      const mapeada = desdeFicha(ficha);

      if (!mapeada) {
        console.warn(`  ⚠ ${codigo}: la ficha vino sin CodigoExterno ni Nombre`);
        fallidas++;
        continue;
      }

      licitaciones.push(mapeada.licitacion);
      if (mapeada.comprador) {
        compradores.set(mapeada.comprador.codigo_organismo, mapeada.comprador);
      }

      if ((i + 1) % 25 === 0) {
        console.log(`  ${i + 1}/${codigos.length}`);
      }
    } catch (e: any) {
      if (e instanceof ErrorChileCompra && /Presupuesto agotado/.test(e.message)) {
        console.warn(`  ⏸ ${e.message}`);
        break;   // lo que falta queda para la próxima corrida
      }
      console.warn(`  ⚠ ${codigo}: ${e.message}`);
      fallidas++;
    }
  }

  // Los compradores van PRIMERO: `licitaciones_cache.codigo_organismo` tiene
  // una FK contra `historial_compradores`. Al revés, la escritura falla
  // entera por violación de clave foránea.
  //
  // Solo se escriben identificación y ubicación. Las métricas de pago NO se
  // tocan acá: la API no las trae, y un upsert que mandara `dias_pago_*` en
  // null borraría lo que sí se sabe por otras fuentes.
  if (compradores.size > 0) {
    await upsertPorTandas('historial_compradores', [...compradores.values()], 'codigo_organismo');
    console.log(`  ✓ ${compradores.size} organismos`);
  }

  if (licitaciones.length > 0) {
    await upsertPorTandas('licitaciones_cache', licitaciones, 'codigo_externo');
    console.log(`  ✓ ${licitaciones.length} fichas completas`);
  }

  if (fallidas > 0) {
    console.warn(`  ⚠ ${fallidas} fichas no se pudieron traer; quedan pendientes`);
  }

  console.log(`\n${mp.llamadas} peticiones usadas · ${mp.presupuestoRestante} de presupuesto restante`);
}

main().catch((e) => {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
});
