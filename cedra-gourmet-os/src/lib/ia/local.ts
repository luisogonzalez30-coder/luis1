import type { ParsedIngredient, ParsedRecipe, QuoteBrief } from "./contract";

const STEP_LINE = /^\s*(?:paso\s*)?\d+\s*[.):-]\s+(\D.+)$/i;
const INGREDIENT_LINE =
  /^\s*[-•*·]?\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)\s*(kg|kilos?|gr?s?|gramos?|ml|cc|lts?|l|litros?|unidades|unidad|un|u|docenas?|tazas?|cucharadas?|cucharaditas?|cdas?|cdtas?|pizcas?)?\.?\s+(?:de\s+)?(.+?)\s*$/i;

const UNIT_ALIAS: Record<string, string> = {
  kilo: "kg",
  kilos: "kg",
  gs: "g",
  grs: "g",
  gramo: "g",
  gramos: "g",
  litro: "l",
  litros: "l",
  lts: "l",
  docenas: "docena",
};

function parseNumber(raw: string): number {
  const mixed = raw.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = raw.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  return Number(raw.replace(",", "."));
}

/**
 * Analizador sin IA: entiende listas "250 g de harina" y pasos numerados. Funciona sin conexión ni clave.
 * Tazas y cucharadas se devuelven tal cual: convertirlas a gramos depende del ingrediente y eso lo hace la IA.
 */
export function parseRecipeLocally(text: string): ParsedRecipe {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const ingredients: ParsedIngredient[] = [];
  const steps: string[] = [];
  let name = "";
  let portions = 0;
  let inSteps = false;

  for (const line of lines) {
    const portionMatch = line.match(/(\d+)\s*(?:porciones|personas|raciones)/i);
    if (portionMatch) {
      if (!portions) portions = Number(portionMatch[1]);
      continue;
    }
    if (/^(preparaci[oó]n|procedimiento|pasos|elaboraci[oó]n|m[eé]todo)\b/i.test(line)) {
      inSteps = true;
      continue;
    }
    if (/^ingredientes\b/i.test(line)) {
      inSteps = false;
      continue;
    }
    const step = line.match(STEP_LINE);
    if (step?.[1]) {
      steps.push(step[1].trim());
      continue;
    }
    const ing = !inSteps ? line.match(INGREDIENT_LINE) : null;
    if (ing?.[1] && ing[3]) {
      const unitRaw = (ing[2] ?? "unidad").toLowerCase();
      ingredients.push({ name: capitalize(ing[3]), qty: parseNumber(ing[1]), unit: UNIT_ALIAS[unitRaw] ?? unitRaw });
      continue;
    }
    if (inSteps) steps.push(line);
    else if (!name) name = line.replace(/^receta\s*(de)?:?\s*/i, "");
  }
  return { name: name || "Receta importada", portions: portions || 12, ingredients, steps };
}

export function describeQuoteLocally(b: QuoteBrief): string {
  const products = b.products
    .map((p) => {
      const floors = p.tiers.length > 1 ? `de ${p.tiers.length} pisos` : "de un piso";
      return `${p.quantity > 1 ? `${p.quantity} × ` : ""}${p.title} (${floors})`;
    })
    .join("; ");
  const parts = [
    `Propuesta de ${b.brand} para ${b.client || "su celebración"}: ${products}.`,
    "Cada pieza se elabora por encargo, con materias primas seleccionadas y pesadas al gramo, y se termina a mano el mismo día de la entrega.",
  ];
  if (b.dietLabels.length) parts.push(`Preparación ${b.dietLabels.join(", ").toLowerCase()}.`);
  if (b.delivery) parts.push("Incluye despacho propio refrigerado hasta el lugar del evento.");
  return parts.join(" ");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
