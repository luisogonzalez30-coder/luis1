/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Tipografía del sistema, sin webfont — ver el comentario en index.css:
      // en iOS y Android la fuente nativa ES la que hace que algo se vea nativo,
      // y evita el costo de red en celulares de gama baja con señal rural.
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
      },
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
        },
        // Tokens que NO cambian por municipalidad (definidos en index.css).
        // Mismo patrón rgb(var(...) / <alpha-value>) que `primary`, y por el
        // mismo motivo: con un var() de hex plano, Tailwind 3 no genera las
        // clases con modificador de opacidad (bg-tinta-fuerte/5) y el estilo
        // desaparece sin ningún error de build.
        borde: 'var(--borde)',
        tinta: {
          fuerte: 'rgb(var(--tinta-fuerte-rgb) / <alpha-value>)',
          DEFAULT: 'rgb(var(--tinta-rgb) / <alpha-value>)',
          suave: 'rgb(var(--tinta-suave-rgb) / <alpha-value>)',
          tenue: 'rgb(var(--tinta-tenue-rgb) / <alpha-value>)',
        },
        // Paleta de estado fija de la skill dataviz. Nunca se usa para
        // identidad (una serie, un departamento) — solo para bueno/malo.
        estado: {
          bueno: 'rgb(var(--estado-bueno-rgb) / <alpha-value>)',
          atencion: 'rgb(var(--estado-atencion-rgb) / <alpha-value>)',
          serio: 'rgb(var(--estado-serio-rgb) / <alpha-value>)',
          critico: 'rgb(var(--estado-critico-rgb) / <alpha-value>)',
        },
      },
      boxShadow: {
        // Sombras suaves y de baja opacidad: una sombra dura delata "web".
        tarjeta: '0 1px 2px rgb(24 24 27 / 0.04), 0 1px 3px rgb(24 24 27 / 0.06)',
        flotante: '0 4px 16px rgb(24 24 27 / 0.12), 0 1px 4px rgb(24 24 27 / 0.08)',
        barra: '0 -1px 3px rgb(24 24 27 / 0.05)',
      },
      spacing: {
        // Zona segura del iPhone (barra de gestos). Sin esto la barra inferior
        // queda tapada por el indicador del sistema.
        segura: 'env(safe-area-inset-bottom, 0px)',
      },
    },
  },
  plugins: [],
}
