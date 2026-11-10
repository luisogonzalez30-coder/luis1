"use client";

import { Check, ChevronLeft, ChevronRight, Printer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Btn, Card, Empty, Money, PageHeader, Seal } from "@/components/ui";
import { longDate, qty } from "@/lib/domain/format";
import { CATEGORY_LABEL } from "@/lib/domain/labels";
import { addDays, approvedInWeek, consolidate, toIso, weekStart, type ShoppingRow } from "@/lib/domain/shopping";
import { actions, useAppData } from "@/lib/store/store";

export default function ComprasPage() {
  const data = useAppData();
  const [week, setWeek] = useState(() => weekStart(toIso(new Date())));
  const quotes = approvedInWeek(data.quotes, week);
  const rows = consolidate(quotes, data);
  const pending = rows.filter((r) => r.toBuy > 0);
  const totalCost = pending.reduce((s, r) => s + r.estimatedCostClp, 0);

  const registerPurchase = (row: ShoppingRow) =>
    actions.saveItem({ ...row.item, stockQty: row.item.stockQty + row.packs * row.item.purchaseQty });

  return (
    <>
      <PageHeader eyebrow="Abastecimiento" title="Lista de compras">
        <Btn onClick={() => setWeek(addDays(week, -7))} aria-label="Semana anterior"><ChevronLeft size={15} /></Btn>
        <span className="cifra text-sm">{longDate(week)} — {longDate(addDays(week, 6))}</span>
        <Btn onClick={() => setWeek(addDays(week, 7))} aria-label="Semana siguiente"><ChevronRight size={15} /></Btn>
        <Btn onClick={() => window.print()}><Printer size={15} /> Imprimir</Btn>
      </PageHeader>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Pedidos aprobados de la semana" value={String(quotes.length)} />
        <Stat label="Insumos por comprar" value={`${pending.length} de ${rows.length}`} />
        <Stat label="Compra estimada" value={<Money value={totalCost} />} />
      </div>

      {quotes.length === 0 ? (
        <Empty>
          No hay cotizaciones aprobadas con entrega en esta semana. Marca una como “Aprobada” en{" "}
          <Link href="/cotizaciones" className="underline">Cotizaciones</Link>.
        </Empty>
      ) : (
        <Card
          title="Consolidado contra stock"
          aside={<span className="text-xs text-cacao-3">Pedidos {quotes.map((q) => `#${q.number}`).join(", ")}</span>}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="rotulo border-b border-crema-3 text-left">
                  <th className="py-2 font-semibold">Insumo</th>
                  <th className="py-2 text-right font-semibold">Necesario</th>
                  <th className="py-2 text-right font-semibold">Stock</th>
                  <th className="py-2 text-right font-semibold">Falta</th>
                  <th className="py-2 text-right font-semibold">Comprar</th>
                  <th className="py-2 text-right font-semibold">Costo</th>
                  <th className="no-print w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.item.id} className="border-b border-crema-2 last:border-0">
                    <td className="py-2 pr-3">
                      <span className="font-medium">{row.item.name}</span>
                      <span className="ml-2 text-xs text-cacao-3">{CATEGORY_LABEL[row.item.category]}</span>
                    </td>
                    <td className="cifra py-2 text-right">{qty(row.needed, row.item.baseUnit)}</td>
                    <td className="cifra py-2 text-right text-cacao-3">{qty(row.stock, row.item.baseUnit)}</td>
                    <td className="cifra py-2 text-right">
                      {row.toBuy > 0 ? <span className="font-semibold text-terracota">{qty(row.toBuy, row.item.baseUnit)}</span> : <Seal tone="ok">Alcanza</Seal>}
                    </td>
                    <td className="cifra py-2 text-right">
                      {row.packs > 0 ? `${row.packs} × ${qty(row.item.purchaseQty, row.item.baseUnit)}` : "—"}
                    </td>
                    <td className="py-2 text-right">{row.toBuy > 0 ? <Money value={row.estimatedCostClp} /> : "—"}</td>
                    <td className="no-print py-2 text-right">
                      {row.packs > 0 && (
                        <button title="Registrar compra: suma los formatos al stock" aria-label={`Registrar compra de ${row.item.name}`} onClick={() => registerPurchase(row)} className="rounded p-1.5 text-cacao-3 hover:text-salvia">
                          <Check size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-cacao-3">
            “Necesario” ya incluye la merma de los comestibles. El stock no se descuenta solo al producir: actualízalo en Insumos tras cada jornada.
          </p>
        </Card>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-crema-3 bg-white/70 p-4">
      <p className="rotulo">{label}</p>
      <p className="cifra mt-1 text-2xl">{value}</p>
    </div>
  );
}
