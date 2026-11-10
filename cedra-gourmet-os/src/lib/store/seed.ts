import { addDays, toIso, weekStart } from "../domain/shopping";
import type { AppData, Item, Mold, Quote, Settings } from "../domain/types";

export const SCHEMA_VERSION = 1;

export const DEFAULT_LEGAL_CLAUSE =
  "Transporte y cadena de frío: el producto se entrega refrigerado y en perfecto estado. Desde el momento del retiro o de la recepción conforme, su traslado y conservación son responsabilidad del cliente. Debe transportarse sobre una superficie plana (piso del vehículo, nunca en el asiento ni en brazos), con aire acondicionado, y mantenerse refrigerado entre 2 °C y 5 °C hasta 30 minutos antes de servir. No se aceptan reclamos por daños derivados de traslado inadecuado, exposición al calor o al sol, ni manipulación de terceros. Las tortas con estructura interna contienen pilares y discos no comestibles que deben retirarse al porcionar.";

export function defaultSettings(): Settings {
  return {
    brand: {
      name: "Cedra Gourmet",
      tagline: "Pastelería de autor",
      logoDataUrl: "",
      rut: "",
      phone: "",
      email: "",
      address: "",
      instagram: "",
    },
    laborProductionClpHour: 6000,
    laborDecorationClpHour: 12000,
    ovenCostPerHourClp: 1200,
    coolingMode: "fixed",
    coolingFixedClp: 800,
    coolingPerHourClp: 150,
    overheadPct: 12,
    marginGourmetPct: 45,
    ivaEnabledByDefault: true,
    ivaPct: 19,
    commercialRounding: true,
    deliveryPerKmClp: 700,
    deliveryMinClp: 4000,
    deliveryFixedClp: 8000,
    depositPct: 50,
    quoteValidityDays: 7,
    legalClause: DEFAULT_LEGAL_CLAUSE,
  };
}

export const uid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);

const round = (aCm: number, heightCm: number): Mold => ({ shape: "round", aCm, bCm: 0, heightCm });

const i = (
  id: string,
  name: string,
  category: Item["category"],
  baseUnit: Item["baseUnit"],
  purchaseQty: number,
  purchasePriceClp: number,
  wastePct: number,
  stockQty: number,
  allergens: Item["allergens"] = [],
): Item => ({ id, name, category, baseUnit, purchaseQty, purchasePriceClp, wastePct, stockQty, allergens });

/** Datos de ejemplo para que la app muestre números reales desde el primer minuto. Precios referenciales. */
export function seedData(): AppData {
  const items: Item[] = [
    i("harina", "Harina sin polvos", "ingredient", "g", 5000, 5490, 2, 3200, ["gluten"]),
    i("azucar", "Azúcar granulada", "ingredient", "g", 5000, 5990, 1, 4100),
    i("mantequilla", "Mantequilla sin sal", "ingredient", "g", 1000, 9990, 3, 1500, ["lacteos"]),
    i("huevo", "Huevo de campo", "ingredient", "unit", 30, 7490, 4, 24, ["huevo"]),
    i("crema", "Crema para batir 35%", "ingredient", "ml", 1000, 5290, 5, 2000, ["lacteos"]),
    i("chocolate", "Cobertura bitter 64%", "ingredient", "g", 2500, 32900, 2, 1800, ["lacteos", "soya"]),
    i("frambuesa", "Frambuesa congelada", "ingredient", "g", 1000, 6490, 8, 900),
    i("almendra", "Harina de almendra", "ingredient", "g", 1000, 15900, 2, 400, ["frutos_secos"]),
    i("vainilla", "Extracto de vainilla", "ingredient", "ml", 250, 8900, 0, 180),
    i("caja", "Caja torta 30 × 30 × 15", "packaging", "unit", 10, 14900, 0, 8),
    i("caja_alta", "Caja alta 30 × 30 × 35", "packaging", "unit", 5, 14500, 0, 2),
    i("disco", "Disco MDF 28 cm", "packaging", "unit", 10, 9900, 0, 6),
    i("disco_int", "Disco intermedio cartón 15 cm", "packaging", "unit", 20, 6900, 0, 10),
    i("dowel", "Pilar (dowel) plástico 30 cm", "packaging", "unit", 50, 12500, 0, 30),
    i("blonda", "Blonda dorada", "packaging", "unit", 50, 4900, 0, 40),
    i("topper", "Topper acrílico personalizado", "decoration", "unit", 1, 4500, 0, 0),
    i("flores", "Flores naturales (ramo)", "decoration", "unit", 1, 6900, 0, 0),
    i("oro", "Lámina de oro comestible", "decoration", "unit", 10, 12900, 0, 6),
  ];

  const recipes: AppData["recipes"] = [
    {
      id: "chocolate-frambuesa",
      name: "Chocolate bitter y frambuesa",
      baseMold: round(20, 10),
      portions: 15,
      lines: [
        { itemId: "harina", qty: 280 },
        { itemId: "azucar", qty: 300 },
        { itemId: "mantequilla", qty: 250 },
        { itemId: "huevo", qty: 5 },
        { itemId: "chocolate", qty: 400 },
        { itemId: "crema", qty: 500 },
        { itemId: "frambuesa", qty: 300 },
        { itemId: "vainilla", qty: 10 },
        { itemId: "caja", qty: 1 },
        { itemId: "disco", qty: 1 },
        { itemId: "blonda", qty: 1 },
      ],
      productionMinutes: 90,
      decorationMinutes: 60,
      bakingMinutes: 45,
      coolingHours: 6,
      steps: [
        "Precalentar el horno a 170 °C. Enmantequillar y empapelar el molde.",
        "Fundir la mantequilla con 150 g de cobertura. Batir huevos y azúcar hasta punto letra.",
        "Incorporar el chocolate fundido y luego la harina tamizada, en tres partes.",
        "Hornear 45 minutos. Enfriar sobre rejilla antes de cortar en tres discos.",
        "Ganache montada: hervir la crema, verter sobre el resto de la cobertura, reposar en frío y montar.",
        "Armar alternando bizcocho, ganache y frambuesa. Reposar 6 horas en frío antes de alisar.",
      ],
      dietLabels: [],
      notes: "",
    },
  ];

  // La cotización de ejemplo cae siempre en la semana en curso, para que Inicio y Compras muestren datos.
  const today = toIso(new Date());
  const saturday = addDays(weekStart(today), 5);

  const quotes: Quote[] = [
    {
      id: "demo",
      number: 1,
      createdAt: today,
      eventDate: today > saturday ? today : saturday,
      client: { name: "Cliente de ejemplo", phone: "", email: "" },
      status: "approved",
      lines: [
        {
          id: "demo-l1",
          recipeId: "chocolate-frambuesa",
          title: "Torta de dos pisos, chocolate bitter y frambuesa",
          tiers: [round(24, 10), round(16, 10)],
          quantity: 1,
          productionMinutes: 150,
          decorationMinutes: 120,
          bakingMinutes: 70,
          coolingHours: 8,
          extras: [
            { itemId: "disco_int", qty: 1 },
            { itemId: "dowel", qty: 4 },
            { itemId: "caja_alta", qty: 1 },
            { itemId: "flores", qty: 1 },
          ],
        },
      ],
      tier: "gourmet",
      ivaEnabled: true,
      delivery: { mode: "km", km: 9, roundTrip: true, fixedClp: 8000, address: "" },
      rental: { enabled: false, description: "Pedestal para torta", material: "cristal", depositClp: 25000, returnDays: 3 },
      description: "",
      notes: "",
    },
  ];

  return { schemaVersion: SCHEMA_VERSION, settings: defaultSettings(), items, recipes, quotes };
}
