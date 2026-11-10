"use client";

import { ArrowLeft, FileText, Layers, Plus, Sparkles, Trash2, TriangleAlert, Utensils, Wand2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { CostTable } from "@/components/CostTable";
import { MoldEditor } from "@/components/MoldEditor";
import { TierCards } from "@/components/TierCards";
import { Btn, Card, Empty, Field, Money, NumInput, PageHeader, Seal, Toggle, linkBtn } from "@/components/ui";
import { pct } from "@/lib/domain/format";
import { ALLERGEN_LABEL, CATEGORY_LABEL, DIET_LABEL, MATERIAL_LABEL, STATUS_LABEL } from "@/lib/domain/labels";
import { describeMold, structureAdvice, totalHeightCm, type StructureAdvice } from "@/lib/domain/molds";
import { quoteTotals } from "@/lib/domain/quote";
import type { DeliveryMode, Item, Quote, QuoteLine, QuoteStatus, RecipeLine, RentalMaterial } from "@/lib/domain/types";
import { UNIT_LABEL } from "@/lib/domain/units";
import { askIa } from "@/lib/ia/client";
import { uid } from "@/lib/store/seed";
import { actions, useAppData } from "@/lib/store/store";

const STATUSES: QuoteStatus[] = ["draft", "sent", "approved", "delivered", "rejected"];
const MATERIALS: RentalMaterial[] = ["cristal", "metal", "madera"];

export default function CotizacionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const data = useAppData();
  const { recipes, items, settings } = data;
  const quote = data.quotes.find((q) => q.id === id);
  const [recipeToAdd, setRecipeToAdd] = useState("");
  const [iaBusy, setIaBusy] = useState(false);
  const [iaNotice, setIaNotice] = useState("");

  if (!quote) {
    return (
      <Empty>
        Esta cotización no existe. <Link href="/cotizaciones" className="underline">Volver al listado</Link>
      </Empty>
    );
  }

  const set = (patch: Partial<Quote>) => actions.saveQuote({ ...quote, ...patch });
  const setLine = (lineId: string, patch: Partial<QuoteLine>) =>
    set({ lines: quote.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)) });
  const totals = quoteTotals(quote, data);

  const addLine = () => {
    const recipe = recipes.find((r) => r.id === recipeToAdd);
    if (!recipe) return;
    const line: QuoteLine = {
      id: uid(),
      recipeId: recipe.id,
      title: recipe.name,
      tiers: [{ ...recipe.baseMold }],
      quantity: 1,
      productionMinutes: recipe.productionMinutes,
      decorationMinutes: recipe.decorationMinutes,
      bakingMinutes: recipe.bakingMinutes,
      coolingHours: recipe.coolingHours,
      extras: [],
    };
    set({ lines: [...quote.lines, line] });
    setRecipeToAdd("");
  };

  const describe = async () => {
    setIaBusy(true);
    setIaNotice("");
    const res = await askIa({
      task: "describe-quote",
      brief: {
        brand: settings.brand.name,
        client: quote.client.name,
        eventDate: quote.eventDate,
        products: quote.lines.map((l) => ({ title: l.title, tiers: l.tiers.map(describeMold), quantity: l.quantity })),
        allergens: totals.allergens.map((a) => ALLERGEN_LABEL[a]),
        dietLabels: totals.dietLabels.map((d) => DIET_LABEL[d]),
        delivery: quote.delivery.mode !== "none",
      },
    });
    setIaBusy(false);
    set({ description: res.description });
    setIaNotice(res.notice ?? (res.source === "local" ? "Redactado con la plantilla local (sin clave de IA configurada)." : ""));
  };

  const remove = () => {
    if (!window.confirm(`¿Eliminar la cotización #${quote.number}?`)) return;
    actions.deleteQuote(quote.id);
    router.push("/cotizaciones");
  };

  return (
    <>
      <Link href="/cotizaciones" className="mb-3 inline-flex items-center gap-1 text-sm text-cacao-3 hover:text-cacao">
        <ArrowLeft size={14} /> Cotizaciones
      </Link>
      <PageHeader eyebrow={`Cotización N.º ${String(quote.number).padStart(4, "0")}`} title={quote.client.name || "Sin cliente"}>
        <Link href={`/cotizaciones/${quote.id}/documento`} className={linkBtn("primary")}><FileText size={15} /> Cotización formal</Link>
        <Link href={`/cotizaciones/${quote.id}/taller`} className={linkBtn()}><Utensils size={15} /> Ficha de taller</Link>
        <Btn variant="danger" onClick={remove}><Trash2 size={15} /></Btn>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <Card title="Cliente y evento">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Cliente"><input value={quote.client.name} onChange={(e) => set({ client: { ...quote.client, name: e.target.value } })} /></Field>
              <Field label="Teléfono"><input value={quote.client.phone} onChange={(e) => set({ client: { ...quote.client, phone: e.target.value } })} /></Field>
              <Field label="Correo"><input type="email" value={quote.client.email} onChange={(e) => set({ client: { ...quote.client, email: e.target.value } })} /></Field>
              <Field label="Fecha de entrega"><input type="date" value={quote.eventDate} onChange={(e) => set({ eventDate: e.target.value })} /></Field>
              <Field label="Estado" hint="Solo las aprobadas entran a la lista de compras.">
                <select value={quote.status} onChange={(e) => set({ status: e.target.value as QuoteStatus })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </Field>
            </div>
          </Card>

          {totals.lines.map(({ line, recipe, result }) => (
            <LineCard
              key={line.id}
              line={line}
              recipeName={recipe?.name}
              baseMoldDesc={recipe ? describeMold(recipe.baseMold) : ""}
              factor={result?.factor ?? 0}
              lineCost={result?.cost.total ?? 0}
              items={items}
              onChange={(patch) => setLine(line.id, patch)}
              onRemove={() => set({ lines: quote.lines.filter((l) => l.id !== line.id) })}
            />
          ))}

          <Card title="Agregar producto" className="no-print">
            {recipes.length === 0 ? (
              <Empty>Primero crea una receta en el recetario.</Empty>
            ) : (
              <div className="flex gap-2">
                <select aria-label="Receta" value={recipeToAdd} onChange={(e) => setRecipeToAdd(e.target.value)} className="min-w-0 flex-1">
                  <option value="">Elegir receta…</option>
                  {recipes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <Btn variant="primary" disabled={!recipeToAdd} onClick={addLine}><Plus size={15} /> Agregar</Btn>
              </div>
            )}
          </Card>

          <Card title="Despacho propio">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Modalidad">
                <select value={quote.delivery.mode} onChange={(e) => set({ delivery: { ...quote.delivery, mode: e.target.value as DeliveryMode } })}>
                  <option value="none">Retiro en taller</option>
                  <option value="km">Por kilómetros</option>
                  <option value="fixed">Tarifa fija</option>
                </select>
              </Field>
              {quote.delivery.mode === "km" && (
                <>
                  <Field label="Distancia (km, solo ida)">
                    <NumInput value={quote.delivery.km} onChange={(km) => set({ delivery: { ...quote.delivery, km } })} />
                  </Field>
                  <div className="flex items-end pb-1.5">
                    <Toggle checked={quote.delivery.roundTrip} onChange={(roundTrip) => set({ delivery: { ...quote.delivery, roundTrip } })} label="Cobrar ida y vuelta" />
                  </div>
                </>
              )}
              {quote.delivery.mode === "fixed" && (
                <Field label="Tarifa de traslado ($)">
                  <NumInput value={quote.delivery.fixedClp} onChange={(fixedClp) => set({ delivery: { ...quote.delivery, fixedClp } })} />
                </Field>
              )}
              {quote.delivery.mode !== "none" && (
                <>
                  <Field label="Dirección de entrega" className="sm:col-span-2 lg:col-span-3">
                    <input value={quote.delivery.address} onChange={(e) => set({ delivery: { ...quote.delivery, address: e.target.value } })} />
                  </Field>
                  <div>
                    <p className="rotulo">Cobro al cliente</p>
                    <Money value={totals.delivery} className="text-lg" />
                    {quote.delivery.mode === "km" && (
                      <p className="text-xs text-cacao-3">
                        $ {settings.deliveryPerKmClp}/km · mínimo <Money value={settings.deliveryMinClp} />
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </Card>

          <Card
            title="Arriendo de base o pedestal"
            aside={<Toggle checked={quote.rental.enabled} onChange={(enabled) => set({ rental: { ...quote.rental, enabled } })} label="Incluir" />}
          >
            {quote.rental.enabled ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Pieza" className="sm:col-span-2">
                  <input value={quote.rental.description} onChange={(e) => set({ rental: { ...quote.rental, description: e.target.value } })} placeholder="Ej. Pedestal de cristal 30 cm" />
                </Field>
                <Field label="Material">
                  <select value={quote.rental.material} onChange={(e) => set({ rental: { ...quote.rental, material: e.target.value as RentalMaterial } })}>
                    {MATERIALS.map((m) => <option key={m} value={m}>{MATERIAL_LABEL[m]}</option>)}
                  </select>
                </Field>
                <Field label="Garantía reembolsable ($)">
                  <NumInput value={quote.rental.depositClp} onChange={(depositClp) => set({ rental: { ...quote.rental, depositClp } })} />
                </Field>
                <Field label="Plazo de devolución (días)">
                  <NumInput value={quote.rental.returnDays} onChange={(returnDays) => set({ rental: { ...quote.rental, returnDays } })} />
                </Field>
                <p className="text-xs text-cacao-3 sm:col-span-2 lg:col-span-3">
                  La garantía no es venta: no lleva margen ni IVA y se devuelve cuando la pieza vuelve en buen estado.
                </p>
              </div>
            ) : (
              <p className="text-sm text-cacao-3">Activa esta sección si el cliente se lleva una base de cristal, metal o madera que debe devolver.</p>
            )}
          </Card>

          <Card
            title="Descripción comercial"
            aside={
              <Btn onClick={() => void describe()} disabled={iaBusy || quote.lines.length === 0} className="no-print">
                <Sparkles size={14} /> {iaBusy ? "Redactando…" : "Redactar con IA"}
              </Btn>
            }
          >
            <textarea rows={4} className="w-full" value={quote.description} onChange={(e) => set({ description: e.target.value })} placeholder="Párrafo que abre la cotización formal." />
            {iaNotice && <p role="status" className="mt-1 text-xs text-cacao-3">{iaNotice}</p>}
            <Field label="Notas para el cliente" className="mt-3">
              <input value={quote.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Ej. mensaje en la torta, horario de retiro" />
            </Field>
          </Card>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <Card
            title="Precio"
            aside={<Toggle checked={quote.ivaEnabled} onChange={(ivaEnabled) => set({ ivaEnabled })} label={`IVA ${settings.ivaPct}%`} />}
          >
            {totals.cost.total === 0 ? (
              <Empty>Agrega un producto para ver los precios.</Empty>
            ) : (
              <>
                <TierCards tiers={totals.tiers} selected={quote.tier} onSelect={(tier) => set({ tier })} ivaEnabled={quote.ivaEnabled} />
                <dl className="mt-4 space-y-1.5 text-sm">
                  <Row label="Neto"><Money value={totals.selected.net} /></Row>
                  {quote.ivaEnabled && <Row label={`IVA ${settings.ivaPct}%`}><Money value={totals.selected.iva} /></Row>}
                  <Row label="Productos"><Money value={totals.selected.finalPrice} className="font-semibold" /></Row>
                  {totals.delivery > 0 && <Row label="Despacho"><Money value={totals.delivery} /></Row>}
                  <div className="flex justify-between border-t border-cacao/20 pt-2 text-base font-semibold">
                    <dt>Total</dt>
                    <dd><Money value={totals.total} className="text-xl" /></dd>
                  </div>
                  <Row label={`Abono ${settings.depositPct}%`}><Money value={totals.deposit} /></Row>
                  {totals.rentalGuarantee > 0 && <Row label="+ Garantía reembolsable"><Money value={totals.rentalGuarantee} /></Row>}
                </dl>
                <p className="mt-2 text-xs text-cacao-3">
                  Margen real tras redondeo: <span className="cifra">{pct(totals.selected.effectiveMarginPct)}</span>
                </p>
              </>
            )}
          </Card>

          {totals.cost.total > 0 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-salvia/40 bg-salvia-claro p-4">
                  <p className="rotulo !text-salvia">Tu sueldo por mano de obra</p>
                  <Money value={totals.laborSalary} className="mt-1 block text-xl font-semibold text-salvia" />
                </div>
                <div className={`rounded-xl border p-4 ${totals.companyUtility >= 0 ? "border-oro/50 bg-oro-claro/50" : "border-terracota/40 bg-terracota-claro"}`}>
                  <p className="rotulo !text-oro-osc">Utilidad neta de la empresa</p>
                  <Money value={totals.companyUtility} className="mt-1 block text-xl font-semibold text-oro-osc" />
                </div>
              </div>
              <Card title="Desglose de costo">
                <CostTable cost={totals.cost} />
              </Card>
              <Card title="Sellos">
                <div className="flex flex-wrap gap-1.5">
                  {totals.allergens.map((a) => <Seal key={a} tone="alerta">Contiene {ALLERGEN_LABEL[a]}</Seal>)}
                  {totals.dietLabels.map((d) => <Seal key={d} tone="ok">{DIET_LABEL[d]}</Seal>)}
                  {totals.allergens.length + totals.dietLabels.length === 0 && <p className="text-sm text-cacao-3">Sin alérgenos declarados.</p>}
                </div>
              </Card>
            </>
          )}
        </aside>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-cacao-2">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** Busca en bodega los insumos de estructura por nombre y calcula cuánto falta agregar al pedido. */
function structureExtras(advice: StructureAdvice, items: Item[], current: RecipeLine[]): { toAdd: RecipeLine[]; notFound: string[] } {
  const wanted: { label: string; pattern: RegExp; qty: number }[] = [
    { label: "disco intermedio", pattern: /disco.*(inter|cart)/i, qty: advice.intermediateBoards },
    { label: "pilares (dowels)", pattern: /dowel|pilar/i, qty: advice.dowels },
    { label: "caja alta", pattern: /caja.*alta/i, qty: advice.tallBox ? 1 : 0 },
  ];
  const toAdd: RecipeLine[] = [];
  const notFound: string[] = [];
  for (const w of wanted) {
    if (w.qty <= 0) continue;
    const item = items.find((i) => i.category === "packaging" && w.pattern.test(i.name));
    if (!item) {
      notFound.push(w.label);
      continue;
    }
    const have = current.find((e) => e.itemId === item.id)?.qty ?? 0;
    if (have < w.qty) toAdd.push({ itemId: item.id, qty: w.qty });
  }
  return { toAdd, notFound };
}

function LineCard({
  line,
  recipeName,
  baseMoldDesc,
  factor,
  lineCost,
  items,
  onChange,
  onRemove,
}: {
  line: QuoteLine;
  recipeName: string | undefined;
  baseMoldDesc: string;
  factor: number;
  lineCost: number;
  items: Item[];
  onChange: (patch: Partial<QuoteLine>) => void;
  onRemove: () => void;
}) {
  const [extraId, setExtraId] = useState("");
  const advice = structureAdvice(line.tiers);
  const extrasPool = items.filter((i) => i.category !== "ingredient" && !line.extras.some((e) => e.itemId === i.id));
  const structure = advice.required ? structureExtras(advice, items, line.extras) : { toAdd: [], notFound: [] };

  const applyStructure = () => {
    const merged = new Map(line.extras.map((e) => [e.itemId, e.qty]));
    structure.toAdd.forEach((e) => merged.set(e.itemId, e.qty));
    onChange({ extras: [...merged].map(([itemId, qty]) => ({ itemId, qty })) });
  };

  return (
    <Card
      title={line.title || recipeName || "Producto"}
      aside={
        <span className="flex items-center gap-3">
          <Money value={lineCost} className="text-sm text-cacao-3" />
          <button aria-label="Quitar producto" onClick={onRemove} className="p-1 text-cacao-3 hover:text-terracota"><Trash2 size={15} /></button>
        </span>
      }
    >
      {!recipeName && <p className="mb-3 text-sm text-terracota">La receta de este producto fue eliminada: no se puede costear.</p>}
      <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
        <Field label="Nombre en la cotización"><input value={line.title} onChange={(e) => onChange({ title: e.target.value })} /></Field>
        <Field label="Cantidad"><NumInput value={line.quantity} min={1} onChange={(quantity) => onChange({ quantity: Math.max(1, Math.round(quantity)) })} /></Field>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <p className="rotulo flex items-center gap-1.5"><Layers size={13} /> Pisos y moldes</p>
          <p className="text-xs text-cacao-3">
            Receta base {baseMoldDesc} · factor <span className="cifra font-semibold text-cacao">× {factor.toFixed(2)}</span> · alto total{" "}
            <span className="cifra">{totalHeightCm(line.tiers)} cm</span>
          </p>
        </div>
        <ol className="mt-2 space-y-2">
          {line.tiers.map((tier, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-crema-2/70 px-3 py-2">
              <span className="rotulo w-14">Piso {i + 1}</span>
              <MoldEditor mold={tier} onChange={(m) => onChange({ tiers: line.tiers.map((t, j) => (j === i ? m : t)) })} />
              {line.tiers.length > 1 && (
                <button aria-label={`Quitar piso ${i + 1}`} onClick={() => onChange({ tiers: line.tiers.filter((_, j) => j !== i) })} className="ml-auto p-1 text-cacao-3 hover:text-terracota">
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))}
        </ol>
        <Btn
          className="mt-2"
          onClick={() => {
            const last = line.tiers[line.tiers.length - 1]!;
            onChange({ tiers: [...line.tiers, { ...last, aCm: Math.max(10, last.aCm - 6), bCm: Math.max(10, last.bCm - 6) }] });
          }}
        >
          <Plus size={14} /> Agregar piso
        </Btn>
      </div>

      {advice.required && (
        <div className="mt-4 rounded-lg border border-terracota/40 bg-terracota-claro p-3 text-sm text-terracota">
          <p className="flex items-center gap-2 font-semibold"><TriangleAlert size={16} /> Requiere estructura interna: {advice.reasons.join(" y ")}</p>
          <p className="mt-1">
            Sugerido: {advice.intermediateBoards} disco(s) intermedio(s), {advice.dowels} pilares (dowels)
            {advice.centralDowel ? ", un pilar central pasante" : ""} y caja alta.
          </p>
          {structure.toAdd.length > 0 && (
            <Btn className="mt-2 !border-terracota/40 !text-terracota" onClick={applyStructure}>
              <Wand2 size={14} /> Agregar estructura al costo
            </Btn>
          )}
          {structure.notFound.length > 0 && (
            <p className="mt-1 text-xs">No encontré en Insumos: {structure.notFound.join(", ")}. Créalos como “Empaque y estructura” para costearlos.</p>
          )}
          {structure.toAdd.length === 0 && structure.notFound.length === 0 && <p className="mt-1 text-xs">La estructura sugerida ya está incluida en el costo.</p>}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Field label="Producción (min)"><NumInput value={line.productionMinutes} onChange={(n) => onChange({ productionMinutes: n })} /></Field>
        <Field label="Decoración (min)"><NumInput value={line.decorationMinutes} onChange={(n) => onChange({ decorationMinutes: n })} /></Field>
        <Field label="Horno (min)"><NumInput value={line.bakingMinutes} onChange={(n) => onChange({ bakingMinutes: n })} /></Field>
        <Field label="Frío (h)"><NumInput value={line.coolingHours} onChange={(n) => onChange({ coolingHours: n })} /></Field>
      </div>
      <p className="mt-1 text-xs text-cacao-3">Los tiempos no escalan solos con el molde: ajústalos a este pedido. Son por unidad.</p>

      <div className="mt-4">
        <p className="rotulo">Extras de este pedido (empaque, estructura, decoración)</p>
        {line.extras.length > 0 && (
          <ul className="mt-1.5 divide-y divide-crema-2">
            {line.extras.map((extra) => {
              const item = items.find((i) => i.id === extra.itemId);
              return (
                <li key={extra.itemId} className="flex items-center gap-3 py-1.5 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    {item?.name ?? <span className="text-terracota">Insumo eliminado</span>}
                    {item && <span className="ml-2 text-xs text-cacao-3">{CATEGORY_LABEL[item.category]}</span>}
                  </span>
                  <NumInput
                    value={extra.qty}
                    onChange={(qty) => onChange({ extras: line.extras.map((e) => (e.itemId === extra.itemId ? { ...e, qty } : e)) })}
                    className="!w-20"
                    aria-label={`Cantidad de ${item?.name ?? "extra"}`}
                  />
                  <span className="w-6 text-xs text-cacao-3">{item ? UNIT_LABEL[item.baseUnit] : ""}</span>
                  <button aria-label="Quitar extra" onClick={() => onChange({ extras: line.extras.filter((e) => e.itemId !== extra.itemId) })} className="p-1 text-cacao-3 hover:text-terracota">
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-2 flex gap-2">
          <select aria-label="Extra a agregar" value={extraId} onChange={(e) => setExtraId(e.target.value)} className="min-w-0 flex-1">
            <option value="">Agregar topper, flores, caja, pilares…</option>
            {extrasPool.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <Btn
            disabled={!extraId}
            onClick={() => {
              onChange({ extras: [...line.extras, { itemId: extraId, qty: 1 }] });
              setExtraId("");
            }}
          >
            <Plus size={14} />
          </Btn>
        </div>
      </div>
    </Card>
  );
}
