import type { Mold } from "./types";

export function moldVolumeCm3(m: Mold): number {
  const h = Math.max(0, m.heightCm);
  switch (m.shape) {
    case "round":
      return Math.PI * (m.aCm / 2) ** 2 * h;
    case "square":
      return m.aCm ** 2 * h;
    case "rect":
      return m.aCm * m.bCm * h;
  }
}

/** Factor geométrico: volumen total de los pisos pedidos / volumen del molde base de la receta. */
export function scaleFactor(base: Mold, tiers: Mold[]): number {
  const baseVol = moldVolumeCm3(base);
  if (baseVol <= 0) return 0;
  return tiers.reduce((sum, t) => sum + moldVolumeCm3(t), 0) / baseVol;
}

export function totalHeightCm(tiers: Mold[]): number {
  return tiers.reduce((sum, t) => sum + t.heightCm, 0);
}

export function describeMold(m: Mold): string {
  const dims =
    m.shape === "round" ? `Ø ${m.aCm} cm` : m.shape === "square" ? `${m.aCm} × ${m.aCm} cm` : `${m.aCm} × ${m.bCm} cm`;
  return `${dims} · alto ${m.heightCm} cm`;
}

export const STRUCTURE_HEIGHT_LIMIT_CM = 14;

export interface StructureAdvice {
  required: boolean;
  reasons: string[];
  intermediateBoards: number;
  dowels: number;
  centralDowel: boolean;
  tallBox: boolean;
}

/**
 * Alerta de estructura. Se activa con más de 1 piso o más de 14 cm de alto total.
 * Regla de taller para pilares: 1 cada ~5 cm de diámetro/lado del piso que se apoya encima, mínimo 4.
 */
export function structureAdvice(tiers: Mold[]): StructureAdvice {
  const height = totalHeightCm(tiers);
  const reasons: string[] = [];
  if (tiers.length > 1) reasons.push(`${tiers.length} pisos`);
  if (height > STRUCTURE_HEIGHT_LIMIT_CM) reasons.push(`${fmtCm(height)} cm de alto (límite ${STRUCTURE_HEIGHT_LIMIT_CM} cm)`);
  if (reasons.length === 0) {
    return { required: false, reasons, intermediateBoards: 0, dowels: 0, centralDowel: false, tallBox: false };
  }

  let boards = 0;
  let dowels = 0;
  // Cada piso superior descansa sobre su propio disco y sobre pilares clavados en el piso de abajo.
  for (const upper of tiers.slice(1)) {
    boards += 1;
    dowels += Math.max(4, Math.ceil(upper.aCm / 5));
  }
  // Un piso individual más alto que el límite se parte con un disco a media altura.
  for (const tier of tiers) {
    if (tier.heightCm > STRUCTURE_HEIGHT_LIMIT_CM) {
      boards += 1;
      dowels += Math.max(4, Math.ceil(tier.aCm / 5));
    }
  }
  return {
    required: true,
    reasons,
    intermediateBoards: boards,
    dowels,
    centralDowel: tiers.length >= 3 || height > 25,
    tallBox: true,
  };
}

function fmtCm(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
