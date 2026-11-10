"use client";

import { Download, RotateCcw, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Btn, Card, Field, NumInput, PageHeader, Toggle } from "@/components/ui";
import { supabaseConfigured } from "@/lib/db/supabase";
import { toIso } from "@/lib/domain/shopping";
import type { Settings } from "@/lib/domain/types";
import { DEFAULT_LEGAL_CLAUSE } from "@/lib/store/seed";
import { actions, store, useAppData } from "@/lib/store/store";

const MAX_LOGO_BYTES = 300_000;

export default function AjustesPage() {
  const { settings } = useAppData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");

  const set = (patch: Partial<Settings>) => actions.saveSettings({ ...settings, ...patch });
  const setBrand = (patch: Partial<Settings["brand"]>) => set({ brand: { ...settings.brand, ...patch } });

  const onLogo = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      setMessage("El logo pesa más de 300 KB. Usa una versión más liviana para no llenar el almacenamiento del navegador.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setBrand({ logoDataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(store.getSnapshot(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cedra-respaldo-${toIso(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importJson = async (file: File | undefined) => {
    if (!file) return;
    try {
      const raw: unknown = JSON.parse(await file.text());
      if (!window.confirm("Importar reemplaza todos los datos actuales por los del archivo. ¿Continuar?")) return;
      actions.importJson(raw);
      setMessage("Respaldo importado.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "No se pudo leer el archivo.");
    }
  };

  return (
    <>
      <PageHeader eyebrow="Configuración" title="Ajustes" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Marca (white-label)">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre comercial"><input value={settings.brand.name} onChange={(e) => setBrand({ name: e.target.value })} /></Field>
            <Field label="Bajada"><input value={settings.brand.tagline} onChange={(e) => setBrand({ tagline: e.target.value })} /></Field>
            <Field label="RUT"><input value={settings.brand.rut} onChange={(e) => setBrand({ rut: e.target.value })} placeholder="76.123.456-7" /></Field>
            <Field label="Teléfono / WhatsApp"><input value={settings.brand.phone} onChange={(e) => setBrand({ phone: e.target.value })} /></Field>
            <Field label="Correo"><input type="email" value={settings.brand.email} onChange={(e) => setBrand({ email: e.target.value })} /></Field>
            <Field label="Instagram"><input value={settings.brand.instagram} onChange={(e) => setBrand({ instagram: e.target.value })} placeholder="@tumarca" /></Field>
            <Field label="Dirección" className="sm:col-span-2"><input value={settings.brand.address} onChange={(e) => setBrand({ address: e.target.value })} /></Field>
            <Field label="Logo" hint="PNG, JPG o SVG, hasta 300 KB. Aparece en el menú y en cada cotización." className="sm:col-span-2">
              <div className="flex items-center gap-3">
                {settings.brand.logoDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={settings.brand.logoDataUrl} alt="Logo actual" className="h-12 w-12 rounded-full border border-crema-3 object-cover" />
                )}
                <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={(e) => onLogo(e.target.files?.[0])} className="min-w-0 flex-1" />
                {settings.brand.logoDataUrl && <Btn variant="danger" onClick={() => setBrand({ logoDataUrl: "" })}>Quitar</Btn>}
              </div>
            </Field>
          </div>
        </Card>

        <Card title="Mano de obra y costos invisibles">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Hora de producción base ($)" hint="Horneado, batido, relleno.">
              <NumInput value={settings.laborProductionClpHour} onChange={(n) => set({ laborProductionClpHour: n })} />
            </Field>
            <Field label="Hora de decoración artística ($)" hint="Alisado, figuras, flores, aerógrafo.">
              <NumInput value={settings.laborDecorationClpHour} onChange={(n) => set({ laborDecorationClpHour: n })} />
            </Field>
            <Field label="Horno / energía por hora ($)">
              <NumInput value={settings.ovenCostPerHourClp} onChange={(n) => set({ ovenCostPerHourClp: n })} />
            </Field>
            <Field label="Gastos fijos (overhead %)" hint="Sobre la operación base: materiales, mano de obra, energía y frío.">
              <NumInput value={settings.overheadPct} onChange={(n) => set({ overheadPct: n })} />
            </Field>
            <Field label="Refrigeración / reposo">
              <select value={settings.coolingMode} onChange={(e) => set({ coolingMode: e.target.value as Settings["coolingMode"] })}>
                <option value="fixed">Monto fijo por torta</option>
                <option value="hourly">Por hora de frío</option>
              </select>
            </Field>
            {settings.coolingMode === "fixed" ? (
              <Field label="Monto fijo de frío ($)"><NumInput value={settings.coolingFixedClp} onChange={(n) => set({ coolingFixedClp: n })} /></Field>
            ) : (
              <Field label="Hora de frío ($)"><NumInput value={settings.coolingPerHourClp} onChange={(n) => set({ coolingPerHourClp: n })} /></Field>
            )}
          </div>
        </Card>

        <Card title="Precio">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Margen Gourmet Recomendado (%)" hint="Competitivo (30%) y Boutique de Autor (55%) son fijos.">
              <NumInput value={settings.marginGourmetPct} onChange={(n) => set({ marginGourmetPct: Math.min(95, n) })} />
            </Field>
            <Field label="IVA (%)"><NumInput value={settings.ivaPct} onChange={(n) => set({ ivaPct: n })} /></Field>
            <Field label="Abono para reservar (%)"><NumInput value={settings.depositPct} onChange={(n) => set({ depositPct: Math.min(100, n) })} /></Field>
            <Field label="Validez de la cotización (días)"><NumInput value={settings.quoteValidityDays} onChange={(n) => set({ quoteValidityDays: n })} /></Field>
            <div className="flex flex-col gap-2.5 sm:col-span-2">
              <Toggle checked={settings.ivaEnabledByDefault} onChange={(v) => set({ ivaEnabledByDefault: v })} label="Las cotizaciones nuevas parten con IVA incluido" />
              <Toggle checked={settings.commercialRounding} onChange={(v) => set({ commercialRounding: v })} label="Redondeo comercial: precios terminados en $500 o $900" />
            </div>
          </div>
        </Card>

        <Card title="Despacho propio">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Por kilómetro ($)"><NumInput value={settings.deliveryPerKmClp} onChange={(n) => set({ deliveryPerKmClp: n })} /></Field>
            <Field label="Cobro mínimo ($)"><NumInput value={settings.deliveryMinClp} onChange={(n) => set({ deliveryMinClp: n })} /></Field>
            <Field label="Tarifa fija sugerida ($)"><NumInput value={settings.deliveryFixedClp} onChange={(n) => set({ deliveryFixedClp: n })} /></Field>
          </div>
        </Card>

        <Card
          title="Cláusula de transporte y cadena de frío"
          aside={<Btn onClick={() => set({ legalClause: DEFAULT_LEGAL_CLAUSE })}><RotateCcw size={14} /> Restaurar</Btn>}
          className="xl:col-span-2"
        >
          <textarea rows={5} className="w-full" value={settings.legalClause} onChange={(e) => set({ legalClause: e.target.value })} />
          <p className="mt-2 text-xs text-cacao-3">Se imprime en todas las cotizaciones. Es un texto base: conviene que lo revise tu asesor legal.</p>
        </Card>

        <Card title="Datos y respaldo" className="xl:col-span-2">
          <p className="text-sm text-cacao-2">
            Todo se guarda al instante en este navegador. Exporta un respaldo con regularidad: si se borran los datos del navegador, el archivo JSON es la única copia.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn variant="primary" onClick={exportJson}><Download size={15} /> Exportar JSON</Btn>
            <Btn onClick={() => fileRef.current?.click()}><Upload size={15} /> Importar JSON</Btn>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => { void importJson(e.target.files?.[0]); e.target.value = ""; }} />
            <Btn
              variant="danger"
              onClick={() => window.confirm("Se borran tus datos y vuelven los de ejemplo. ¿Continuar?") && actions.resetToSeed()}
            >
              Volver a los datos de ejemplo
            </Btn>
          </div>
          {message && <p role="status" className="mt-3 text-sm text-terracota">{message}</p>}
          <p className="mt-3 text-xs text-cacao-3">
            Nube: {supabaseConfigured() ? "variables de Supabase detectadas; la sincronización aún no está activada en esta versión." : "sin configurar. La app funciona completa en modo local."}
          </p>
        </Card>
      </div>
    </>
  );
}
