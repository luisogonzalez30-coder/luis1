"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Btn, Empty, Money, Seal } from "@/components/ui";
import { longDate } from "@/lib/domain/format";
import { ALLERGEN_LABEL, DIET_LABEL, MATERIAL_LABEL } from "@/lib/domain/labels";
import { describeMold, structureAdvice } from "@/lib/domain/molds";
import { TIER_LABEL } from "@/lib/domain/pricing";
import { quoteTotals } from "@/lib/domain/quote";
import { addDays } from "@/lib/domain/shopping";
import { useAppData } from "@/lib/store/store";

/** Cotización formal: se ve en pantalla y se guarda como PDF con Imprimir → "Guardar como PDF". */
export default function DocumentoPage() {
  const { id } = useParams<{ id: string }>();
  const data = useAppData();
  const { settings } = data;
  const { brand } = settings;
  const quote = data.quotes.find((q) => q.id === id);
  if (!quote) return <Empty>Esta cotización no existe.</Empty>;

  const t = quoteTotals(quote, data);
  const number = String(quote.number).padStart(4, "0");
  const contact = [brand.phone, brand.email, brand.instagram, brand.address].filter(Boolean);
  const hasStructure = quote.lines.some((l) => structureAdvice(l.tiers).required);

  return (
    <>
      <div className="no-print mx-auto mb-4 flex max-w-3xl items-center justify-between">
        <Link href={`/cotizaciones/${quote.id}`} className="inline-flex items-center gap-1 text-sm text-cacao-3 hover:text-cacao">
          <ArrowLeft size={14} /> Volver a editar
        </Link>
        <Btn variant="primary" onClick={() => window.print()}><Printer size={15} /> Imprimir / Guardar PDF</Btn>
      </div>

      <article className="hoja mx-auto max-w-3xl rounded-xl border border-crema-3 bg-white p-7 shadow-ficha md:p-12">
        <header className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            {brand.logoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logoDataUrl} alt={`Logo de ${brand.name}`} className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <span className="grid h-20 w-20 place-items-center rounded-full bg-cacao font-titulo text-4xl text-oro-claro">{brand.name.charAt(0)}</span>
            )}
            <div>
              <p className="font-titulo text-3xl leading-none">{brand.name}</p>
              {brand.tagline && <p className="rotulo mt-1.5 text-oro-osc">{brand.tagline}</p>}
              {brand.rut && <p className="cifra mt-1 text-xs text-cacao-3">RUT {brand.rut}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="rotulo">Cotización</p>
            <p className="cifra text-2xl">N.º {number}</p>
            <p className="mt-1 text-xs text-cacao-3">Emitida el {longDate(quote.createdAt)}</p>
            <p className="text-xs text-cacao-3">Válida hasta el {longDate(addDays(quote.createdAt, settings.quoteValidityDays))}</p>
          </div>
        </header>
        <div className="filete my-6" />

        <section className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="rotulo">Preparada para</p>
            <p className="mt-1 font-titulo text-xl">{quote.client.name || "—"}</p>
            <p className="text-cacao-2">{[quote.client.phone, quote.client.email].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="sm:text-right">
            <p className="rotulo">Fecha de entrega</p>
            <p className="mt-1 font-titulo text-xl">{longDate(quote.eventDate)}</p>
            <p className="text-cacao-2">{quote.delivery.mode === "none" ? "Retiro en taller" : `Despacho a ${quote.delivery.address || "dirección por confirmar"}`}</p>
          </div>
        </section>

        {quote.description && <p className="mt-6 text-[15px] leading-relaxed text-cacao-2">{quote.description}</p>}

        <table className="mt-7 w-full text-sm">
          <thead>
            <tr className="rotulo border-b-2 border-cacao text-left">
              <th className="py-2 font-semibold">Detalle</th>
              <th className="w-16 py-2 text-right font-semibold">Cant.</th>
            </tr>
          </thead>
          <tbody>
            {t.lines.map(({ line }) => (
              <tr key={line.id} className="evitar-corte border-b border-crema-3 align-top">
                <td className="py-3 pr-4">
                  <p className="font-titulo text-lg leading-snug">{line.title}</p>
                  <p className="mt-0.5 text-xs text-cacao-3">
                    {line.tiers.length > 1 ? `${line.tiers.length} pisos: ` : ""}
                    {line.tiers.map(describeMold).join(" / ")}
                  </p>
                </td>
                <td className="cifra py-3 text-right">{line.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {(t.allergens.length > 0 || t.dietLabels.length > 0) && (
          <div className="evitar-corte mt-4 flex flex-wrap items-center gap-1.5">
            <span className="rotulo mr-1">Alérgenos</span>
            {t.allergens.map((a) => <Seal key={a} tone="alerta">Contiene {ALLERGEN_LABEL[a]}</Seal>)}
            {t.dietLabels.map((d) => <Seal key={d} tone="ok">{DIET_LABEL[d]}</Seal>)}
          </div>
        )}

        <section className="evitar-corte mt-7 ml-auto max-w-sm text-sm">
          <dl className="space-y-1.5">
            <Line label={`Productos · ${TIER_LABEL[quote.tier]}`}><Money value={quote.ivaEnabled ? t.selected.net : t.selected.finalPrice} /></Line>
            {quote.ivaEnabled && <Line label={`IVA ${settings.ivaPct}%`}><Money value={t.selected.iva} /></Line>}
            {t.delivery > 0 && (
              <Line label={quote.delivery.mode === "km" ? `Despacho propio (${quote.delivery.km} km${quote.delivery.roundTrip ? ", ida y vuelta" : ""})` : "Despacho propio (tarifa fija)"}>
                <Money value={t.delivery} />
              </Line>
            )}
            <div className="flex justify-between border-t-2 border-cacao pt-2.5">
              <dt className="font-titulo text-xl">Total</dt>
              <dd><Money value={t.total} className="text-2xl font-semibold" /></dd>
            </div>
            <Line label={`Abono para reservar (${settings.depositPct}%)`}><Money value={t.deposit} /></Line>
            <Line label="Saldo contra entrega"><Money value={t.total - t.deposit} /></Line>
          </dl>
          {!quote.ivaEnabled && <p className="mt-1 text-right text-xs text-cacao-3">Valores netos, sin IVA.</p>}
        </section>

        {t.rentalGuarantee > 0 && (
          <section className="evitar-corte mt-6 rounded-lg border border-oro/50 bg-oro-claro/40 p-4 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-titulo text-lg">Garantía reembolsable por arriendo</p>
              <Money value={t.rentalGuarantee} className="text-lg font-semibold" />
            </div>
            <p className="mt-1 text-cacao-2">
              {quote.rental.description || "Base / pedestal"} ({MATERIAL_LABEL[quote.rental.material].toLowerCase()}). Se paga junto con el saldo y se devuelve íntegra al
              retornar la pieza limpia y sin daños dentro de {quote.rental.returnDays} día(s) corridos desde la entrega. No forma parte del precio ni está afecta a IVA.
            </p>
            <p className="cifra mt-2 text-right text-cacao-2">Total a pagar con garantía: <span className="font-semibold text-cacao">$ {t.totalToPay.toLocaleString("es-CL")}</span></p>
          </section>
        )}

        {quote.notes && (
          <section className="mt-6 text-sm">
            <p className="rotulo">Notas</p>
            <p className="mt-1 text-cacao-2">{quote.notes}</p>
          </section>
        )}

        <section className="evitar-corte mt-7 border-t border-crema-3 pt-4">
          <p className="rotulo">Condiciones de transporte y cadena de frío</p>
          <p className="mt-1.5 text-xs leading-relaxed text-cacao-2">{settings.legalClause}</p>
          {hasStructure && (
            <p className="mt-1.5 text-xs leading-relaxed text-cacao-2">
              Este pedido lleva estructura interna (discos y pilares no comestibles) por su altura o número de pisos.
            </p>
          )}
        </section>

        <footer className="mt-8 text-center text-xs text-cacao-3">
          <div className="filete mx-auto mb-3 w-24 rotate-180" />
          {contact.join("  ·  ") || brand.name}
        </footer>
      </article>
    </>
  );
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-cacao-2">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
