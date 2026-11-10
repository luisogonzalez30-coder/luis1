import { scaleFactor } from "./molds";
import type { Item, ItemCategory, QuoteLine, Recipe, Settings } from "./types";

export function unitCostClp(item: Item): number {
  return item.purchaseQty > 0 ? item.purchasePriceClp / item.purchaseQty : 0;
}

/**
 * Cantidad bruta a sacar de bodega para obtener `netQty` utilizable.
 * La merma solo existe en comestibles: una caja o un topper no pierden gramos en el batido.
 */
export function grossQty(item: Item, netQty: number): number {
  if (item.category !== "ingredient") return netQty;
  const waste = Math.min(Math.max(item.wastePct, 0), 95) / 100;
  return netQty / (1 - waste);
}

export interface Requirement {
  item: Item;
  netQty: number;
  grossQty: number;
  costClp: number;
}

export interface CostBreakdown {
  ingredients: number;
  packaging: number;
  decoration: number;
  laborProduction: number;
  laborDecoration: number;
  oven: number;
  cooling: number;
  /** Operación base: materiales + mano de obra + energía + frío. Sobre esto se aplica el overhead. */
  baseOperation: number;
  overhead: number;
  total: number;
}

export interface LineCost {
  factor: number;
  requirements: Requirement[];
  missingItemIds: string[];
  cost: CostBreakdown;
}

type CostSettings = Pick<
  Settings,
  | "laborProductionClpHour"
  | "laborDecorationClpHour"
  | "ovenCostPerHourClp"
  | "coolingMode"
  | "coolingFixedClp"
  | "coolingPerHourClp"
  | "overheadPct"
>;

export function coolingCost(hours: number, s: CostSettings): number {
  if (hours <= 0) return 0;
  return s.coolingMode === "fixed" ? s.coolingFixedClp : hours * s.coolingPerHourClp;
}

/**
 * Costea una línea de cotización completa (ya multiplicada por `quantity`).
 * Los comestibles de la receta escalan por volumen de molde; empaque y decoración no.
 */
export function costLine(line: QuoteLine, recipe: Recipe, items: Item[], s: CostSettings): LineCost {
  const byId = new Map(items.map((i) => [i.id, i]));
  const factor = scaleFactor(recipe.baseMold, line.tiers);
  const qty = Math.max(1, line.quantity);
  const merged = new Map<string, number>();
  const missing: string[] = [];

  const add = (itemId: string, net: number, scales: boolean) => {
    const item = byId.get(itemId);
    if (!item) {
      missing.push(itemId);
      return;
    }
    const scaled = scales && item.category === "ingredient" ? net * factor : net;
    merged.set(itemId, (merged.get(itemId) ?? 0) + scaled * qty);
  };
  recipe.lines.forEach((l) => add(l.itemId, l.qty, true));
  line.extras.forEach((l) => add(l.itemId, l.qty, false));

  const byCategory: Record<ItemCategory, number> = { ingredient: 0, packaging: 0, decoration: 0 };
  const requirements: Requirement[] = [];
  for (const [itemId, netQty] of merged) {
    const item = byId.get(itemId)!;
    const gross = grossQty(item, netQty);
    const costClp = gross * unitCostClp(item);
    byCategory[item.category] += costClp;
    requirements.push({ item, netQty, grossQty: gross, costClp });
  }

  const laborProduction = (line.productionMinutes / 60) * s.laborProductionClpHour * qty;
  const laborDecoration = (line.decorationMinutes / 60) * s.laborDecorationClpHour * qty;
  const oven = (line.bakingMinutes / 60) * s.ovenCostPerHourClp * qty;
  const cooling = coolingCost(line.coolingHours, s) * qty;
  const baseOperation =
    byCategory.ingredient + byCategory.packaging + byCategory.decoration + laborProduction + laborDecoration + oven + cooling;
  const overhead = baseOperation * (s.overheadPct / 100);

  return {
    factor,
    requirements,
    missingItemIds: missing,
    cost: {
      ingredients: byCategory.ingredient,
      packaging: byCategory.packaging,
      decoration: byCategory.decoration,
      laborProduction,
      laborDecoration,
      oven,
      cooling,
      baseOperation,
      overhead,
      total: baseOperation + overhead,
    },
  };
}

export function sumCosts(costs: CostBreakdown[]): CostBreakdown {
  const zero: CostBreakdown = {
    ingredients: 0,
    packaging: 0,
    decoration: 0,
    laborProduction: 0,
    laborDecoration: 0,
    oven: 0,
    cooling: 0,
    baseOperation: 0,
    overhead: 0,
    total: 0,
  };
  return costs.reduce((acc, c) => {
    (Object.keys(acc) as (keyof CostBreakdown)[]).forEach((k) => (acc[k] += c[k]));
    return acc;
  }, zero);
}
