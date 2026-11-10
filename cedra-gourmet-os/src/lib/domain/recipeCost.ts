import { costLine, type LineCost } from "./costing";
import type { Item, QuoteLine, Recipe, Settings } from "./types";

/** Línea equivalente a "una torta en el molde base", para costear la receta por sí sola. */
export function baseLine(recipe: Recipe): QuoteLine {
  return {
    id: `base-${recipe.id}`,
    recipeId: recipe.id,
    title: recipe.name,
    tiers: [recipe.baseMold],
    quantity: 1,
    productionMinutes: recipe.productionMinutes,
    decorationMinutes: recipe.decorationMinutes,
    bakingMinutes: recipe.bakingMinutes,
    coolingHours: recipe.coolingHours,
    extras: [],
  };
}

export function costRecipe(recipe: Recipe, items: Item[], settings: Settings): LineCost {
  return costLine(baseLine(recipe), recipe, items, settings);
}
