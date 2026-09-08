"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cerrarSesion, obtenerUsuario, UsuarioSesion } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Resumen" },
  { href: "/revisiones", label: "Revisiones" },
  { href: "/enlaces", label: "Enlaces" },
  { href: "/solicitudes", label: "Solicitudes de acceso" },
  { href: "/usuarios", label: "Usuarios", soloRol: "admin_municipal" },
];

const ETIQUETA_ROL: Record<string, string> = {
  super_admin: "SuperAdmin LOG-In",
  admin_municipal: "Administrador Municipal",
  encargado_transparencia: "Encargado de Transparencia",
  auditor: "Auditor de Control Interno",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);

  useEffect(() => {
    const u = obtenerUsuario();
    if (!u) {
      router.replace("/login");
      return;
    }
    setUsuario(u);
  }, [router]);

  if (!usuario) return null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-marca-700">Centinela TA</p>
            <p className="text-xs text-slate-500">Ilustre Municipalidad de Retiro</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-800">{usuario.nombre}</p>
              <p className="text-xs text-slate-500">{ETIQUETA_ROL[usuario.rol] ?? usuario.rol}</p>
            </div>
            <button
              onClick={() => {
                cerrarSesion();
                router.push("/login");
              }}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 px-4">
          {NAV.filter((item) => !item.soloRol || item.soloRol === usuario.rol).map((item) => {
            const activo = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`border-b-2 px-3 py-2 text-sm font-medium transition ${
                  activo
                    ? "border-marca-600 text-marca-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
