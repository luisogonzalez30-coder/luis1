/**
 * Fechas de ChileCompra.
 *
 * Acá está la trampa más cara de toda la integración, y es silenciosa:
 * la API devuelve las fechas SIN zona horaria (`"2026-09-15T15:00:00"`),
 * y son hora de Chile continental. Si ese string se guarda tal cual en una
 * columna `timestamptz`, Postgres lo interpreta en la zona del servidor
 * —UTC en Supabase— y el cierre queda corrido 3 o 4 horas.
 *
 * Para un producto cuyo valor es avisar antes de que cierre el plazo, eso
 * no es un detalle: es decirle al usuario que le quedan 5 horas cuando le
 * quedan 1, o mandarle una alerta de algo que ya cerró. Y no falla nunca
 * de forma visible — solo entrega mal.
 *
 * Chile además cambia de horario dos veces al año (UTC−4 / UTC−3), así que
 * el offset no se puede fijar. Se resuelve con `Intl`, que trae la base de
 * zonas horarias del runtime y no necesita ninguna dependencia.
 */

const ZONA_CHILE = 'America/Santiago';

/** Fecha en el formato `DDMMAAAA` que exige el parámetro `fecha` de la API. */
export function aFechaApi(fecha: Date): string {
  const dd = String(fecha.getUTCDate()).padStart(2, '0');
  const mm = String(fecha.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}${mm}${fecha.getUTCFullYear()}`;
}

/** Cuántos minutos va adelantada Santiago respecto de UTC en ese instante. */
function offsetChileEnMinutos(instante: Date): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_CHILE,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(instante);

  const p = Object.fromEntries(partes.map((x) => [x.type, x.value])) as Record<string, string>;
  const comoSiFueraUtc = Date.UTC(
    Number(p.year), Number(p.month) - 1, Number(p.day),
    Number(p.hour) % 24, Number(p.minute), Number(p.second),
  );
  return (comoSiFueraUtc - instante.getTime()) / 60_000;
}

/**
 * Convierte una fecha "desnuda" de la API a ISO en UTC.
 * Devuelve null si viene vacía o no se puede leer: null es un dato honesto,
 * una fecha inventada no.
 */
export function desdeHoraChilena(valor: unknown): string | null {
  if (typeof valor !== 'string' || valor.trim() === '') return null;

  // Si ya trae zona (Z o ±HH:MM), la API cambió de formato: se respeta.
  if (/(?:Z|[+-]\d{2}:?\d{2})$/.test(valor.trim())) {
    const d = new Date(valor);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  const m = valor.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;

  const [, Y, M, D, h, min, s] = m;
  const comoSiFueraUtc = Date.UTC(+Y, +M - 1, +D, +h, +min, +(s ?? 0));

  // Dos pasadas: la primera estima el offset, la segunda lo corrige por si
  // la estimación cayó al otro lado de un cambio de horario.
  let utc = comoSiFueraUtc - offsetChileEnMinutos(new Date(comoSiFueraUtc)) * 60_000;
  utc = comoSiFueraUtc - offsetChileEnMinutos(new Date(utc)) * 60_000;

  const d = new Date(utc);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
