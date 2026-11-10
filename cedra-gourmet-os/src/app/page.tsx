"use client";

import { ArrowRight, ChefHat, ClipboardList, ShoppingBasket } from "lucide-react";
import Link from "next/link";
import { Card, Empty, Money, PageHeader, Seal } from "@/components/ui";
import { longDate } from "@/lib/domain/format";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/domain/labels";
import { quoteTotals } from "@/lib/domain/quote";
import { approvedInWeek, consolidate, toIso, weekStart } from "@/lib/domain/shopping";
import { useAppData } from "@/lib/store/store";

export default function InicioPage() {
  const data = useAppData();
  const today = toIso(new Date());
  const week = approvedInWeek(data.quotes, weekStart(today));
  const weekTotals = week.map((q) => quoteTotals(q, data));
  const sum = (pick: (t: (typeof weekTotals)[number]) => number) => weekTotals.reduce((s, t) => s + pick(t), 0);
  const toBuy = consolidate(week, data).filter((r) => r.toBuy > 0).length;
  const upcoming = data.quotes
    .filter((q) => q.eventDate >= today && q.status !== "rejected" && q.status !== "delivered")
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
    .slice(0, 6);
  const unpriced = data.items.filter((i) => i.purchasePriceClp === 0).length;

  return (
    <>
      <PageHeader eyebrow={longDate(today)} title={`Taller ${data.settings.brand.name}`} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Venta neta aprobada · esta semana" value={<Money value={sum((t) => t.selected.net)} />} />
        <Kpi label="Tu sueldo por mano de obra" value={<Money value={sum((t) => t.laborSalary)} />} tone="salvia" />
        <Kpi label="Utilidad neta de la empresa" value={<Money value={sum((t) => t.companyUtility)} />} tone="oro" />
        <Kpi label="Pedidos aprobados · esta semana" value={String(week.length)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card title="Próximas entregas" aside={<Link href="/cotizaciones" className="text-sm text-oro-osc hover:underline">Ver todas</Link>}>
          {upcoming.length === 0 ? (
            <Empty>Sin entregas próximas.</Empty>
          ) : (
            <ul className="divide-y divide-crema-2">
              {upcoming.map((q) => (
                <li key={q.id}>
                  <Link href={`/cotizaciones/${q.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:bg-crema-2/50">
                    <span className="cifra w-28 text-sm text-cacao-2">{longDate(q.eventDate)}</span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium">{q.client.name || "Sin cliente"}</span>
                      <span className="ml-2 text-xs text-cacao-3">{q.lines.map((l) => l.title).join(", ")}</span>
                    </span>
                    <Seal tone={STATUS_TONE[q.status]}>{STATUS_LABEL[q.status]}</Seal>
                    <Money value={quoteTotals(q, data).total} className="w-24 text-right" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-3">
          <Shortcut href="/cotizaciones" icon={<ClipboardList size={18} />} title="Cotizar un pedido" text="Moldes, pisos, despacho y precio en tres niveles." />
          <Shortcut href="/recetas" icon={<ChefHat size={18} />} title="Costear una receta" text="Al gramo, con merma, horno, frío y overhead." />
          <Shortcut
            href="/compras"
            icon={<ShoppingBasket size={18} />}
            title="Lista de compras"
            text={toBuy ? `${toBuy} insumo(s) no alcanzan para la semana.` : "El stock cubre los pedidos de la semana."}
          />
          {unpriced > 0 && (
            <Link href="/insumos" className="block rounded-xl border border-terracota/40 bg-terracota-claro p-4 text-sm text-terracota">
              {unpriced} insumo(s) sin precio: los costos que los usan están subestimados.
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

function Kpi({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "salvia" | "oro" }) {
  const tones = { salvia: "border-salvia/40 bg-salvia-claro", oro: "border-oro/50 bg-oro-claro/50" };
  return (
    <div className={`rounded-xl border p-4 ${tone ? tones[tone] : "border-crema-3 bg-white/70"}`}>
      <p className="rotulo">{label}</p>
      <p className="mt-1.5 text-2xl">{value}</p>
    </div>
  );
}

function Shortcut({ href, icon, title, text }: { href: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-xl border border-crema-3 bg-white/70 p-4 transition hover:border-oro/60">
      <span className="text-oro-osc">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-titulo text-lg leading-tight">{title}</span>
        <span className="block text-xs text-cacao-3">{text}</span>
      </span>
      <ArrowRight size={16} className="text-cacao-3 transition group-hover:translate-x-0.5 group-hover:text-cacao" />
    </Link>
  );
}
