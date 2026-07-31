import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuración estándar de Vite para React.
export default defineConfig({
  plugins: [react()],
  server: {
    // Necesario para poder probar la Geolocalización (GPS) desde otros dispositivos en red local (ej. celular real)
    host: true,
    port: Number(process.env.PORT) || 5173
  }
})
