"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError, obtenerUsuario } from "@/lib/api";

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: "admin_municipal" | "encargado_transparencia" | "auditor";
  activo: boolean;
  ultimoLogin: string | null;
}

const ETIQUETA_ROL: Record<Usuario["rol"], string> = {
  admin_municipal: "Administrador Municipal",
  encargado_transparencia: "Encargado de Transparencia",
  auditor: "Auditor de Control Interno",
};

export default function UsuariosPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sesion = obtenerUsuario();

  function cargar() {
    apiFetch<Usuario[]>("/usuarios").then(setUsuarios);
  }

  useEffect(() => {
    // Solo el Administrador Municipal gestiona usuarios (@RequireRoles en
    // UsuariosController) — si alguien más navega directo a la URL, se lo
    // manda de vuelta en vez de mostrarle una página que va a fallar sola.
    if (sesion && sesion.rol !== "admin_municipal") {
      router.replace("/dashboard");
      return;
    }
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function crear(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    setGuardando(true);
    try {
      await apiFetch("/usuarios", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          nombre: form.get("nombre"),
          rol: form.get("rol"),
          password: form.get("password"),
        }),
      });
      setMostrarForm(false);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el usuario");
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarActivo(id: string, activo: boolean) {
    setError(null);
    try {
      await apiFetch(`/usuarios/${id}/${activo ? "reactivar" : "desactivar"}`, { method: "PATCH" });
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar el usuario");
    }
  }

  if (!usuarios) return <p className="text-sm text-slate-500">Cargando…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Usuarios del municipio</h2>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="rounded-md bg-marca-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-marca-700"
        >
          {mostrarForm ? "Cancelar" : "Agregar usuario"}
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-estado-mal/10 px-3 py-2 text-sm text-estado-mal">
          {error}
        </p>
      )}

      {mostrarForm && (
        <form onSubmit={crear} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-5">
          <input name="nombre" required placeholder="Nombre completo" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input name="email" type="email" required placeholder="correo@retiro.cl" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select name="rol" required className="rounded-md border border-slate-300 px-3 py-2 text-sm" defaultValue="encargado_transparencia">
            <option value="encargado_transparencia">Encargado de Transparencia</option>
            <option value="auditor">Auditor de Control Interno</option>
            <option value="admin_municipal">Administrador Municipal</option>
          </select>
          <input name="password" type="password" required minLength={8} placeholder="Contraseña inicial" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
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
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Último acceso</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium text-slate-800">{u.nombre}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3 text-slate-600">{ETIQUETA_ROL[u.rol]}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      u.activo ? "bg-estado-bien/10 text-estado-bien" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {u.activo ? "Activo" : "Desactivado"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {u.ultimoLogin ? new Date(u.ultimoLogin).toLocaleString("es-CL") : "Nunca"}
                </td>
                <td className="px-4 py-3">
                  {u.id !== sesion?.id && (
                    <button
                      onClick={() => cambiarActivo(u.id, !u.activo)}
                      className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      {u.activo ? "Desactivar" : "Reactivar"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
