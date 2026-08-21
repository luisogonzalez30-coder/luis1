import React from 'react'
import ReactDOM from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'

// App se importa de forma DINÁMICA, no estática, y eso es deliberado.
//
// firebase.js llama a getAuth(app) al evaluarse el módulo. Si la configuración
// viene vacía —un VITE_FIREBASE_* que faltó al compilar— eso lanza
// "auth/invalid-api-key" durante la carga del módulo, antes de que corra una
// sola línea de este archivo. Con un import estático el error ocurre en la
// cadena de dependencias y no hay forma de atraparlo desde acá: React nunca
// monta, la pantalla de carga de index.html se queda puesta, y el vecino ve el
// logo girando para siempre sin ninguna explicación. Pasó de verdad, en el
// primer despliegue automático.
//
// Con import dinámico el error llega como promesa rechazada y sí se puede
// mostrar. Un fallo de configuración se ve como un fallo de configuración.
function mostrarErrorDeArranque(error) {
  console.error('[main.jsx] La aplicación no pudo iniciarse.', error)

  const raiz = document.getElementById('root')
  if (!raiz) return

  // DOM a mano, sin React ni Tailwind: si el arranque falló, no se puede dar
  // por sentado que esas piezas estén disponibles. Esta pantalla tiene que
  // funcionar aunque todo lo demás esté roto.
  raiz.innerHTML = ''

  const caja = document.createElement('div')
  caja.setAttribute('role', 'alert')
  caja.style.cssText = [
    'position:fixed', 'inset:0', 'display:flex', 'flex-direction:column',
    'align-items:center', 'justify-content:center', 'gap:1rem',
    'padding:2rem', 'text-align:center', 'background:#ffffff',
    'font-family:system-ui,-apple-system,"Segoe UI",sans-serif', 'color:#18181b',
  ].join(';')

  const titulo = document.createElement('h1')
  titulo.textContent = 'No pudimos abrir la aplicación'
  titulo.style.cssText = 'margin:0;font-size:1.25rem;font-weight:700'

  const texto = document.createElement('p')
  texto.textContent =
    'Hay un problema de configuración en el servidor, no en tu teléfono ni en tu conexión. '
    + 'Ya quedó registrado. Vuelve a intentarlo más tarde.'
  texto.style.cssText = 'margin:0;max-width:30rem;font-size:0.9375rem;line-height:1.5;color:#3f3f46'

  // Si el municipio está caído, el vecino igual necesita resolver su problema.
  // Los números de emergencia no dependen de que esta app funcione.
  const emergencia = document.createElement('p')
  emergencia.textContent = 'Si se trata de una emergencia, llama al 131 (SAMU), 132 (Bomberos) o 133 (Carabineros).'
  emergencia.style.cssText = 'margin:0;max-width:30rem;font-size:0.875rem;line-height:1.5;color:#d03b3b;font-weight:600'

  const boton = document.createElement('button')
  boton.textContent = 'Reintentar'
  boton.style.cssText = [
    'margin-top:0.5rem', 'min-height:44px', 'min-width:44px', 'padding:0 1.5rem',
    'border:0', 'border-radius:12px', 'background:#1D4ED8', 'color:#fff',
    'font-size:0.9375rem', 'font-weight:600', 'cursor:pointer',
  ].join(';')
  boton.addEventListener('click', () => window.location.reload())

  caja.append(titulo, texto, emergencia, boton)
  raiz.append(caja)
}

import('./App.jsx')
  .then(({ default: App }) => {
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
  })
  .catch(mostrarErrorDeArranque)
