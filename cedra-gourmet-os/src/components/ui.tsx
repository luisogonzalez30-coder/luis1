"use client";

import { useEffect, useState } from "react";
import { money } from "@/lib/domain/format";

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="mb-7">
      <p className="rotulo text-oro-osc">{eyebrow}</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl md:text-4xl">{title}</h1>
        <div className="no-print flex flex-wrap items-center gap-2">{children}</div>
      </div>
      <div className="filete mt-4" />
    </header>
  );
}

export function Card({ title, aside, className = "", children }: { title?: string; aside?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={`rounded-xl border border-crema-3 bg-white/70 p-4 shadow-ficha md:p-5 ${className}`}>
      {(title || aside) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-lg">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, hint, className = "", children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <span className="rotulo">{label}</span>
      {children}
      {hint && <span className="text-xs text-cacao-3">{hint}</span>}
    </label>
  );
}

type BtnVariant = "primary" | "ghost" | "danger";
const BTN: Record<BtnVariant, string> = {
  primary: "bg-cacao text-crema hover:bg-cacao-2",
  ghost: "border border-crema-3 bg-white/60 text-cacao-2 hover:border-oro hover:text-cacao",
  danger: "border border-terracota/30 text-terracota hover:bg-terracota-claro",
};

export function Btn({
  variant = "ghost",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${BTN[variant]} ${className}`}
    />
  );
}

export const linkBtn = (variant: BtnVariant = "ghost") =>
  `inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${BTN[variant]}`;

/** Input numérico que tolera estados intermedios ("", "0,", "1.") sin pelear con el valor controlado. */
export function NumInput({
  value,
  onChange,
  min = 0,
  step,
  className = "",
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number;
  onChange: (n: number) => void;
  min?: number;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    setText((prev) => (parse(prev) === value ? prev : String(value)));
  }, [value]);

  return (
    <input
      {...rest}
      inputMode="decimal"
      step={step}
      value={text}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d.,-]/g, "");
        setText(raw);
        const n = parse(raw);
        if (Number.isFinite(n)) onChange(Math.max(min, n));
      }}
      onBlur={() => setText(String(value))}
      className={`cifra w-full text-right ${className}`}
    />
  );
}

const parse = (s: string): number => (s.trim() === "" ? 0 : Number(s.replace(",", ".")));

export function Money({ value, className = "" }: { value: number; className?: string }) {
  return <span className={`cifra whitespace-nowrap ${className}`}>{money(value)}</span>;
}

export function Seal({ tone, children }: { tone: "alerta" | "ok" | "neutro" | "oro"; children: React.ReactNode }) {
  const tones = {
    alerta: "border-terracota/40 bg-terracota-claro text-terracota",
    ok: "border-salvia/40 bg-salvia-claro text-salvia",
    neutro: "border-crema-3 bg-crema-2 text-cacao-2",
    oro: "border-oro/50 bg-oro-claro/60 text-oro-osc",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-sm text-cacao-2"
    >
      <span className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-oro" : "bg-crema-3"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </span>
      {label}
    </button>
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: readonly T[];
  value: T[];
  onChange: (v: T[]) => void;
  labels: Record<T, string>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== o) : [...value, o])}
            className={`rounded-full border px-2.5 py-1 text-xs transition ${
              on ? "border-cacao bg-cacao text-crema" : "border-crema-3 bg-white text-cacao-2 hover:border-oro"
            }`}
          >
            {labels[o]}
          </button>
        );
      })}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-crema-3 px-4 py-8 text-center text-sm text-cacao-3">{children}</p>;
}
