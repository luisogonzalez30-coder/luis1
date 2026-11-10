import { costLine, sumCosts, type CostBreakdown, type LineCost } from "./costing";
import { priceFor, priceTiers, tierMarginPct, type PriceResult } from "./pricing";
import type { Allergen, AppData, DietLabel, PriceTier, Quote, QuoteLine, Recipe, Settings } from "./types";

export function deliveryCharge(d: Quote["delivery"], s: Pick<Settings, "deliveryPerKmClp" | "deliveryMinClp">): number {
  if (d.mode === "fixed") return Math.max(0, Math.round(d.fixedClp));
  if (d.mode === "km") {
    const km = Math.max(0, d.km) * (d.roundTrip ? 2 : 1);
    return Math.max(s.deliveryMinClp, Math.round(km * s.deliveryPerKmClp));
  }
  return 0;
}

export interface ResolvedLine {
  line: QuoteLine;
  recipe: Recipe | undefined;
  result: LineCost | undefined;
}

export interface QuoteTotals {
  lines: ResolvedLine[];
  cost: CostBreakdown;
  tiers: Record<PriceTier, PriceResult>;
  selected: PriceResult;
  /** "Tu Sueldo por Mano de Obra": lo que la cotización te paga por tus horas. */
  laborSalary: number;
  /** "Utilidad Neta de la Empresa": lo que queda después de pagar todo, incluido tu sueldo. */
  companyUtility: number;
  delivery: number;
  /** Productos + despacho. No incluye la garantía: no es ingreso, se devuelve. */
  total: number;
  deposit: number;
  rentalGuarantee: number;
  totalToPay: number;
  allergens: Allergen[];
  dietLabels: DietLabel[];
}

export function resolveLines(quote: Quote, data: Pick<AppData, "recipes" | "items" | "settings">): ResolvedLine[] {
  return quote.lines.map((line) => {
    const recipe = data.recipes.find((r) => r.id === line.recipeId);
    return { line, recipe, result: recipe ? costLine(line, recipe, data.items, data.settings) : undefined };
  });
}

export function quoteTotals(quote: Quote, data: Pick<AppData, "recipes" | "items" | "settings">): QuoteTotals {
  const { settings } = data;
  const lines = resolveLines(quote, data);
  const results = lines.flatMap((l) => (l.result ? [l.result] : []));
  const cost = sumCosts(results.map((r) => r.cost));
  const tiers = priceTiers(cost.total, settings, quote.ivaEnabled);
  const selected =
    cost.total > 0
      ? tiers[quote.tier]
      : priceFor(0, {
          marginPct: tierMarginPct(quote.tier, settings),
          ivaEnabled: quote.ivaEnabled,
          ivaPct: settings.ivaPct,
          commercialRounding: false,
        });
  const delivery = deliveryCharge(quote.delivery, settings);
  const total = selected.finalPrice + delivery;
  const rentalGuarantee = quote.rental.enabled ? Math.max(0, Math.round(quote.rental.depositClp)) : 0;

  const allergens = new Set<Allergen>();
  results.forEach((r) => r.requirements.forEach((req) => req.item.allergens.forEach((a) => allergens.add(a))));
  // Una etiqueta solo vale para el pedido si la cumplen todas las preparaciones.
  const recipes = lines.flatMap((l) => (l.recipe ? [l.recipe] : []));
  const dietLabels = (["sin_gluten", "vegano", "sin_azucar_refinada"] as DietLabel[]).filter(
    (label) => recipes.length > 0 && recipes.every((r) => r.dietLabels.includes(label)),
  );

  return {
    lines,
    cost,
    tiers,
    selected,
    laborSalary: cost.laborProduction + cost.laborDecoration,
    companyUtility: selected.utility,
    delivery,
    total,
    deposit: Math.round(total * (settings.depositPct / 100)),
    rentalGuarantee,
    totalToPay: total + rentalGuarantee,
    allergens: [...allergens],
    dietLabels,
  };
}
