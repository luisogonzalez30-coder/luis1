"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Enlace {
  id: string;
  url: string;
  ultimoStatusHttp: number | null;
  ultimaVerificacion: string | null;
  caidoDesde: string | null;
  seccion: { nombre: string; codigoLey: string };
}

export default function EnlacesPage() {
  const [enlaces, setEnlaces] = useState<Enlace[] | null>(null);

  useEffect(() => {
    apiFetch<Enlace[]>("/enlaces").then(setEnlaces);
  }, []);

  if (!enlaces) return <p className="text-sm text-slate-500">Cargando…</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Sección</th>
            <th className="px-4 py-3">Enlace</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Última verificación</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {enlaces.map((e) => (
            <tr key={e.id}>
              <td className="px-4 py-3">
                <p className="font-medium text-slate-800">{e.seccion.nombre}</p>
                <p className="text-xs text-slate-400">{e.seccion.codigoLey}</p>
              </td>
              <td className="px-4 py-3">
                <a href={e.url} target="_blank" rel="noreferrer" className="text-marca-600 hover:underline">
                  {e.url}
                </a>
              </td>
              <td className="px-4 py-3">
                {e.caidoDesde ? (
                  <span className="rounded-full bg-estado-mal/10 px-2 py-1 text-xs font-medium text-estado-mal">
                    Caído desde {new Date(e.caidoDesde).toLocaleDateString("es-CL")}
                  </span>
                ) : e.ultimaVerificacion ? (
                  <span className="rounded-full bg-estado-bien/10 px-2 py-1 text-xs font-medium text-estado-bien">
                    Operativo ({e.ultimoStatusHttp})
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
                    Sin verificar todavía
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-slate-500">
                {e.ultimaVerificacion ? new Date(e.ultimaVerificacion).toLocaleString("es-CL") : "—"}
              </td>
            </tr>
          ))}
          {enlaces.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                Sin enlaces registrados todavía.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
