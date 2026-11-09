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
