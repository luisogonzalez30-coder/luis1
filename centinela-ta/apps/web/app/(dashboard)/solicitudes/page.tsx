"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch, ApiError, obtenerUsuario } from "@/lib/api";

interface Solicitud {
  id: string;
  folio: string;
  solicitanteNombre: string;
  fechaIngreso: string;
  fechaLimite: string;
  diasHabilesRestantes: number;
  estado: "en_plazo" | "por_vencer" | "vencida" | "respondida";
}

const ETIQUETA_ESTADO: Record<Solicitud["estado"], { texto: string; clase: string }> = {
  en_plazo: { texto: "En plazo", clase: "bg-estado-bien/10 text-estado-bien" },
  por_vencer: { texto: "Por vencer", clase: "bg-estado-alerta/10 text-estado-alerta" },
  vencida: { texto: "Vencida", clase: "bg-estado-mal/10 text-estado-mal" },
  respondida: { texto: "Respondida", clase: "bg-marca-100 text-marca-700" },
};

// Debe reflejar exactamente los roles que SolicitudesController acepta para
// crear/responder (@RequireRoles(Rol.encargado_transparencia)) — igual que
// en revisiones/page.tsx, evita mostrar una acción que el backend igual va
// a rechazar con 403.
const ROLES_PUEDEN_GESTIONAR = new Set(["encargado_transparencia"]);

export default function SolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[] | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const puedeGestionar = ROLES_PUEDEN_GESTIONAR.has(obtenerUsuario()?.rol ?? "");

  function cargar() {
    apiFetch<Solicitud[]>("/solicitudes").then(setSolicitudes);
  }

  useEffect(cargar, []);

  async function crear(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    setGuardando(true);
    try {
      await apiFetch("/solicitudes", {
        method: "POST",
        body: JSON.stringify({
          folio: form.get("folio"),
          solicitanteNombre: form.get("solicitanteNombre"),
          fechaIngreso: form.get("fechaIngreso"),
        }),
      });
      setMostrarForm(false);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo registrar la solicitud");
    } finally {
      setGuardando(false);
    }
  }

  async function marcarRespondida(id: string) {
    const respuestaUrl = window.prompt("URL de respaldo de la respuesta enviada:");
    if (!respuestaUrl) return;
    setError(null);
    try {
      await apiFetch(`/solicitudes/${id}/responder`, {
        method: "PATCH",
        body: JSON.stringify({ respuestaUrl }),
      });
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo marcar la solicitud como respondida");
    }
  }

  if (!solicitudes) return <p className="text-sm text-slate-500">Cargando…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Solicitudes de acceso a la información</h2>
        {puedeGestionar && (
          <button
            onClick={() => setMostrarForm((v) => !v)}
            className="rounded-md bg-marca-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-marca-700"
          >
            {mostrarForm ? "Cancelar" : "Registrar solicitud"}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-estado-mal/10 px-3 py-2 text-sm text-estado-mal">
          {error}
        </p>
      )}

      {mostrarForm && (
        <form onSubmit={crear} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
          <input name="folio" required placeholder="Folio (ej. 145/2026)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input name="solicitanteNombre" required placeholder="Nombre del solicitante" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input name="fechaIngreso" type="date" required className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button
            type="submit"
            disabled={guardando}
            className="rounded-md bg-marca-600 px-3 py-2 text-sm font-medium text-white hover:bg-marca-700 disabled:opacity-60"
          >
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Folio</th>
              <th className="px-4 py-3">Solicitante</th>
              <th className="px-4 py-3">Ingreso</th>
              <th className="px-4 py-3">Plazo legal</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {solicitudes.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-medium text-slate-800">{s.folio}</td>
                <td className="px-4 py-3 text-slate-600">{s.solicitanteNombre}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(s.fechaIngreso).toLocaleDateString("es-CL")}</td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(s.fechaLimite).toLocaleDateString("es-CL")}
                  <span className="ml-1 text-xs text-slate-400">({s.diasHabilesRestantes} días hábiles)</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${ETIQUETA_ESTADO[s.estado].clase}`}>
                    {ETIQUETA_ESTADO[s.estado].texto}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {puedeGestionar && s.estado !== "respondida" && (
                    <button
                      onClick={() => marcarRespondida(s.id)}
                      className="rounded-md border border-marca-300 px-3 py-1 text-xs font-medium text-marca-700 hover:bg-marca-50"
                    >
                      Marcar respondida
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {solicitudes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Sin solicitudes registradas todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
