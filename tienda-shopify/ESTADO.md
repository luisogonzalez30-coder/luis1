# ESTADO — Tienda Shopify

> Archivo de estado del proyecto. Se actualiza al final de cada fase.

## Datos de la tienda

| Dato | Valor |
|---|---|
| Dominio interno | `bys-user-store-156507-fhshxzpd.myshopify.com` |
| Enlace dado por el usuario | https://bys-user-store-156507-fhshxzpd.myshopify.com/ |
| Mercado objetivo | Estados Unidos (idioma de la tienda: inglés) |
| Carpeta del proyecto | `/home/user/luis1/tienda-shopify` |
| Rama de trabajo | `claude/tienda-shopify-v3-v8des8` |

## Fase completada

**Fase 0 (entorno): ✅ hecha.**
- Node v22.22.2 y npm 10.9.7 ya presentes.
- Shopify CLI 4.6.0 instalado correctamente.

**Fase 1 (conexión): ❌ BLOQUEADA — no por culpa del usuario ni de la tienda.**
- El entorno en la nube donde se ejecuta esta sesión tiene una política de red
  que **bloquea todos los dominios de Shopify**. Comprobado:
  - `accounts.shopify.com:443` → CONNECT rechazado con 403 (política de salida).
  - `bys-user-store-156507-fhshxzpd.myshopify.com:443` → CONNECT rechazado con 403.
- Consecuencia: no se puede iniciar sesión del tema (`shopify theme list`), ni
  autorizar el acceso a datos (`shopify store auth`), ni leer/escribir el
  producto, ni subir tema, ni publicar. **Ninguna** operación contra Shopify.
- No es un error recuperable desde aquí: no se debe reintentar ni rodear.

**Conector AutoDS: ❌ NO AUTORIZADO en esta sesión.**
- El servidor `AutoDS_Dropshipping_Product_Research_Store_Automation` figura
  como conectado pero **pendiente de autorización**, y esta sesión no es
  interactiva, así que no puede completarse el permiso desde aquí.
- Consecuencia: no se ha podido consultar el catálogo real de AutoDS, ni sus
  precios de proveedor, ni sus tiempos de envío reales, ni importar el producto
  a la tienda automáticamente.

## Producto

- **No leído** (bloqueo de red, ver arriba). Se desconoce si la tienda ya tiene
  catálogo.
- **Investigación de producto ganador: ✅ HECHA** con fuentes públicas de
  mercado, sin AutoDS. Resultado completo en
  [`investigacion-producto-ganador.md`](./investigacion-producto-ganador.md).
- Recomendación principal: **botas de recuperación por compresión de aire**
  (air compression recovery boots), ticket $399–$549 USD.
- Ficha lista para pegar en Shopify: [`ficha-producto.md`](./ficha-producto.md).

## Secciones creadas

Ninguna todavía (la fase 2 en adelante depende de poder conectar con Shopify).

## Guion fotográfico

No generado todavía. Los ángulos de vídeo/imagen propuestos están en la sección
"Guion de vídeo con IA" de `investigacion-producto-ganador.md`.

## Decisiones de diseño

Pendientes: no se propone estilo hasta poder leer la tienda o hasta que el
usuario describa cómo la quiere.

## Qué falta para desbloquear

1. **Red hacia Shopify**: crear/usar un entorno cuya política de red permita
   `*.myshopify.com`, `accounts.shopify.com` y `admin.shopify.com`; o ejecutar
   la skill en el ordenador del usuario.
2. **AutoDS**: autorizar el conector desde los ajustes de conectores de
   claude.ai.

Con esas dos cosas resueltas, el flujo sigue en fase 1 (login + sondeo) sin
cambios.
