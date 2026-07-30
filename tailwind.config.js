/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores por municipalidad (multi-tenant): se leen de variables CSS aplicadas
        // en tiempo de ejecución por src/utils/tema.js según el tenant activo. El patrón
        // rgb(var(...) / <alpha-value>) es necesario (en vez de var(--x) directo) para que
        // sigan funcionando los modificadores de opacidad ya usados en el código
        // (ej. bg-primary/5, focus:ring-primary/30) — Tailwind 3 no resuelve <alpha-value>
        // sobre un var() plano.
        primary: {
          DEFAULT: 'rgb(var(--color-primary-rgb, 29 78 216) / <alpha-value>)',
          dark: 'rgb(var(--color-primary-dark-rgb, 30 58 138) / <alpha-value>)',
        }
      }
    },
  },
  plugins: [],
}
