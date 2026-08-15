"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError, guardarSesion, UsuarioSesion } from "@/lib/api";

interface LoginResponse {
  accessToken: string;
  usuario: UsuarioSesion;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const respuesta = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      guardarSesion(respuesta.accessToken, respuesta.usuario);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-marca-600">LOG-In · Soluciones Integrales</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Centinela TA</h1>
          <p className="mt-1 text-sm text-slate-500">Monitoreo de Transparencia Activa</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Correo institucional
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-marca-400 focus:outline-none focus:ring-2 focus:ring-marca-100"
              placeholder="transparencia@retiro.cl"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-marca-400 focus:outline-none focus:ring-2 focus:ring-marca-100"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-estado-mal/10 px-3 py-2 text-sm text-estado-mal">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-md bg-marca-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-marca-700 disabled:opacity-60"
          >
            {cargando ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Usuario demo: transparencia@retiro.cl · Cambiar123!
        </p>
      </div>
    </main>
  );
}
