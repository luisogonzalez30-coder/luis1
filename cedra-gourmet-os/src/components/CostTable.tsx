import type { CostBreakdown } from "@/lib/domain/costing";
import { Money } from "./ui";

const ROWS: { key: keyof CostBreakdown; label: string }[] = [
  { key: "ingredients", label: "Ingredientes (con merma)" },
  { key: "packaging", label: "Empaque y estructura" },
  { key: "decoration", label: "Decoración" },
  { key: "laborProduction", label: "Mano de obra · producción" },
  { key: "laborDecoration", label: "Mano de obra · decoración" },
  { key: "oven", label: "Horno / energía" },
  { key: "cooling", label: "Refrigeración / reposo" },
  { key: "overhead", label: "Gastos fijos (overhead)" },
];

export function CostTable({ cost }: { cost: CostBreakdown }) {
  return (
    <dl className="text-sm">
      {ROWS.map(({ key, label }) => (
        <div key={key} className="flex justify-between gap-3 border-b border-crema-2 py-1.5">
          <dt className="text-cacao-2">{label}</dt>
          <dd><Money value={cost[key]} /></dd>
        </div>
      ))}
      <div className="flex justify-between gap-3 pt-2.5 font-semibold">
        <dt>Costo total</dt>
        <dd><Money value={cost.total} className="text-base" /></dd>
      </div>
    </dl>
  );
}
