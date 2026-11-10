import type { AppData } from "../domain/types";
import { SCHEMA_VERSION, defaultSettings } from "../store/seed";

/** Contrato de persistencia. El store no sabe si detrás hay localStorage o Supabase. */
export interface Repository {
  load(): Promise<AppData | null>;
  save(data: AppData): Promise<void>;
}

/** Valida y completa un respaldo: acepta datos de versiones anteriores sin perder ajustes nuevos. */
export function parseAppData(raw: unknown): AppData {
  if (!raw || typeof raw !== "object") throw new Error("El archivo no es un respaldo de Cedra Gourmet OS.");
  const d = raw as Partial<AppData>;
  if (!Array.isArray(d.items) || !Array.isArray(d.recipes) || !Array.isArray(d.quotes) || !d.settings) {
    throw new Error("Al respaldo le faltan secciones (insumos, recetas, cotizaciones o ajustes).");
  }
  const defaults = defaultSettings();
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: { ...defaults, ...d.settings, brand: { ...defaults.brand, ...d.settings.brand } },
    items: d.items,
    recipes: d.recipes,
    quotes: d.quotes,
  };
}
