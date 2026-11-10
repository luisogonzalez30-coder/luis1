import type { PriceTier, Settings } from "./types";

export const TIER_MARGIN_FIXED = { competitive: 30, boutique: 55 } as const;

export const TIER_LABEL: Record<PriceTier, string> = {
  competitive: "Competitivo",
  gourmet: "Gourmet Recomendado",
  boutique: "Boutique de Autor",
};

export function tierMarginPct(tier: PriceTier, settings: Pick<Settings, "marginGourmetPct">): number {
  return tier === "gourmet" ? settings.marginGourmetPct : TIER_MARGIN_FIXED[tier];
}

/** Margen real sobre el precio (no mark-up): Neto = Costo / (1 − margen). */
export function netPriceFromMargin(totalCost: number, marginPct: number): number {
  if (marginPct >= 100) throw new RangeError("El margen debe ser menor a 100%");
  return totalCost / (1 - marginPct / 100);
}

/** Redondeo comercial chileno: sube al siguiente valor terminado en $500 o $900. */
export function commercialRound(amount: number): number {
  if (amount <= 0) return 0;
  const thousands = Math.floor(amount / 1000) * 1000;
  for (const candidate of [thousands + 500, thousands + 900, thousands + 1500]) {
    if (candidate >= amount) return candidate;
  }
  return thousands + 1500;
}

export interface PriceOptions {
  marginPct: number;
  ivaEnabled: boolean;
  ivaPct: number;
  commercialRounding: boolean;
}

export interface PriceResult {
  marginPct: number;
  /** Neto teórico exacto de la fórmula, antes de redondear. */
  netTheoretical: number;
  /** Precio que ve el cliente (con IVA si corresponde, redondeado si corresponde). */
  finalPrice: number;
  /** Neto que queda en la empresa después de separar el IVA del precio final. */
  net: number;
  iva: number;
  /** Utilidad neta de la empresa: neto − costo total (la mano de obra ya está pagada dentro del costo). */
  utility: number;
  /** Margen real resultante después del redondeo. */
  effectiveMarginPct: number;
}

export function priceFor(totalCost: number, o: PriceOptions): PriceResult {
  const netTheoretical = netPriceFromMargin(totalCost, o.marginPct);
  const ivaFactor = o.ivaEnabled ? 1 + o.ivaPct / 100 : 1;
  const gross = netTheoretical * ivaFactor;
  const finalPrice = o.commercialRounding ? commercialRound(gross) : Math.round(gross);
  const net = Math.round(finalPrice / ivaFactor);
  const utility = net - totalCost;
  return {
    marginPct: o.marginPct,
    netTheoretical,
    finalPrice,
    net,
    iva: finalPrice - net,
    utility,
    effectiveMarginPct: net > 0 ? (utility / net) * 100 : 0,
  };
}

const TIERS: PriceTier[] = ["competitive", "gourmet", "boutique"];

export function priceTiers(
  totalCost: number,
  settings: Pick<Settings, "marginGourmetPct" | "ivaPct" | "commercialRounding">,
  ivaEnabled: boolean,
): Record<PriceTier, PriceResult> {
  const out = {} as Record<PriceTier, PriceResult>;
  for (const tier of TIERS) {
    out[tier] = priceFor(totalCost, {
      marginPct: tierMarginPct(tier, settings),
      ivaEnabled,
      ivaPct: settings.ivaPct,
      commercialRounding: settings.commercialRounding,
    });
  }
  return out;
}
