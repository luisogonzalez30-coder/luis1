"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { WorkshopSheet, type WorkshopBlock } from "@/components/WorkshopSheet";
import { Empty } from "@/components/ui";
import { longDate } from "@/lib/domain/format";
import { resolveLines } from "@/lib/domain/quote";
import { useAppData } from "@/lib/store/store";

export default function CotizacionTallerPage() {
  const { id } = useParams<{ id: string }>();
  const data = useAppData();
  const quote = data.quotes.find((q) => q.id === id);
  if (!quote) return <Empty>Esta cotización no existe.</Empty>;
  const blocks: WorkshopBlock[] = resolveLines(quote, data).flatMap(({ line, recipe, result }) =>
    recipe && result ? [{ line, recipe, result }] : [],
  );
  return (
    <>
      <Link href={`/cotizaciones/${quote.id}`} className="no-print mb-4 inline-flex items-center gap-1 text-sm text-cacao-3 hover:text-cacao">
        <ArrowLeft size={14} /> Volver a la cotización
      </Link>
      <WorkshopSheet
        heading={`Pedido N.º ${String(quote.number).padStart(4, "0")}`}
        sub={`Entrega: ${longDate(quote.eventDate)}${quote.client.name ? ` · ${quote.client.name}` : ""}`}
        blocks={blocks}
      />
    </>
  );
}
