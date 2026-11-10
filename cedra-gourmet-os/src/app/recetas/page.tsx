"use client";

import { ChefHat, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Btn, Card, Empty, Money, PageHeader } from "@/components/ui";
import { describeMold } from "@/lib/domain/molds";
import { priceTiers } from "@/lib/domain/pricing";
import { costRecipe } from "@/lib/domain/recipeCost";
import type { Recipe } from "@/lib/domain/types";
import { uid } from "@/lib/store/seed";
import { actions, useAppData } from "@/lib/store/store";

export default function RecetasPage() {
  const { recipes, items, settings } = useAppData();
  const router = useRouter();

  const create = () => {
    const recipe: Recipe = {
      id: uid(),
      name: "Nueva receta",
      baseMold: { shape: "round", aCm: 20, bCm: 30, heightCm: 10 },
      portions: 15,
      lines: [],
      productionMinutes: 60,
      decorationMinutes: 30,
      bakingMinutes: 40,
      coolingHours: 4,
      steps: [],
      dietLabels: [],
      notes: "",
    };
    actions.saveRecipe(recipe);
    router.push(`/recetas/${recipe.id}`);
  };

  return (
    <>
      <PageHeader eyebrow="Recetario" title="Recetas">
        <Btn variant="primary" onClick={create}><Plus size={15} /> Nueva receta</Btn>
      </PageHeader>
      {recipes.length === 0 ? (
        <Empty>Aún no hay recetas. Crea la primera o pégala en texto libre para que la IA la estructure.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {recipes.map((recipe) => {
            const { cost } = costRecipe(recipe, items, settings);
            const price = priceTiers(cost.total, settings, settings.ivaEnabledByDefault).gourmet;
            return (
              <Link key={recipe.id} href={`/recetas/${recipe.id}`} className="group">
                <Card className="h-full transition group-hover:border-oro/60">
                  <ChefHat size={18} strokeWidth={1.5} className="text-oro-osc" />
                  <h2 className="mt-2 text-xl leading-snug">{recipe.name}</h2>
                  <p className="mt-1 text-xs text-cacao-3">{describeMold(recipe.baseMold)} · {recipe.portions} porciones</p>
                  <div className="mt-4 flex items-end justify-between border-t border-crema-2 pt-3 text-sm">
                    <div>
                      <p className="rotulo">Costo</p>
                      <Money value={cost.total} />
                    </div>
                    <div className="text-right">
                      <p className="rotulo">Gourmet</p>
                      <Money value={price.finalPrice} className="text-base font-semibold" />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
