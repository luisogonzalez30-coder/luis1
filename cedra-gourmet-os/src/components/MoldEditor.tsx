"use client";

import type { Mold, MoldShape } from "@/lib/domain/types";
import { NumInput } from "./ui";

const SHAPES: { value: MoldShape; label: string }[] = [
  { value: "round", label: "Redondo" },
  { value: "square", label: "Cuadrado" },
  { value: "rect", label: "Rectangular" },
];

export function MoldEditor({ mold, onChange }: { mold: Mold; onChange: (m: Mold) => void }) {
  const set = (patch: Partial<Mold>) => onChange({ ...mold, ...patch });
  const aLabel = mold.shape === "round" ? "Ø cm" : mold.shape === "square" ? "Lado cm" : "Ancho cm";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select aria-label="Forma del molde" value={mold.shape} onChange={(e) => set({ shape: e.target.value as MoldShape })}>
        {SHAPES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <Dim label={aLabel} value={mold.aCm} onChange={(aCm) => set({ aCm })} />
      {mold.shape === "rect" && <Dim label="Largo cm" value={mold.bCm} onChange={(bCm) => set({ bCm })} />}
      <Dim label="Alto cm" value={mold.heightCm} onChange={(heightCm) => set({ heightCm })} />
    </div>
  );
}

function Dim({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-cacao-3">
      {label}
      <NumInput value={value} onChange={onChange} className="!w-16" aria-label={label} />
    </label>
  );
}
