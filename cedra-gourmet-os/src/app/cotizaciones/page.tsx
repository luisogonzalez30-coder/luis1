"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Btn, Card, Empty, Money, PageHeader, Seal } from "@/components/ui";
import { longDate } from "@/lib/domain/format";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/domain/labels";
import { quoteTotals } from "@/lib/domain/quote";
import { toIso } from "@/lib/domain/shopping";
import type { Quote } from "@/lib/domain/types";
import { uid } from "@/lib/store/seed";
import { actions, nextQuoteNumber, useAppData } from "@/lib/store/store";

export default function CotizacionesPage() {
  const data = useAppData();
  const router = useRouter();

  const create = () => {
    const today = toIso(new Date());
    const quote: Quote = {
      id: uid(),
      number: nextQuoteNumber(data.quotes),
      createdAt: today,
      eventDate: today,
      client: { name: "", phone: "", email: "" },
      status: "draft",
      lines: [],
      tier: "gourmet",
      ivaEnabled: data.settings.ivaEnabledByDefault,
      delivery: { mode: "none", km: 0, roundTrip: true, fixedClp: data.settings.deliveryFixedClp, address: "" },
      rental: { enabled: false, description: "", material: "cristal", depositClp: 0, returnDays: 3 },
      description: "",
      notes: "",
    };
    actions.saveQuote(quote);
    router.push(`/cotizaciones/${quote.id}`);
  };

  const quotes = [...data.quotes].sort((a, b) => b.number - a.number);

  return (
    <>
      <PageHeader eyebrow="Ventas" title="Cotizaciones">
        <Btn variant="primary" onClick={create}><Plus size={15} /> Nueva cotización</Btn>
      </PageHeader>
      {quotes.length === 0 ? (
        <Empty>Aún no hay cotizaciones.</Empty>
      ) : (
        <Card>
          <ul className="divide-y divide-crema-2">
            {quotes.map((q) => {
              const t = quoteTotals(q, data);
              return (
                <li key={q.id}>
                  <Link href={`/cotizaciones/${q.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 transition hover:bg-crema-2/50">
                    <span className="cifra w-14 text-cacao-3">#{String(q.number).padStart(4, "0")}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{q.client.name || "Sin cliente"}</span>
                      <span className="block truncate text-xs text-cacao-3">
                        {longDate(q.eventDate)} · {q.lines.map((l) => l.title).join(", ") || "Sin productos"}
                      </span>
                    </span>
                    <Seal tone={STATUS_TONE[q.status]}>{STATUS_LABEL[q.status]}</Seal>
                    <Money value={t.total} className="w-28 text-right font-semibold" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
