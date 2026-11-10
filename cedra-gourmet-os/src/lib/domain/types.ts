/** Modelo de dominio de Cedra Gourmet OS. Todas las cantidades viven en unidad base. */

export type BaseUnit = "g" | "ml" | "unit";
export type ItemCategory = "ingredient" | "packaging" | "decoration";

export type Allergen = "gluten" | "lacteos" | "huevo" | "frutos_secos" | "soya";
export type DietLabel = "sin_gluten" | "vegano" | "sin_azucar_refinada";

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  baseUnit: BaseUnit;
  /** Tamaño del formato de compra, ya normalizado a unidad base (ej. saco 25 kg = 25000). */
  purchaseQty: number;
  purchasePriceClp: number;
  /** Merma de batido/limpieza. Solo se aplica si category === "ingredient". */
  wastePct: number;
  stockQty: number;
  allergens: Allergen[];
}

export type MoldShape = "round" | "square" | "rect";

export interface Mold {
  shape: MoldShape;
  /** round: diámetro · square: lado · rect: ancho */
  aCm: number;
  /** rect: largo. Ignorado en las otras formas. */
  bCm: number;
  heightCm: number;
}

export interface RecipeLine {
  itemId: string;
  /** Cantidad neta en unidad base del ítem, para el molde base de la receta. */
  qty: number;
}

export interface Recipe {
  id: string;
  name: string;
  baseMold: Mold;
  portions: number;
  lines: RecipeLine[];
  productionMinutes: number;
  decorationMinutes: number;
  bakingMinutes: number;
  coolingHours: number;
  steps: string[];
  dietLabels: DietLabel[];
  notes: string;
}

export type PriceTier = "competitive" | "gourmet" | "boutique";
export type QuoteStatus = "draft" | "sent" | "approved" | "delivered" | "rejected";
export type DeliveryMode = "none" | "km" | "fixed";
export type RentalMaterial = "cristal" | "metal" | "madera";

export interface QuoteLine {
  id: string;
  recipeId: string;
  title: string;
  /** Un molde por piso, de abajo hacia arriba. */
  tiers: Mold[];
  quantity: number;
  productionMinutes: number;
  decorationMinutes: number;
  bakingMinutes: number;
  coolingHours: number;
  /** Empaque, estructura y decoración propios de este pedido (no escalan con el molde). */
  extras: RecipeLine[];
}

export interface Quote {
  id: string;
  number: number;
  createdAt: string;
  eventDate: string;
  client: { name: string; phone: string; email: string };
  status: QuoteStatus;
  lines: QuoteLine[];
  tier: PriceTier;
  ivaEnabled: boolean;
  delivery: { mode: DeliveryMode; km: number; roundTrip: boolean; fixedClp: number; address: string };
  rental: { enabled: boolean; description: string; material: RentalMaterial; depositClp: number; returnDays: number };
  description: string;
  notes: string;
}

export interface Settings {
  brand: {
    name: string;
    tagline: string;
    logoDataUrl: string;
    rut: string;
    phone: string;
    email: string;
    address: string;
    instagram: string;
  };
  laborProductionClpHour: number;
  laborDecorationClpHour: number;
  ovenCostPerHourClp: number;
  coolingMode: "fixed" | "hourly";
  coolingFixedClp: number;
  coolingPerHourClp: number;
  overheadPct: number;
  marginGourmetPct: number;
  ivaEnabledByDefault: boolean;
  ivaPct: number;
  commercialRounding: boolean;
  deliveryPerKmClp: number;
  deliveryMinClp: number;
  deliveryFixedClp: number;
  depositPct: number;
  quoteValidityDays: number;
  legalClause: string;
}

export interface AppData {
  schemaVersion: number;
  settings: Settings;
  items: Item[];
  recipes: Recipe[];
  quotes: Quote[];
}
