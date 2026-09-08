/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Azul institucional de LOG-In (ver isotipo en la propuesta original),
        // con un acento semántico separado para estado (cumple/no-cumple).
        marca: {
          50: "#eef4ff",
          100: "#d9e6ff",
          400: "#3d6fd8",
          600: "#1f4bb8",
          700: "#193c93",
          900: "#122a68",
        },
        estado: {
          bien: "#1a7f4f",
          alerta: "#b8791f",
          mal: "#b8332b",
        },
      },
    },
  },
  plugins: [],
};
