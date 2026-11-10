"use client";

import { pct } from "@/lib/domain/format";
import { TIER_LABEL, type PriceResult } from "@/lib/domain/pricing";
import type { PriceTier } from "@/lib/domain/types";
import { Money } from "./ui";

const ORDER: PriceTier[] = ["competitive", "gourmet", "boutique"];

export function TierCards({
  tiers,
  selected,
  onSelect,
  ivaEnabled,
}: {
  tiers: Record<PriceTier, PriceResult>;
  selected?: PriceTier;
  onSelect?: (t: PriceTier) => void;
  ivaEnabled: boolean;
}) {
  return (
    <div className="space-y-2">
      {ORDER.map((tier) => {
        const p = tiers[tier];
        const on = selected === tier;
        const Tag = onSelect ? "button" : "div";
        return (
          <Tag
            key={tier}
            {...(onSelect ? { type: "button" as const, onClick: () => onSelect(tier), "aria-pressed": on } : {})}
            className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
              on ? "border-oro bg-oro-claro/40 shadow-ficha" : "border-crema-3 bg-white/60"
            } ${onSelect && !on ? "hover:border-oro/60" : ""}`}
          >
            <span>
              <span className="rotulo block">{TIER_LABEL[tier]}</span>
              <span className="mt-0.5 block text-xs text-cacao-3">
                Margen {pct(p.marginPct, 0)} · utilidad <Money value={p.utility} />
              </span>
            </span>
            <span className="text-right">
              <Money value={p.finalPrice} className="block text-xl" />
              <span className="block text-[11px] text-cacao-3">{ivaEnabled ? "IVA incluido" : "neto"}</span>
            </span>
          </Tag>
        );
      })}
    </div>
  );
}
