/**
 * Cliente de Supabase para el backend.
 *
 * Usa la SERVICE ROLE KEY, que **salta RLS por diseño**. Es la clave con la
 * que se escribe el caché, y es equivalente a la contraseña de la base:
 *   · nunca en el frontend, nunca en una variable `NEXT_PUBLIC_*`
 *   · nunca en un log, nunca en un mensaje de error
 *   · si se filtra, se rota desde el panel de Supabase, no se "revoca"
 *
 * El frontend usa la clave `anon` y todo lo que puede leer lo deciden las
 * políticas de RLS de `0001_esquema_inicial.sql`.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cliente: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cliente) return cliente;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    // Se nombra la variable que falta, nunca su valor.
    const faltan = [!url && 'SUPABASE_URL', !key && 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean);
    throw new Error(`Faltan variables de entorno: ${faltan.join(', ')}. Ver .env.example.`);
  }

  cliente = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cliente;
}

/**
 * Upsert por tandas.
 *
 * PostgREST tiene un tope de tamaño de cuerpo, y un día flojo de Mercado
 * Público son cientos de licitaciones con su JSON crudo adentro. Mandar
 * todo en un solo `upsert` funciona en pruebas y falla el día que hay
 * volumen — que es justo el día que importa.
 *
 * Devuelve cuántas filas se escribieron, y falla ruidosamente: un error de
 * escritura silenciado deja el caché incompleto y las alertas se pierden
 * sin que nadie se entere.
 */
export async function upsertPorTandas<T extends object>(
  tabla: string,
  filas: T[],
  onConflict: string,
  tamanoTanda = 200,
): Promise<number> {
  if (filas.length === 0) return 0;

  const db = supabaseAdmin();
  let escritas = 0;

  for (let i = 0; i < filas.length; i += tamanoTanda) {
    const tanda = filas.slice(i, i + tamanoTanda);
    const { error } = await db.from(tabla).upsert(tanda, { onConflict, ignoreDuplicates: false });

    if (error) {
      throw new Error(
        `Fallo al escribir en ${tabla} (tanda ${i / tamanoTanda + 1}, ${tanda.length} filas): ${error.message}`,
      );
    }
    escritas += tanda.length;
  }

  return escritas;
}
