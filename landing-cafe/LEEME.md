# Atelier Crema — landing de conversión (café)

Proyecto aparte de TuMuniAquí. Vive en esta carpeta solo para no perderlo; si se
convierte en tienda real conviene moverlo a su propio repositorio.

- Archivo único: `index.html` (+ `img/` con las 12 fotos ya redimensionadas).
- Publicado como artefacto: https://claude.ai/artifact/SEaaV55BLVtAFUAEV2zzMq
- Llavero cafetera en 3 colores (café, verde, rosa) + llavero vaso.
- Idioma por IP (ES, EN, PT, FR, DE, IT), precios siempre en USD.
- Se edita en el bloque `CONFIG` y en `P` (precios) al inicio del `<script>`.

## Pendiente
- Links de pago: pegar cada uno en `CONFIG.payLinks` (pen, drip, key-cafe, key-verde, key-rosa, key-cup, set). Con link, "Comprar ahora" abre el pago directo. Alternativa global: `CONFIG.checkoutUrl` o `CONFIG.whatsapp`.
- Precios, "antes" y stock son marcadores: poner valores reales.
- Confirmar características reales de los productos (solo se describió lo visible en las fotos).
- Reseñas reales: no hay testimonios inventados a propósito.
- La cuenta regresiva reinicia cada día a medianoche local.
- Desplegar (Vercel/Netlify) o llevar a Shopify.

## Shopify (maulestore.com)
- Landing: https://www.maulestore.com/pages/cafe-atelier
- Gracias: https://www.maulestore.com/pages/gracias-cafe-atelier
- Se publican como en las otras landings de la tienda: la página de Shopify carga un `.txt` base64 (archivos `atelier-landing-b64.txt` y `atelier-gracias-b64.txt` en Contenido > Archivos) y lo muestra en un iframe. Las fotos van embebidas en ese archivo.
- `build-shopify.py` genera esos archivos desde `index.html` y `gracias/index.html`. Para actualizar: reconstruir, subir el `.txt` nuevo y cambiar el `?v=` de la URL en el cuerpo de la página.
- Productos creados como BORRADOR (Latte Art Pen, Dripper Plegable, Llavero Barista, Set Atelier) con precios provisorios en CLP. El carrito de la landing usa los IDs de variante de `CONFIG.shopify.variants`; no funciona hasta que los productos estén ACTIVOS.

## v3: inicio + una página por producto (nov-2026)
La landing larga se dividió en un inicio corto (banner + 4 tarjetas) y una página optimizada por producto. Fuente en `v3/`; `python3 build_site.py` genera `out/preview` (páginas relativas) y `out/shopify` (HTML con imágenes embebidas + `.b64.txt` para subir a Archivos).

| Página | Handle en Shopify |
|---|---|
| Inicio | `cafe-atelier` |
| Latte Art Pen | `atelier-pen` |
| Dripper Plegable | `atelier-dripper` |
| Llavero Barista | `atelier-llavero` |
| Gracias | `gracias-cafe-atelier` |

- "Comprar ahora" agrega la variante y va directo a `/checkout`; "Agregar al carrito" abre el carrito lateral.
- IDs de variante en `CONFIG.shopify.variants` (app.js). Los productos están en BORRADOR: el pago falla hasta activarlos.
- Para actualizar una página: reconstruir, subir el `.b64.txt` nuevo a Archivos y cambiar el `?v=`/nombre en la URL del cuerpo de la página.
- La carpeta raíz (`index.html`, `build-shopify.py`) es la versión larga anterior, ya reemplazada en Shopify.

### Cambio del 9-nov-2026: sin Set ni packs
Cada pieza tiene un proveedor distinto, así que no se venden juntas en un solo pedido. Se eliminó el Set Atelier (página, producto en Shopify, tarjeta, textos) y la foto/colección de 4 llaveros. Quedan 3 productos: Latte Art Pen, Dripper Plegable y Llavero Barista (con variantes). Los enlaces internos navegan la página contenedora (`parent.location`) conservando UTM, para no abrirse dentro del iframe.
