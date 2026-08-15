import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Centinela TA — LOG-In",
  description: "Plataforma de Monitoreo de Transparencia Activa",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
