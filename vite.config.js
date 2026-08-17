import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Configuración estándar de Vite para React.
export default defineConfig({
  plugins: [
    react(),
    // Agrega el Service Worker que faltaba (ver ESTADO_PROYECTO.md §27.12): sin
    // él, index.html + manifest.json ya bastan para "Agregar a inicio" en
    // iPhone, pero Android/Chrome no ofrece el botón automático de "Instalar
    // app" hasta que hay un Service Worker activo.
    //
    // `manifest: false` porque public/manifest.json ya existe, completo y
    // enlazado a mano en index.html — este plugin solo se encarga de generar y
    // registrar el Service Worker, no de generar un manifest nuevo.
    VitePWA({
      manifest: false,
      registerType: 'autoUpdate',
      workbox: {
        // Deja el cascarón de la app (JS/CSS/HTML/íconos) precacheado para que
        // abra aunque no haya señal — los datos (Firestore, fotos, geocoding)
        // siguen siempre en vivo, nada de eso se cachea acá a propósito.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  server: {
    // Necesario para poder probar la Geolocalización (GPS) desde otros dispositivos en red local (ej. celular real)
    host: true,
    port: Number(process.env.PORT) || 5173
  }
})
