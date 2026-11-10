import "@fontsource-variable/fraunces";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = {
  title: "Cedra Gourmet OS",
  description: "Costeo al gramo, precios con margen real y cotizaciones formales para pastelería gourmet.",
};

export const viewport: Viewport = { themeColor: "#FAF6F0", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
