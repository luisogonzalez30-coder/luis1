"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface ResumenCumplimiento {
  periodo: string;
  porcentajeCumplimiento: number;
  seccionesObligatorias: number;
  seccionesEvaluadas: number;
  seccionesConInfraccion: number;
  enlacesCaidos: number;
  solicitudesPorVencer: number;
  solicitudesVencidas: number;
  tendencia: { periodo: string; porcentaje: number }[];
}

export default function DashboardPage() {
  const [resumen, setResumen] = useState<ResumenCumplimiento | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<ResumenCumplimiento>("/cumplimiento/resumen")
      .then(setResumen)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-sm text-estado-mal">{error}</p>;
  if (!resumen) return <p className="text-sm text-slate-500">Cargando…</p>;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">Cumplimiento de Transparencia Activa — {resumen.periodo}</p>
        <div className="mt-2 flex items-end gap-3">
          <span className="text-5xl font-semibold tabular-nums text-slate-900">
            {resumen.porcentajeCumplimiento}%
          </span>
          <div className="mb-1 h-2 flex-1 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-marca-600"
              style={{ width: `${Math.min(100, resumen.porcentajeCumplimiento)}%` }}
            />
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          {resumen.seccionesEvaluadas} de {resumen.seccionesObligatorias} secciones obligatorias evaluadas.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Tarjeta
          href="/revisiones"
          titulo="Infracciones abiertas"
          valor={resumen.seccionesConInfraccion}
          tono={resumen.seccionesConInfraccion > 0 ? "mal" : "bien"}
          descripcion="Secciones que no cumplen o están desactualizadas"
        />
        <Tarjeta
          href="/enlaces"
          titulo="Enlaces caídos"
          valor={resumen.enlacesCaidos}
          tono={resumen.enlacesCaidos > 0 ? "mal" : "bien"}
          descripcion="Detectados en la última verificación"
        />
        <Tarjeta
          href="/solicitudes"
          titulo="Solicitudes por vencer / vencidas"
          valor={`${resumen.solicitudesPorVencer} / ${resumen.solicitudesVencidas}`}
          tono={resumen.solicitudesVencidas > 0 ? "mal" : resumen.solicitudesPorVencer > 0 ? "alerta" : "bien"}
          descripcion="Plazo legal de 20 días hábiles (Ley 20.285)"
        />
      </section>
    </div>
  );
}

function Tarjeta({
  href,
  titulo,
  valor,
  tono,
  descripcion,
}: {
  href: string;
  titulo: string;
  valor: number | string;
  tono: "bien" | "alerta" | "mal";
  descripcion: string;
}) {
  const colorTono = { bien: "text-estado-bien", alerta: "text-estado-alerta", mal: "text-estado-mal" }[tono];
  return (
    <Link
      href={href}
      className="block rounded-xl border border-slate-200 bg-white p-5 transition hover:border-marca-300 hover:shadow-sm"
    >
      <p className="text-sm font-medium text-slate-500">{titulo}</p>
      <p className={`mt-1 text-3xl font-semibold tabular-nums ${colorTono}`}>{valor}</p>
      <p className="mt-1 text-xs text-slate-400">{descripcion}</p>
    </Link>
  );
}
