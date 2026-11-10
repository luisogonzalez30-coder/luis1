import type { BaseUnit } from "./types";

/** Unidades de entrada aceptadas y su factor hacia la unidad base. */
const CONVERSIONS: Record<string, { base: BaseUnit; factor: number }> = {
  g: { base: "g", factor: 1 },
  gr: { base: "g", factor: 1 },
  kg: { base: "g", factor: 1000 },
  mg: { base: "g", factor: 0.001 },
  lb: { base: "g", factor: 453.592 },
  oz: { base: "g", factor: 28.3495 },
  ml: { base: "ml", factor: 1 },
  cc: { base: "ml", factor: 1 },
  cl: { base: "ml", factor: 10 },
  l: { base: "ml", factor: 1000 },
  lt: { base: "ml", factor: 1000 },
  unit: { base: "unit", factor: 1 },
  un: { base: "unit", factor: 1 },
  u: { base: "unit", factor: 1 },
  unidad: { base: "unit", factor: 1 },
  unidades: { base: "unit", factor: 1 },
  docena: { base: "unit", factor: 12 },
};

export interface Normalized {
  qty: number;
  baseUnit: BaseUnit;
}

/** Normaliza una cantidad a g, ml o unit. Devuelve null si la unidad no se reconoce. */
export function normalize(qty: number, unit: string): Normalized | null {
  const conv = CONVERSIONS[unit.trim().toLowerCase().replace(/\.$/, "")];
  if (!conv || !Number.isFinite(qty)) return null;
  return { qty: qty * conv.factor, baseUnit: conv.base };
}

export const UNIT_LABEL: Record<BaseUnit, string> = { g: "g", ml: "ml", unit: "un" };

/** Opciones de formato de compra que ofrece la interfaz, por unidad base. */
export const PURCHASE_UNITS: Record<BaseUnit, { label: string; factor: number }[]> = {
  g: [
    { label: "g", factor: 1 },
    { label: "kg", factor: 1000 },
  ],
  ml: [
    { label: "ml", factor: 1 },
    { label: "L", factor: 1000 },
  ],
  unit: [
    { label: "un", factor: 1 },
    { label: "docena", factor: 12 },
  ],
};
