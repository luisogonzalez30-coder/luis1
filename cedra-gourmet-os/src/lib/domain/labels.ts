import type { Allergen, DietLabel, ItemCategory, QuoteStatus, RentalMaterial } from "./types";

export const ALLERGEN_LABEL: Record<Allergen, string> = {
  gluten: "Gluten",
  lacteos: "Lácteos",
  huevo: "Huevo",
  frutos_secos: "Frutos secos",
  soya: "Soya",
};

export const DIET_LABEL: Record<DietLabel, string> = {
  sin_gluten: "Sin gluten",
  vegano: "Vegano",
  sin_azucar_refinada: "Sin azúcar refinada",
};

/** Alérgenos que contradicen una etiqueta: sirven para avisar de una receta mal etiquetada. */
export const DIET_CONFLICTS: Record<DietLabel, Allergen[]> = {
  sin_gluten: ["gluten"],
  vegano: ["lacteos", "huevo"],
  sin_azucar_refinada: [],
};

export const CATEGORY_LABEL: Record<ItemCategory, string> = {
  ingredient: "Ingrediente",
  packaging: "Empaque y estructura",
  decoration: "Decoración",
};

export const STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  approved: "Aprobada",
  delivered: "Entregada",
  rejected: "Rechazada",
};

export const MATERIAL_LABEL: Record<RentalMaterial, string> = { cristal: "Cristal", metal: "Metal", madera: "Madera" };

export const STATUS_TONE: Record<QuoteStatus, "neutro" | "oro" | "ok" | "alerta"> = {
  draft: "neutro",
  sent: "oro",
  approved: "ok",
  delivered: "ok",
  rejected: "alerta",
};
