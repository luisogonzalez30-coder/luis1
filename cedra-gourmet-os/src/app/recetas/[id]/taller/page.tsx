"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { WorkshopSheet } from "@/components/WorkshopSheet";
import { Empty } from "@/components/ui";
import { baseLine, costRecipe } from "@/lib/domain/recipeCost";
import { useAppData } from "@/lib/store/store";

export default function RecetaTallerPage() {
  const { id } = useParams<{ id: string }>();
  const { recipes, items, settings } = useAppData();
  const recipe = recipes.find((r) => r.id === id);
  if (!recipe) return <Empty>Esta receta no existe.</Empty>;
  return (
    <>
      <Link href={`/recetas/${recipe.id}`} className="no-print mb-4 inline-flex items-center gap-1 text-sm text-cacao-3 hover:text-cacao">
        <ArrowLeft size={14} /> Volver a la receta
      </Link>
      <WorkshopSheet
        heading={recipe.name}
        sub={`Molde base · ${recipe.portions} porciones`}
        blocks={[{ line: baseLine(recipe), recipe, result: costRecipe(recipe, items, settings) }]}
      />
    </>
  );
}
