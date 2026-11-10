"use client";

import { Printer } from "lucide-react";
import type { LineCost } from "@/lib/domain/costing";
import { qtyExact } from "@/lib/domain/format";
import { CATEGORY_LABEL } from "@/lib/domain/labels";
import { describeMold, structureAdvice } from "@/lib/domain/molds";
import type { ItemCategory, QuoteLine, Recipe } from "@/lib/domain/types";
import { Btn } from "./ui";

export interface WorkshopBlock {
  line: QuoteLine;
  recipe: Recipe;
  result: LineCost;
}

const ORDER: ItemCategory[] = ["ingredient", "packaging", "decoration"];

/** Modo "Mesón de Cocina": solo gramos, moldes y pasos. Ningún precio llega a esta vista. */
export function WorkshopSheet({ heading, sub, blocks }: { heading: string; sub: string; blocks: WorkshopBlock[] }) {
  return (
    <div className="hoja mx-auto max-w-3xl rounded-xl border border-crema-3 bg-white p-6 shadow-ficha md:p-9">
      <div className="flex items-start justify-between gap-4 border-b-2 border-cacao pb-3">
        <div>
          <p className="rotulo">Ficha de taller · Mesón de cocina</p>
          <h1 className="mt-1 text-3xl">{heading}</h1>
          <p className="mt-1 text-sm text-cacao-2">{sub}</p>
        </div>
        <Btn variant="primary" className="no-print" onClick={() => window.print()}>
          <Printer size={15} /> Imprimir
        </Btn>
      </div>

      {blocks.map(({ line, recipe, result }) => {
        const advice = structureAdvice(line.tiers);
        return (
          <section key={line.id} className="evitar-corte mt-7">
            <h2 className="text-2xl">
              {line.quantity > 1 && <span className="cifra mr-2 text-oro-osc">{line.quantity} ×</span>}
              {line.title || recipe.name}
            </h2>
            <p className="mt-1 text-sm text-cacao-2">
              Receta: {recipe.name} · factor <span className="cifra">× {result.factor.toFixed(2)}</span> sobre molde base ({describeMold(recipe.baseMold)})
            </p>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg bg-crema-2 p-3">
                <p className="rotulo">Moldes</p>
                <ol className="mt-1 space-y-0.5 text-sm">
                  {line.tiers.map((t, i) => (
                    <li key={i}>
                      {line.tiers.length > 1 && <span className="text-cacao-3">Piso {i + 1} · </span>}
                      {t.shape === "round" ? "Redondo" : t.shape === "square" ? "Cuadrado" : "Rectangular"} {describeMold(t)}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="rounded-lg bg-crema-2 p-3">
                <p className="rotulo">Tiempos</p>
                <p className="cifra mt-1 text-sm">
                  Producción {line.productionMinutes} min · Decoración {line.decorationMinutes} min
                  <br />
                  Horno {line.bakingMinutes} min · Frío {line.coolingHours} h
                </p>
              </div>
            </div>

            {advice.required && (
              <p className="mt-2 rounded-lg border border-terracota/40 bg-terracota-claro px-3 py-2 text-sm text-terracota">
                <strong>Estructura obligatoria</strong> ({advice.reasons.join(", ")}): {advice.intermediateBoards} disco(s) intermedio(s), {advice.dowels} pilares
                {advice.centralDowel ? ", pilar central pasante" : ""} y caja alta.
              </p>
            )}

            {ORDER.map((category) => {
              const rows = result.requirements.filter((r) => r.item.category === category);
              if (rows.length === 0) return null;
              return (
                <table key={category} className="mt-4 w-full text-sm">
                  <thead>
                    <tr className="rotulo border-b border-cacao/30 text-left">
                      <th className="w-8 py-1.5" />
                      <th className="py-1.5 font-semibold">{CATEGORY_LABEL[category]}</th>
                      <th className="py-1.5 text-right font-semibold">{category === "ingredient" ? "Pesar (neto)" : "Cantidad"}</th>
                      {category === "ingredient" && <th className="py-1.5 text-right font-semibold">Sacar de bodega</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.item.id} className="border-b border-crema-3">
                        <td className="py-1.5"><span className="inline-block h-3.5 w-3.5 rounded-sm border border-cacao/50" /></td>
                        <td className="py-1.5">{r.item.name}</td>
                        <td className="cifra py-1.5 text-right text-base font-semibold">{qtyExact(r.netQty, r.item.baseUnit)}</td>
                        {category === "ingredient" && <td className="cifra py-1.5 text-right text-cacao-3">{qtyExact(r.grossQty, r.item.baseUnit)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })}

            {recipe.steps.filter((s) => s.trim()).length > 0 && (
              <>
                <p className="rotulo mt-5">Preparación</p>
                <ol className="mt-1.5 space-y-1.5 text-sm leading-relaxed">
                  {recipe.steps.filter((s) => s.trim()).map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="cifra w-5 shrink-0 text-right font-semibold text-oro-osc">{i + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
            {Math.abs(result.factor - 1) > 0.01 && recipe.steps.some((s) => /\d/.test(s)) && (
              <p className="mt-2 text-xs text-cacao-3">Los gramos y tiempos escritos dentro de los pasos son los del molde base: manda la tabla de arriba.</p>
            )}
            {recipe.notes && <p className="mt-3 border-l-2 border-oro pl-3 text-sm italic text-cacao-2">{recipe.notes}</p>}
          </section>
        );
      })}
    </div>
  );
}
