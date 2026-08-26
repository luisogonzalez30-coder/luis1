# Las plataformas que mantienen viva TuMuniAquí

Inventario hecho el 25-ago-2026 **leyendo el código**, no de memoria. Si agregas o sacas un
servicio, actualiza esta lista: es lo primero que se busca cuando algo se cae y nadie se
acuerda de dónde vive.

## Las que sostienen el servicio a diario

| Plataforma | Para qué | Panel | ¿Cuesta? |
|---|---|---|---|
| **Firebase** (Google) | La base de datos (Firestore), el login de funcionarios (Auth) y el hosting del sitio | [console.firebase.google.com](https://console.firebase.google.com/project/app-incidencias-urbanas) | **Gratis** — plan Spark |
| **Render** | Donde corre el bot de WhatsApp y toda la IA | [dashboard.render.com](https://dashboard.render.com) | **Gratis** — plan Free, **sin SLA** ⚠️ |
| **Cloudinary** | Las fotos que suben los vecinos | [console.cloudinary.com](https://console.cloudinary.com) | **Gratis** — plan free |
| **Meta / WhatsApp Cloud API** | Los avisos y las respuestas por WhatsApp | [developers.facebook.com](https://developers.facebook.com) · [business.facebook.com](https://business.facebook.com) | **Se paga por mensaje de plantilla** 💰 |
| **GitHub** | El código, el despliegue automático y la vigilancia cada 30 min | [github.com/luisogonzalez30-coder/luis1](https://github.com/luisogonzalez30-coder/luis1) | **Gratis** |
| **Anthropic** | Las funciones de IA (§48) | [console.anthropic.com](https://console.anthropic.com) | **Pago por uso** 💰 — ver `COSTOS-IA.md` |

## Las que se usan sin tener cuenta

Ninguna requiere registro ni pago. Son servicios públicos que la app consume directamente, y
por eso **no aparecen en ninguna factura pero sí pueden caerse**:

| Servicio | Para qué | Dónde se usa |
|---|---|---|
| **OpenStreetMap** — tiles | El mapa que ve el vecino y el funcionario | `MapaSeleccionUbicacion.jsx`, `MapaIncidencias.jsx` |
| **Nominatim** (OpenStreetMap) | Buscar una dirección y convertirla en un punto | `geocodificacionService.js` (§37) |
| **ArcGIS Online** (Esri) | La vista satelital del mapa | `MapaSeleccionUbicacion.jsx` (§47) |
| **unpkg**, **cdnjs**, **Google Fonts** | Íconos del mapa y tipografías | Leaflet y la landing |

## Apagada a propósito

| Plataforma | Para qué | Estado |
|---|---|---|
| **OpenAI** | Transcribir las notas de voz de WhatsApp | **Apagada.** Claude no acepta audio, así que esta función —y solo esta— necesita otro proveedor. Antes de encenderla hay que declararlo en la política de privacidad (§48.6) |

## Una dependencia que NO se usa (aunque lo parezca)

**Google Maps no se está usando.** `@googlemaps/js-api-loader` está en `package.json` y existe
`src/utils/googleMapsLoader.js`, pero **ningún componente lo importa**: los mapas son Leaflet
con tiles de OpenStreetMap y ArcGIS. La variable `VITE_GOOGLE_MAPS_API_KEY` tampoco hace nada.

Importa saberlo por dos razones: no hay que pagar una API key de Google Maps, y si algún día
alguien "arregla" ese archivo puede encender un cobro sin querer. Se puede borrar.

## Direcciones para saber si algo está vivo

| Qué mirar | Link |
|---|---|
| La app del vecino | <https://app-incidencias-urbanas.web.app/licanten> |
| Consulta de ticket, sin login | <https://app-incidencias-urbanas.web.app/licanten/estado> |
| Demo para presentaciones | <https://app-incidencias-urbanas.web.app/demo> |
| Login de funcionarios y Alcalde | <https://app-incidencias-urbanas.web.app/login> |
| Landing comercial | <https://tumuniaqui.web.app> |
| Salud del bot | <https://proyectomuni.onrender.com/salud> |
| Estado de la IA | <https://proyectomuni.onrender.com/ia/estado> |
| Las revisiones automáticas | [Actions del repositorio](https://github.com/luisogonzalez30-coder/luis1/actions) |

Desde una sesión de Claude Code **no se puede mirar la pantalla**, solo leer código y
registros. `npm run revisar` comprueba los ocho sistemas de una pasada.

## Lo que hay que tener presente

**Dos de estas plataformas están en plan gratuito con un municipio dependiendo del servicio.**
Render Free no tiene SLA: si se apaga, no sale ningún aviso por WhatsApp y nadie se entera
hasta que reclama un vecino. Firebase Spark comparte cuota. Es el pendiente #1 de
`RETOMAR-AQUI.md`, y no lo resuelve ningún cambio de código — necesita una tarjeta.

**Meta es el único costo que crece con el uso desde antes de la IA.** Cada reporte genera al
menos dos mensajes de plantilla. Verificar la tarifa vigente en Chile sigue pendiente.
