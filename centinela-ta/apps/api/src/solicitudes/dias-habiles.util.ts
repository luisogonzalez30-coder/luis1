/**
 * Cuenta días hábiles chilenos de forma simplificada: excluye sábado y
 * domingo, pero NO excluye feriados legales todavía — el calendario de
 * feriados (fijos + irrenunciables + los que dicta cada año la Dirección
 * del Trabajo) queda pendiente como mejora de Fase 2, listado en el
 * documento de arquitectura. Para el MVP esto ya evita el error más común
 * (contar sábado/domingo como plazo), que es la mayoría del error real.
 *
 * Todo el cálculo trabaja en días UTC "puros" (sin hora) para no depender
 * de la zona horaria del proceso — evita el clásico off-by-one de Prisma
 * con columnas @db.Date.
 */

function aDiaUtc(fecha: Date): number {
  return Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()) / 86_400_000;
}

function esFinDeSemana(diaUtc: number): boolean {
  const diaSemana = new Date(diaUtc * 86_400_000).getUTCDay();
  return diaSemana === 0 || diaSemana === 6;
}

export function sumarDiasHabiles(fecha: Date, diasHabiles: number): Date {
  let dia = aDiaUtc(fecha);
  let restantes = diasHabiles;
  while (restantes > 0) {
    dia += 1;
    if (!esFinDeSemana(dia)) restantes -= 1;
  }
  return new Date(dia * 86_400_000);
}

/** Positivo si fechaLimite está en el futuro, negativo si ya pasó. */
export function diasHabilesRestantes(hoy: Date, fechaLimite: Date): number {
  const diaHoy = aDiaUtc(hoy);
  const diaLimite = aDiaUtc(fechaLimite);
  const signo = diaLimite >= diaHoy ? 1 : -1;

  let dia = diaHoy;
  let dias = 0;
  while (dia !== diaLimite) {
    dia += signo;
    if (!esFinDeSemana(dia)) dias += signo;
  }
  return dias;
}

export const PLAZO_LEGAL_DIAS_HABILES = 20;
export const UMBRAL_POR_VENCER_DIAS_HABILES = 5;
