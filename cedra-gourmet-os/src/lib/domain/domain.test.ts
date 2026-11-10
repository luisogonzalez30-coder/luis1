import { describe, expect, it } from "vitest";
import { costLine, grossQty } from "./costing";
import { moldVolumeCm3, scaleFactor, structureAdvice } from "./molds";
import { commercialRound, netPriceFromMargin, priceFor, priceTiers } from "./pricing";
import { deliveryCharge, quoteTotals } from "./quote";
import { approvedInWeek, consolidate, weekStart } from "./shopping";
import type { Item, Mold, Quote, QuoteLine, Recipe, Settings } from "./types";
import { normalize } from "./units";
import { seedData } from "../store/seed";

const round = (d: number, h: number): Mold => ({ shape: "round", aCm: d, bCm: 0, heightCm: h });
const item = (p: Partial<Item> & Pick<Item, "id" | "category">): Item => ({
  name: p.id,
  baseUnit: "g",
  purchaseQty: 1000,
  purchasePriceClp: 1000,
  wastePct: 0,
  stockQty: 0,
  allergens: [],
  ...p,
});
const settings: Settings = {
  ...seedData().settings,
  laborProductionClpHour: 6000,
  laborDecorationClpHour: 12000,
  ovenCostPerHourClp: 1200,
  coolingMode: "fixed",
  coolingFixedClp: 500,
  overheadPct: 10,
  marginGourmetPct: 45,
  ivaPct: 19,
  commercialRounding: true,
};

describe("unidades", () => {
  it("normaliza a g, ml y unit", () => {
    expect(normalize(2.5, "kg")).toEqual({ qty: 2500, baseUnit: "g" });
    expect(normalize(1, "L")).toEqual({ qty: 1000, baseUnit: "ml" });
    expect(normalize(2, "docena")).toEqual({ qty: 24, baseUnit: "unit" });
    expect(normalize(1, "tazas")).toBeNull();
  });
});

describe("moldes", () => {
  it("escala por volumen, no por diámetro", () => {
    expect(moldVolumeCm3(round(20, 10))).toBeCloseTo(3141.59, 1);
    expect(scaleFactor(round(20, 10), [round(30, 10)])).toBeCloseTo(2.25, 6);
    expect(scaleFactor(round(20, 10), [round(20, 10), round(20, 10)])).toBeCloseTo(2, 6);
    expect(scaleFactor(round(20, 10), [{ shape: "square", aCm: 20, bCm: 0, heightCm: 10 }])).toBeCloseTo(4 / Math.PI, 6);
  });
  it("alerta de estructura sobre 14 cm o más de 1 piso", () => {
    expect(structureAdvice([round(20, 14)]).required).toBe(false);
    const tall = structureAdvice([round(20, 15)]);
    expect(tall).toMatchObject({ required: true, intermediateBoards: 1, dowels: 4, tallBox: true });
    const two = structureAdvice([round(25, 10), round(15, 4)]);
    expect(two).toMatchObject({ required: true, intermediateBoards: 1, dowels: 4, centralDowel: false });
    expect(structureAdvice([round(30, 10), round(22, 10), round(15, 10)])).toMatchObject({ dowels: 9, centralDowel: true });
  });
});

describe("precio", () => {
  it("usa margen real, no mark-up", () => {
    expect(netPriceFromMargin(10000, 45)).toBeCloseTo(18181.82, 2);
    expect(netPriceFromMargin(10000, 30)).toBeCloseTo(14285.71, 2);
    expect(netPriceFromMargin(10000, 55)).toBeCloseTo(22222.22, 2);
    expect(() => netPriceFromMargin(10000, 100)).toThrow();
  });
  it("redondea hacia arriba a $500 o $900", () => {
    expect(commercialRound(21636)).toBe(21900);
    expect(commercialRound(21300)).toBe(21500);
    expect(commercialRound(21500)).toBe(21500);
    expect(commercialRound(21901)).toBe(22500);
    expect(commercialRound(1)).toBe(500);
  });
  it("separa IVA del precio final y recalcula la utilidad", () => {
    const p = priceFor(10000, { marginPct: 45, ivaEnabled: true, ivaPct: 19, commercialRounding: true });
    expect(p.finalPrice).toBe(21900); // 18.181,82 × 1,19 = 21.636,36
    expect(p.net).toBe(18403);
    expect(p.iva).toBe(3497);
    expect(p.utility).toBe(8403);
    expect(p.effectiveMarginPct).toBeGreaterThanOrEqual(45);
  });
  it("entrega los 3 niveles", () => {
    const t = priceTiers(10000, settings, false);
    expect([t.competitive.finalPrice, t.gourmet.finalPrice, t.boutique.finalPrice]).toEqual([14500, 18500, 22500]);
  });
});

describe("costeo", () => {
  const items = [
    item({ id: "harina", category: "ingredient", wastePct: 10, allergens: ["gluten"], stockQty: 500 }),
    item({ id: "caja", category: "packaging", baseUnit: "unit", purchaseQty: 10, purchasePriceClp: 20000, wastePct: 50 }),
    item({ id: "topper", category: "decoration", baseUnit: "unit", purchaseQty: 1, purchasePriceClp: 3000 }),
  ];
  const recipe: Recipe = {
    id: "r",
    name: "Base",
    baseMold: round(20, 10),
    portions: 15,
    lines: [
      { itemId: "harina", qty: 900 },
      { itemId: "caja", qty: 1 },
    ],
    productionMinutes: 60,
    decorationMinutes: 30,
    bakingMinutes: 45,
    coolingHours: 4,
    steps: [],
    dietLabels: ["vegano"],
    notes: "",
  };
  const line: QuoteLine = {
    id: "l",
    recipeId: "r",
    title: "Torta",
    tiers: [round(20, 10), round(20, 10)],
    quantity: 1,
    productionMinutes: 60,
    decorationMinutes: 30,
    bakingMinutes: 45,
    coolingHours: 4,
    extras: [{ itemId: "topper", qty: 1 }],
  };

  it("la merma solo aplica a comestibles", () => {
    expect(grossQty(items[0]!, 900)).toBeCloseTo(1000, 6);
    expect(grossQty(items[1]!, 1)).toBe(1);
  });

  it("escala ingredientes, no empaque, y suma costos invisibles", () => {
    const { cost, factor } = costLine(line, recipe, items, settings);
    expect(factor).toBeCloseTo(2, 6);
    expect(cost.ingredients).toBeCloseTo(2000, 6); // 900 g × 2 / 0,9 × $1/g
    expect(cost.packaging).toBe(2000); // 1 caja: ni escala ni merma
    expect(cost.decoration).toBe(3000);
    expect(cost.laborProduction).toBe(6000);
    expect(cost.laborDecoration).toBe(6000);
    expect(cost.oven).toBe(900); // (45/60) × 1.200
    expect(cost.cooling).toBe(500);
    expect(cost.baseOperation).toBeCloseTo(20400, 6);
    expect(cost.overhead).toBeCloseTo(2040, 6);
    expect(cost.total).toBeCloseTo(22440, 6);
  });

  const quote: Quote = {
    ...seedData().quotes[0]!,
    number: 7,
    status: "approved",
    eventDate: "2026-11-14",
    lines: [line],
    tier: "gourmet",
    ivaEnabled: true,
    delivery: { mode: "km", km: 12, roundTrip: true, fixedClp: 0, address: "" },
    rental: { enabled: true, description: "Pedestal", material: "cristal", depositClp: 25000, returnDays: 3 },
  };
  const data = { items, recipes: [recipe], settings: { ...settings, deliveryPerKmClp: 600, deliveryMinClp: 3000, depositPct: 50 } };

  it("totaliza la cotización separando sueldo, utilidad y garantía", () => {
    const t = quoteTotals(quote, data);
    expect(t.selected.finalPrice).toBe(48900); // 22.440 / 0,55 × 1,19 = 48.552
    expect(t.laborSalary).toBe(12000);
    expect(t.companyUtility).toBe(t.selected.net - 22440);
    expect(t.delivery).toBe(14400);
    expect(t.total).toBe(63300);
    expect(t.deposit).toBe(31650);
    expect(t.totalToPay).toBe(88300);
    expect(t.allergens).toEqual(["gluten"]);
    expect(t.dietLabels).toEqual(["vegano"]);
  });

  it("despacho: mínimo y tarifa fija", () => {
    const s = { deliveryPerKmClp: 600, deliveryMinClp: 3000 };
    expect(deliveryCharge({ mode: "km", km: 2, roundTrip: false, fixedClp: 0, address: "" }, s)).toBe(3000);
    expect(deliveryCharge({ mode: "fixed", km: 0, roundTrip: false, fixedClp: 8000, address: "" }, s)).toBe(8000);
    expect(deliveryCharge({ mode: "none", km: 9, roundTrip: true, fixedClp: 8000, address: "" }, s)).toBe(0);
  });

  it("consolida compras de la semana contra el stock", () => {
    expect(weekStart("2026-11-14")).toBe("2026-11-09");
    const week = approvedInWeek([quote, { ...quote, id: "b", number: 8 }, { ...quote, id: "c", status: "draft" }], "2026-11-09");
    expect(week).toHaveLength(2);
    const harina = consolidate(week, data).find((r) => r.item.id === "harina")!;
    expect(harina.needed).toBeCloseTo(4000, 6);
    expect(harina.toBuy).toBeCloseTo(3500, 6);
    expect(harina.packs).toBe(4);
    expect(harina.estimatedCostClp).toBe(4000);
    expect(harina.quoteNumbers).toEqual([7, 8]);
  });
});

describe("analizador local de recetas", () => {
  it("separa nombre, porciones, ingredientes y pasos", async () => {
    const { parseRecipeLocally } = await import("../ia/local");
    const r = parseRecipeLocally(
      "Bizcocho de vainilla\n12 porciones\n250 g de harina\n4 huevos\n1/2 taza de leche\n1,5 kg azúcar\nPreparación\n1. Batir.\nHornear 35 minutos.",
    );
    expect(r.name).toBe("Bizcocho de vainilla");
    expect(r.portions).toBe(12);
    expect(r.ingredients).toEqual([
      { name: "Harina", qty: 250, unit: "g" },
      { name: "Huevos", qty: 4, unit: "unidad" },
      { name: "Leche", qty: 0.5, unit: "taza" },
      { name: "Azúcar", qty: 1.5, unit: "kg" },
    ]);
    expect(r.steps).toEqual(["Batir.", "Hornear 35 minutos."]);
  });
});
