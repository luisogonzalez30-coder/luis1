"use client";

import { ArrowLeft, Plus, Sparkles, Trash2, TriangleAlert, Utensils } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { CostTable } from "@/components/CostTable";
import { MoldEditor } from "@/components/MoldEditor";
import { TierCards } from "@/components/TierCards";
import { Btn, Card, Chips, Empty, Field, Money, NumInput, PageHeader, Seal, linkBtn } from "@/components/ui";
import { money } from "@/lib/domain/format";
import { ALLERGEN_LABEL, CATEGORY_LABEL, DIET_CONFLICTS, DIET_LABEL } from "@/lib/domain/labels";
import { priceTiers } from "@/lib/domain/pricing";
import { costRecipe } from "@/lib/domain/recipeCost";
import type { Allergen, DietLabel, Item, Recipe } from "@/lib/domain/types";
import { UNIT_LABEL, normalize } from "@/lib/domain/units";
import { askIa } from "@/lib/ia/client";
import type { ParsedRecipe } from "@/lib/ia/contract";
import { uid } from "@/lib/store/seed";
import { actions, useAppData } from "@/lib/store/store";

const DIETS: DietLabel[] = ["sin_gluten", "vegano", "sin_azucar_refinada"];

export default function RecetaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { recipes, items, settings, quotes } = useAppData();
  const recipe = recipes.find((r) => r.id === id);
  const [addId, setAddId] = useState("");

  if (!recipe) {
    return (
      <Empty>
        Esta receta no existe. <Link href="/recetas" className="underline">Volver al recetario</Link>
      </Empty>
    );
  }

  const set = (patch: Partial<Recipe>) => actions.saveRecipe({ ...recipe, ...patch });
  const byId = new Map(items.map((i) => [i.id, i]));
  const { cost, requirements, missingItemIds } = costRecipe(recipe, items, settings);
  const tiers = priceTiers(cost.total, settings, settings.ivaEnabledByDefault);
  const allergens = [...new Set(requirements.flatMap((r) => r.item.allergens))] as Allergen[];
  const conflicts = recipe.dietLabels.filter((d) => DIET_CONFLICTS[d].some((a) => allergens.includes(a)));
  const available = items.filter((i) => !recipe.lines.some((l) => l.itemId === i.id));

  const remove = () => {
    const used = quotes.filter((q) => q.lines.some((l) => l.recipeId === recipe.id)).length;
    const msg = used ? `Esta receta está en ${used} cotización(es), que quedarán sin costeo. ¿Eliminar igual?` : "¿Eliminar esta receta?";
    if (!window.confirm(msg)) return;
    actions.deleteRecipe(recipe.id);
    router.push("/recetas");
  };

  return (
    <>
      <Link href="/recetas" className="no-print mb-3 inline-flex items-center gap-1 text-sm text-cacao-3 hover:text-cacao">
        <ArrowLeft size={14} /> Recetario
      </Link>
      <PageHeader eyebrow="Receta" title={recipe.name || "Sin nombre"}>
        <Link href={`/recetas/${recipe.id}/taller`} className={linkBtn()}><Utensils size={15} /> Ficha de taller</Link>
        <Btn variant="danger" onClick={remove}><Trash2 size={15} /> Eliminar</Btn>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card title="Datos base">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nombre" className="sm:col-span-2">
                <input value={recipe.name} onChange={(e) => set({ name: e.target.value })} />
              </Field>
              <Field label="Molde base de la receta" hint="Las cotizaciones escalan desde este volumen." className="sm:col-span-2">
                <MoldEditor mold={recipe.baseMold} onChange={(baseMold) => set({ baseMold })} />
              </Field>
              <Field label="Porciones"><NumInput value={recipe.portions} onChange={(portions) => set({ portions })} /></Field>
              <Field label="Etiquetas">
                <Chips options={DIETS} value={recipe.dietLabels} onChange={(dietLabels) => set({ dietLabels })} labels={DIET_LABEL} />
              </Field>
            </div>
            {conflicts.length > 0 && (
              <p className="mt-3 flex items-start gap-2 rounded-md border border-terracota/40 bg-terracota-claro px-3 py-2 text-sm text-terracota">
                <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                La etiqueta {conflicts.map((c) => `"${DIET_LABEL[c]}"`).join(" y ")} contradice los alérgenos de los ingredientes. Revisa antes de cotizar.
              </p>
            )}
          </Card>

          <Card title="Ingredientes y materiales" aside={<span className="text-xs text-cacao-3">Cantidades netas para el molde base</span>}>
            {recipe.lines.length === 0 ? (
              <Empty>Agrega insumos abajo o importa la receta con IA.</Empty>
            ) : (
              <ul className="divide-y divide-crema-2">
                {recipe.lines.map((line, idx) => {
                  const item = byId.get(line.itemId);
                  const req = requirements.find((r) => r.item.id === line.itemId);
                  return (
                    <li key={line.itemId} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                      <span className="min-w-0 flex-1">
                        {item ? item.name : <span className="text-terracota">Insumo eliminado</span>}
                        {item && item.category !== "ingredient" && <span className="ml-2 text-xs text-cacao-3">{CATEGORY_LABEL[item.category]} · no escala</span>}
                        {item?.purchasePriceClp === 0 && <span className="ml-2"><Seal tone="alerta">Sin precio</Seal></span>}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <NumInput
                          value={line.qty}
                          onChange={(qty) => set({ lines: recipe.lines.map((l, i) => (i === idx ? { ...l, qty } : l)) })}
                          className="!w-24"
                          aria-label={`Cantidad de ${item?.name ?? "insumo"}`}
                        />
                        <span className="w-6 text-xs text-cacao-3">{item ? UNIT_LABEL[item.baseUnit] : ""}</span>
                      </span>
                      <Money value={req?.costClp ?? 0} className="w-24 text-right text-cacao-2" />
                      <button aria-label="Quitar" onClick={() => set({ lines: recipe.lines.filter((_, i) => i !== idx) })} className="p-1 text-cacao-3 hover:text-terracota">
                        <Trash2 size={15} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {missingItemIds.length > 0 && <p className="mt-2 text-xs text-terracota">Hay líneas con insumos eliminados: no entran al costo.</p>}
            <div className="mt-3 flex gap-2">
              <select aria-label="Insumo a agregar" value={addId} onChange={(e) => setAddId(e.target.value)} className="min-w-0 flex-1">
                <option value="">Agregar insumo…</option>
                {available.map((i) => (
                  <option key={i.id} value={i.id}>{i.name} ({UNIT_LABEL[i.baseUnit]})</option>
                ))}
              </select>
              <Btn
                disabled={!addId}
                onClick={() => {
                  set({ lines: [...recipe.lines, { itemId: addId, qty: byId.get(addId)?.baseUnit === "unit" ? 1 : 100 }] });
                  setAddId("");
                }}
              >
                <Plus size={15} /> Agregar
              </Btn>
            </div>
          </Card>

          <Card title="Tiempos">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Field label="Producción (min)"><NumInput value={recipe.productionMinutes} onChange={(n) => set({ productionMinutes: n })} /></Field>
              <Field label="Decoración (min)"><NumInput value={recipe.decorationMinutes} onChange={(n) => set({ decorationMinutes: n })} /></Field>
              <Field label="Horno (min)"><NumInput value={recipe.bakingMinutes} onChange={(n) => set({ bakingMinutes: n })} /></Field>
              <Field label="Frío / reposo (h)"><NumInput value={recipe.coolingHours} onChange={(n) => set({ coolingHours: n })} /></Field>
            </div>
          </Card>

          <Card title="Preparación" aside={<span className="text-xs text-cacao-3">Un paso por línea</span>}>
            <textarea
              rows={Math.max(5, recipe.steps.length + 1)}
              className="w-full leading-relaxed"
              value={recipe.steps.join("\n")}
              onChange={(e) => set({ steps: e.target.value.split("\n") })}
              placeholder={"Precalentar el horno a 170 °C.\nBatir huevos y azúcar hasta punto letra."}
            />
            <Field label="Notas de taller" className="mt-3">
              <input value={recipe.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Ej. usar aro perforado, no abrir el horno antes de 30 min" />
            </Field>
          </Card>

          <IaImport recipe={recipe} items={items} />
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <Card title="Costo en molde base">
            <CostTable cost={cost} />
            <p className="mt-3 text-xs text-cacao-3">
              {recipe.portions > 0 && `${money(cost.total / recipe.portions)} por porción. `}Tiempos de la receta, 1 unidad.
            </p>
          </Card>
          <Card title="Precio sugerido">
            <TierCards tiers={tiers} ivaEnabled={settings.ivaEnabledByDefault} />
          </Card>
          <Card title="Sellos de alérgenos">
            {allergens.length === 0 ? (
              <p className="text-sm text-cacao-3">Ningún ingrediente declara alérgenos.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {allergens.map((a) => <Seal key={a} tone="alerta">Contiene {ALLERGEN_LABEL[a]}</Seal>)}
              </div>
            )}
            {recipe.dietLabels.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {recipe.dietLabels.map((d) => <Seal key={d} tone="ok">{DIET_LABEL[d]}</Seal>)}
              </div>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/** Cruza lo que devolvió la IA con la bodega; lo que no existe se crea como insumo sin precio. */
function applyParsed(recipe: Recipe, parsed: ParsedRecipe, items: Item[]): { created: number; skipped: string[] } {
  const pool = [...items];
  const lines = new Map<string, number>();
  const skipped: string[] = [];
  let created = 0;

  for (const ing of parsed.ingredients) {
    const norm = normalize(ing.qty, ing.unit);
    if (!norm || norm.qty <= 0) {
      skipped.push(ing.name);
      continue;
    }
    const key = fold(ing.name);
    let item = pool.find((i) => i.baseUnit === norm.baseUnit && (fold(i.name) === key || fold(i.name).includes(key) || key.includes(fold(i.name))));
    if (!item) {
      item = {
        id: uid(),
        name: ing.name,
        category: "ingredient",
        baseUnit: norm.baseUnit,
        purchaseQty: norm.baseUnit === "unit" ? 1 : 1000,
        purchasePriceClp: 0,
        wastePct: 0,
        stockQty: 0,
        allergens: [],
      };
      pool.push(item);
      actions.saveItem(item);
      created += 1;
    }
    lines.set(item.id, (lines.get(item.id) ?? 0) + Math.round(norm.qty * 10) / 10);
  }

  actions.saveRecipe({
    ...recipe,
    name: parsed.name || recipe.name,
    portions: parsed.portions > 0 ? Math.round(parsed.portions) : recipe.portions,
    lines: [...lines].map(([itemId, qty]) => ({ itemId, qty })),
    steps: parsed.steps.length ? parsed.steps : recipe.steps,
  });
  return { created, skipped };
}

function IaImport({ recipe, items }: { recipe: Recipe; items: Item[] }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const run = async () => {
    if (recipe.lines.length > 0 && !window.confirm("Importar reemplaza los ingredientes y pasos actuales de esta receta. ¿Continuar?")) return;
    setBusy(true);
    setStatus("");
    const res = await askIa({ task: "parse-recipe", text });
    setBusy(false);
    if (res.recipe.ingredients.length === 0) {
      setStatus("No se reconoció ningún ingrediente. Escribe uno por línea, por ejemplo: 250 g de harina.");
      return;
    }
    const { created, skipped } = applyParsed(recipe, res.recipe, items);
    setStatus(
      [
        `${res.recipe.ingredients.length - skipped.length} ingredientes importados con ${res.source === "claude" ? "IA" : "el analizador local"}.`,
        created ? `${created} insumo(s) nuevo(s) quedaron sin precio: complétalos en Insumos.` : "",
        skipped.length ? `Sin unidad reconocible: ${skipped.join(", ")}.` : "",
        res.notice ?? "",
      ]
        .filter(Boolean)
        .join(" "),
    );
    setText("");
  };

  return (
    <Card title="Importar receta desde texto" aside={<Seal tone="oro"><Sparkles size={11} /> IA</Seal>} className="no-print">
      <textarea
        rows={5}
        className="w-full"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Pega aquí la receta tal como la tienes:\n250 g de harina\n4 huevos\n1. Batir los huevos…"}
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Btn variant="primary" disabled={busy || text.trim().length < 10} onClick={() => void run()}>
          <Sparkles size={15} /> {busy ? "Analizando…" : "Estructurar receta"}
        </Btn>
        {status && <p role="status" className="min-w-0 flex-1 text-sm text-cacao-2">{status}</p>}
      </div>
    </Card>
  );
}
