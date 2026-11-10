"use client";

import { ChefHat, ClipboardList, LayoutDashboard, Package, Settings2, ShoppingBasket, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { store, useAppData, useHydrated, useSaveFailed } from "@/lib/store/store";

const NAV = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/cotizaciones", label: "Cotizaciones", icon: ClipboardList },
  { href: "/recetas", label: "Recetas", icon: ChefHat },
  { href: "/insumos", label: "Insumos", icon: Package },
  { href: "/compras", label: "Compras", icon: ShoppingBasket },
  { href: "/ajustes", label: "Ajustes", icon: Settings2 },
] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const saveFailed = useSaveFailed();
  const { settings } = useAppData();

  useEffect(() => store.hydrate(), []);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="min-h-screen md:flex">
      <aside className="no-print border-b border-crema-3 bg-crema-2/60 md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center gap-3 px-4 pb-2 pt-4 md:px-5 md:pt-7">
          {hydrated && settings.brand.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.brand.logoDataUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-full bg-cacao font-titulo text-lg text-oro-claro">
              {(hydrated ? settings.brand.name : "C").charAt(0) || "C"}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-titulo text-base leading-tight">{hydrated ? settings.brand.name : "Cedra Gourmet"}</p>
            <p className="rotulo !tracking-[0.2em]">Gourmet OS</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:mt-5 md:flex-col md:px-3">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${
                isActive(href) ? "bg-cacao text-crema" : "text-cacao-2 hover:bg-crema-3/70"
              }`}
            >
              <Icon size={16} strokeWidth={1.75} className={isActive(href) ? "text-oro" : ""} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-9">
        {saveFailed && (
          <p className="no-print mb-4 flex items-center gap-2 rounded-md border border-terracota/40 bg-terracota-claro px-3 py-2 text-sm text-terracota">
            <TriangleAlert size={16} /> El navegador no pudo guardar el último cambio. Exporta un respaldo desde Ajustes antes de cerrar.
          </p>
        )}
        {hydrated ? children : <p className="rotulo pt-10">Cargando taller…</p>}
      </main>
    </div>
  );
}
