/** Contrato entre la interfaz y /api/ia. Lo cumplen tanto Claude como el analizador local. */

export interface ParsedIngredient {
  name: string;
  qty: number;
  /** Unidad tal como viene en el texto: g, kg, ml, l, cc, unidad… */
  unit: string;
}

export interface ParsedRecipe {
  name: string;
  portions: number;
  ingredients: ParsedIngredient[];
  steps: string[];
}

export interface QuoteBrief {
  brand: string;
  client: string;
  eventDate: string;
  products: { title: string; tiers: string[]; quantity: number }[];
  allergens: string[];
  dietLabels: string[];
  delivery: boolean;
}

export type IaRequest = { task: "parse-recipe"; text: string } | { task: "describe-quote"; brief: QuoteBrief };

export type IaSource = "claude" | "local";

export type IaResponse =
  | { task: "parse-recipe"; source: IaSource; recipe: ParsedRecipe; notice?: string }
  | { task: "describe-quote"; source: IaSource; description: string; notice?: string };
