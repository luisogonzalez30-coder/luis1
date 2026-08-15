"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError, obtenerUsuario } from "@/lib/api";

interface Revision {
  id: string;
  estado: "cumple" | "no_cumple" | "desactualizada" | "resuelta_pendiente_verificacion";
  detalle: string | null;
  revisadoEn: string;
  seccion: { nombre: string; codigoLey: string };
}

const ETIQUETA_ESTADO: Record<Revision["estado"], { texto: string; clase: string }> = {
  cumple: { texto: "Cumple", clase: "bg-estado-bien/10 text-estado-bien" },
  no_cumple: { texto: "No cumple", clase: "bg-estado-mal/10 text-estado-mal" },
  desactualizada: { texto: "Desactualizada", clase: "bg-estado-alerta/10 text-estado-alerta" },
  resuelta_pendiente_verificacion: { texto: "Resuelta (pendiente verificación)", clase: "bg-marca-100 text-marca-700" },
};

// Debe reflejar exactamente los roles que RevisionesController.resolver()
// acepta en la API (@RequireRoles) — si se desalinean, el botón queda
// visible para un rol que el backend igual va a rechazar con 403.
const ROLES_PUEDEN_RESOLVER = new Set(["encargado_transparencia", "admin_municipal"]);

export default function RevisionesPage() {
  const [revisiones, setRevisiones] = useState<Revision[] | null>(null);
  const [resolviendo, setResolviendo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const puedeResolver = ROLES_PUEDEN_RESOLVER.has(obtenerUsuario()?.rol ?? "");

  function cargar() {
    apiFetch<Revision[]>("/revisiones").then(setRevisiones);
  }

  useEffect(cargar, []);

  async function resolver(id: string) {
    const evidenciaUrl = window.prompt("URL de la evidencia de corrección (captura, PDF, etc.):");
    if (!evidenciaUrl) return;
    setError(null);
    setResolviendo(id);
    try {
      await apiFetch(`/revisiones/${id}/resolver`, {
        method: "POST",
        body: JSON.stringify({ evidenciaUrl }),
      });
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo marcar la revisión como resuelta");
    } finally {
      setResolviendo(null);
    }
  }

  if (!revisiones) return <p className="text-sm text-slate-500">Cargando…</p>;

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="rounded-md bg-estado-mal/10 px-3 py-2 text-sm text-estado-mal">
          {error}
        </p>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Sección</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Última revisión</th>
              <th className="px-4 py-3">Detalle</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {revisiones.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{r.seccion.nombre}</p>
                  <p className="text-xs text-slate-400">{r.seccion.codigoLey}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${ETIQUETA_ESTADO[r.estado].clase}`}>
                    {ETIQUETA_ESTADO[r.estado].texto}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">{new Date(r.revisadoEn).toLocaleDateString("es-CL")}</td>
                <td className="px-4 py-3 text-slate-500">{r.detalle ?? "—"}</td>
                <td className="px-4 py-3">
                  {puedeResolver && (r.estado === "no_cumple" || r.estado === "desactualizada") && (
                    <button
                      onClick={() => resolver(r.id)}
                      disabled={resolviendo === r.id}
                      className="rounded-md border border-marca-300 px-3 py-1 text-xs font-medium text-marca-700 hover:bg-marca-50 disabled:opacity-50"
                    >
                      {resolviendo === r.id ? "Guardando…" : "Marcar resuelta"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {revisiones.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Sin revisiones registradas todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
