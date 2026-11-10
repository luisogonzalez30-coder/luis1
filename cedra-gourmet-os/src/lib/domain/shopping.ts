import { unitCostClp } from "./costing";
import { resolveLines } from "./quote";
import type { AppData, Item, Quote } from "./types";

/** Lunes 00:00 de la semana que contiene `isoDate` (YYYY-MM-DD), como YYYY-MM-DD. */
export function weekStart(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  const day = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - day);
  return toIso(d);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toIso(d);
}

export function toIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function approvedInWeek(quotes: Quote[], weekStartIso: string): Quote[] {
  const end = addDays(weekStartIso, 6);
  return quotes.filter((q) => q.status === "approved" && q.eventDate >= weekStartIso && q.eventDate <= end);
}

export interface ShoppingRow {
  item: Item;
  /** Cantidad bruta necesaria (con merma), en unidad base. */
  needed: number;
  stock: number;
  toBuy: number;
  /** Formatos de compra enteros que cubren el faltante. */
  packs: number;
  estimatedCostClp: number;
  quoteNumbers: number[];
}

/** Suma lo que piden las cotizaciones dadas y lo compara con el stock actual. */
export function consolidate(quotes: Quote[], data: Pick<AppData, "recipes" | "items" | "settings">): ShoppingRow[] {
  const acc = new Map<string, { item: Item; needed: number; quotes: Set<number> }>();
  for (const quote of quotes) {
    for (const { result } of resolveLines(quote, data)) {
      for (const req of result?.requirements ?? []) {
        const row = acc.get(req.item.id) ?? { item: req.item, needed: 0, quotes: new Set<number>() };
        row.needed += req.grossQty;
        row.quotes.add(quote.number);
        acc.set(req.item.id, row);
      }
    }
  }
  return [...acc.values()]
    .map(({ item, needed, quotes: qs }) => {
      const toBuy = Math.max(0, needed - item.stockQty);
      const packs = item.purchaseQty > 0 ? Math.ceil(toBuy / item.purchaseQty) : 0;
      return {
        item,
        needed,
        stock: item.stockQty,
        toBuy,
        packs,
        estimatedCostClp: packs * item.purchasePriceClp || toBuy * unitCostClp(item),
        quoteNumbers: [...qs].sort((a, b) => a - b),
      };
    })
    .sort((a, b) => a.item.category.localeCompare(b.item.category) || a.item.name.localeCompare(b.item.name, "es"));
}
