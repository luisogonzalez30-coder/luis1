"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Btn, Card, Chips, Empty, Field, Money, NumInput, PageHeader, Seal } from "@/components/ui";
import { unitCostClp } from "@/lib/domain/costing";
import { qty } from "@/lib/domain/format";
import { ALLERGEN_LABEL, CATEGORY_LABEL } from "@/lib/domain/labels";
import type { Allergen, BaseUnit, Item, ItemCategory } from "@/lib/domain/types";
import { PURCHASE_UNITS, UNIT_LABEL } from "@/lib/domain/units";
import { uid } from "@/lib/store/seed";
import { actions, useAppData } from "@/lib/store/store";

const CATEGORIES: ItemCategory[] = ["ingredient", "packaging", "decoration"];
const ALLERGENS: Allergen[] = ["gluten", "lacteos", "huevo", "frutos_secos", "soya"];

const blank = (): Item => ({
  id: uid(),
  name: "",
  category: "ingredient",
  baseUnit: "g",
  purchaseQty: 1000,
  purchasePriceClp: 0,
  wastePct: 0,
  stockQty: 0,
  allergens: [],
});

export default function InsumosPage() {
  const { items, recipes, quotes } = useAppData();
  const [editing, setEditing] = useState<Item | null>(null);

  const usedIn = (id: string) =>
    recipes.filter((r) => r.lines.some((l) => l.itemId === id)).length +
    quotes.filter((q) => q.lines.some((l) => l.extras.some((e) => e.itemId === id))).length;

  const remove = (item: Item) => {
    const n = usedIn(item.id);
    const msg = n
      ? `"${item.name}" se usa en ${n} receta(s) o cotización(es). Si lo eliminas, dejará de costearse ahí. ¿Eliminar igual?`
      : `¿Eliminar "${item.name}"?`;
    if (window.confirm(msg)) actions.deleteItem(item.id);
  };

  return (
    <>
      <PageHeader eyebrow="Bodega" title="Insumos">
        <Btn variant="primary" onClick={() => setEditing(blank())}>
          <Plus size={15} /> Nuevo insumo
        </Btn>
      </PageHeader>

      {editing && <ItemForm key={editing.id} initial={editing} onClose={() => setEditing(null)} />}

      <div className="space-y-6">
        {CATEGORIES.map((category) => {
          const rows = items.filter((i) => i.category === category).sort((a, b) => a.name.localeCompare(b.name, "es"));
          return (
            <Card
              key={category}
              title={CATEGORY_LABEL[category]}
              aside={<Seal tone={category === "ingredient" ? "oro" : "neutro"}>{category === "ingredient" ? "Aplica merma" : "Sin merma"}</Seal>}
            >
              {rows.length === 0 ? (
                <Empty>Sin insumos en esta categoría.</Empty>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="rotulo border-b border-crema-3 text-left">
                        <th className="py-2 font-semibold">Insumo</th>
                        <th className="py-2 text-right font-semibold">Formato</th>
                        <th className="py-2 text-right font-semibold">Precio</th>
                        <th className="py-2 text-right font-semibold">Costo base</th>
                        {category === "ingredient" && <th className="py-2 text-right font-semibold">Merma</th>}
                        <th className="py-2 text-right font-semibold">Stock</th>
                        <th className="w-20" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((item) => (
                        <tr key={item.id} className="border-b border-crema-2 last:border-0">
                          <td className="py-2 pr-3">
                            <span className="font-medium">{item.name}</span>
                            {item.purchasePriceClp === 0 && <Seal tone="alerta">Sin precio</Seal>}
                            {item.allergens.length > 0 && (
                              <span className="ml-2 text-xs text-cacao-3">{item.allergens.map((a) => ALLERGEN_LABEL[a]).join(" · ")}</span>
                            )}
                          </td>
                          <td className="cifra py-2 text-right">{qty(item.purchaseQty, item.baseUnit)}</td>
                          <td className="py-2 text-right"><Money value={item.purchasePriceClp} /></td>
                          <td className="cifra py-2 text-right text-cacao-2">
                            $ {unitCostClp(item).toLocaleString("es-CL", { maximumFractionDigits: 2 })}/{UNIT_LABEL[item.baseUnit]}
                          </td>
                          {category === "ingredient" && <td className="cifra py-2 text-right">{item.wastePct}%</td>}
                          <td className="cifra py-2 text-right">{qty(item.stockQty, item.baseUnit)}</td>
                          <td className="py-2 text-right">
                            <button aria-label={`Editar ${item.name}`} onClick={() => setEditing(item)} className="rounded p-1.5 text-cacao-3 hover:text-cacao">
                              <Pencil size={15} />
                            </button>
                            <button aria-label={`Eliminar ${item.name}`} onClick={() => remove(item)} className="rounded p-1.5 text-cacao-3 hover:text-terracota">
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}

function ItemForm({ initial, onClose }: { initial: Item; onClose: () => void }) {
  const [item, setItem] = useState(initial);
  // El formato de compra se edita en la unidad cómoda (kg, L, docena) y se guarda en unidad base.
  const [factor, setFactor] = useState(() => (initial.baseUnit !== "unit" && initial.purchaseQty >= 1000 ? 1000 : 1));
  const set = (patch: Partial<Item>) => setItem((i) => ({ ...i, ...patch }));
  const isIngredient = item.category === "ingredient";

  const save = () => {
    if (!item.name.trim()) return;
    actions.saveItem({ ...item, name: item.name.trim(), wastePct: isIngredient ? item.wastePct : 0, allergens: isIngredient ? item.allergens : [] });
    onClose();
  };

  return (
    <Card title={initial.name ? `Editar ${initial.name}` : "Nuevo insumo"} className="mb-6 border-oro/50">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Nombre" className="sm:col-span-2">
          <input autoFocus value={item.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ej. Mantequilla sin sal" />
        </Field>
        <Field label="Categoría">
          <select value={item.category} onChange={(e) => set({ category: e.target.value as ItemCategory })}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
            ))}
          </select>
        </Field>
        <Field label="Se mide en">
          <select
            value={item.baseUnit}
            onChange={(e) => {
              set({ baseUnit: e.target.value as BaseUnit });
              setFactor(1);
            }}
          >
            <option value="g">Gramos</option>
            <option value="ml">Mililitros</option>
            <option value="unit">Unidades</option>
          </select>
        </Field>
        <Field label="Formato de compra">
          <div className="flex gap-1.5">
            <NumInput value={item.purchaseQty / factor} onChange={(n) => set({ purchaseQty: n * factor })} />
            <select
              aria-label="Unidad del formato"
              value={factor}
              onChange={(e) => {
                const next = Number(e.target.value);
                set({ purchaseQty: (item.purchaseQty / factor) * next });
                setFactor(next);
              }}
            >
              {PURCHASE_UNITS[item.baseUnit].map((u) => (
                <option key={u.label} value={u.factor}>{u.label}</option>
              ))}
            </select>
          </div>
        </Field>
        <Field label="Precio del formato ($)">
          <NumInput value={item.purchasePriceClp} onChange={(n) => set({ purchasePriceClp: n })} />
        </Field>
        <Field label="Merma %" hint={isIngredient ? "Lo que se pierde al limpiar, batir o traspasar." : "Solo aplica a comestibles."}>
          <NumInput value={isIngredient ? item.wastePct : 0} onChange={(n) => set({ wastePct: Math.min(95, n) })} disabled={!isIngredient} />
        </Field>
        <Field label={`Stock actual (${UNIT_LABEL[item.baseUnit]})`}>
          <NumInput value={item.stockQty} onChange={(n) => set({ stockQty: n })} />
        </Field>
        {isIngredient && (
          <Field label="Alérgenos que aporta" className="sm:col-span-2 lg:col-span-4">
            <Chips options={ALLERGENS} value={item.allergens} onChange={(allergens) => set({ allergens })} labels={ALLERGEN_LABEL} />
          </Field>
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <Btn variant="primary" onClick={save} disabled={!item.name.trim() || item.purchaseQty <= 0}>Guardar</Btn>
        <Btn onClick={onClose}>Cancelar</Btn>
      </div>
    </Card>
  );
}
