import type { BaseUnit } from "./types";

const clp = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });

export function money(n: number): string {
  return `$ ${clp.format(Math.round(n))}`;
}

export function pct(n: number, digits = 1): string {
  return `${n.toFixed(digits).replace(".", ",")}%`;
}

/** Cantidad legible: 1.250 g → "1,25 kg"; 12 un → "12 un". */
export function qty(n: number, unit: BaseUnit): string {
  if (unit === "unit") return `${trim(n, 1)} un`;
  const big = unit === "g" ? "kg" : "L";
  return n >= 1000 ? `${trim(n / 1000, 2)} ${big}` : `${trim(n, 1)} ${unit}`;
}

/** Gramos exactos para la ficha de taller: nunca convierte a kg. */
export function qtyExact(n: number, unit: BaseUnit): string {
  return `${clp.format(Math.round(n))} ${unit === "unit" ? "un" : unit}`;
}

function trim(n: number, digits: number): string {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: digits }).format(n);
}

export function longDate(iso: string): string {
  if (!iso) return "—";
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
