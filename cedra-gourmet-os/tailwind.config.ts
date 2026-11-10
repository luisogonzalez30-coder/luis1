import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        crema: { DEFAULT: "#FAF6F0", 2: "#F3ECE1", 3: "#E8DDCD" },
        cacao: { DEFAULT: "#2C1A14", 2: "#5B463D", 3: "#8A766C" },
        oro: { DEFAULT: "#C59B27", osc: "#8F6F14", claro: "#F1E4BC" },
        terracota: { DEFAULT: "#B85D43", claro: "#F4DDD5" },
        salvia: { DEFAULT: "#5F7355", claro: "#E1E8DC" },
      },
      fontFamily: {
        titulo: ["'Fraunces Variable'", "Georgia", "serif"],
        cifra: ["'JetBrains Mono Variable'", "ui-monospace", "monospace"],
      },
      boxShadow: { ficha: "0 1px 0 rgba(44,26,20,.04), 0 8px 24px -12px rgba(44,26,20,.18)" },
    },
  },
  plugins: [],
};
export default config;
