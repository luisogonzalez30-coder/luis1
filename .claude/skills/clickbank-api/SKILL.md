---
name: clickbank-api
description: Trabaja con las APIs REST de ClickBank v1.3 (Analytics, Orders/Orders2, Products, Quickstats, Shipping/Shipping2/Shipping3, Ship Notice, Tickets, Images, Debug) y con el Instant Notification Service (INS/webhooks). Úsala cuando el usuario mencione ClickBank, api.clickbank.com, sus ventas/rebills/reembolsos/chargebacks, quickstats, hops o EPC de afiliado, suscripciones y churn, órdenes de bienes físicos y avisos de envío, tickets de reembolso o cancelación, claves de API de ClickBank, o cuando pida integrar, sincronizar, exportar, reportar, automatizar o construir un dashboard sobre datos de ClickBank.
---

# ClickBank API — v1.3

Catálogo completo de endpoints, autenticación, límites, webhooks y clientes listos para producción.

## Lo mínimo que hay que saber antes de escribir código

| Punto | Realidad |
|---|---|
| Base URL | `https://api.clickbank.com` — todo cuelga de `/rest/1.3/...` |
| Auth | Header **`Authorization: <API-KEY>`** (sin `Bearer`, sin `Basic`). Legado: `<DEV-KEY>:<CLERK-KEY>` |
| Formato | `Accept: application/json` (también sirve `application/xml`; por defecto la API responde XML) |
| Parámetros | **Solo query string.** Los `POST`/`PUT` también reciben sus parámetros por query — el cuerpo form-encoded se ignora |
| Paginación | Header de petición **`Page: N`** (no query). Respuesta `206 Partial Content` = hay más páginas |
| Página | Máx. 100 filas por llamada, y **no siempre devuelve 100** aunque queden datos |
| Rate limit | 25.000 req/día/**cuenta** (compartido entre todas tus integraciones) + 10 req/seg/IP |
| Error de rate limit | **`403 Forbidden`**, no `429`. Un `403` puede ser permisos, cuota agotada o recurso ajeno |
| Errores | Cuerpo en **texto plano**, no JSON/XML. No intentes parsearlos |
| Nulos | Son *nillable* estilo XML: un campo puede volver como objeto `{}` en lugar de string/número/fecha |
| Arrays | Un campo documentado como array puede llegar como objeto único. Normaliza siempre |

## Rutas de trabajo

1. **¿Qué endpoint necesito?** → `references/endpoints.md` (54 endpoints, parámetros, permisos, respuestas).
2. **¿Qué valores acepta este parámetro / qué campos trae la respuesta?** → `references/schemas.md` (enums + objetos).
3. **Claves, permisos, códigos de estado, paginación, throttling** → `references/auth-y-limites.md`.
4. **Webhooks / notificaciones en tiempo real** → `references/ins-webhooks.md` (INS v6+, descifrado AES-256-CBC).
5. **Tareas frecuentes ya resueltas** (reporte diario, churn de suscripciones, reembolso, aviso de envío, dashboard) → `references/recetas.md`.
6. **Código base** → `scripts/clickbank.py` (Python) y `scripts/clickbank.mjs` (Node 18+). Ambos ya manejan reintentos, throttling, paginación y normalización de nulos/arrays.
7. **Spec OpenAPI** → `assets/open-clickbank.yaml`. Sirve para generar clientes (`openapi-generator`, `orval`, `kiota`) en cualquier lenguaje.

## Los 11 grupos de la API

| Grupo | Prefijo | Para qué sirve | Permiso |
|---|---|---|---|
| **Analytics** | `/rest/1.3/analytics` | Métricas por dimensión (afiliado, SKU, país, tracking ID), EPC, hops, conversión; detalle y tendencias de suscripciones | `api_analytics_client` |
| **Orders2** | `/rest/1.3/orders2` | Órdenes, upsells, estado de suscripción, cambio de producto/fecha/dirección, pausar, extender, reactivar | `api_order_read`, `api_order_write`, `api_subscription_modifications` |
| **Orders** *(legado)* | `/rest/1.3/orders` | Igual que Orders2 pero versión anterior. Usa Orders2 en integraciones nuevas | ídem |
| **Products** | `/rest/1.3/products` | CRUD de productos: listar, obtener, crear/actualizar por SKU, eliminar | `api_products_client` |
| **Quickstats** | `/rest/1.3/quickstats` | Ventas, reembolsos y chargebacks por día o sumados. Últimos 45 días por defecto. También lista los nicknames accesibles | `api_order_read` |
| **Shipping3** | `/rest/1.3/shipping3` | Órdenes de bienes físicos pendientes/enviadas (versión vigente) | `api_order_read` |
| **Shipping2 / Shipping** *(legado)* | `/rest/1.3/shipping2`, `/shipping` | Versiones previas del mismo servicio | ídem |
| **Ship Notice** | `/rest/1.3/shipping{,2,3}/shipnotice/{receipt}` | Registrar tracking y transportista de un envío; consultar avisos existentes | `api_order_read` + `api_order_write` |
| **Tickets** | `/rest/1.3/tickets` | Crear y gestionar tickets de reembolso, cancelación y soporte; calcular montos de reembolso; acusar devolución física | `api_order_read` / `api_order_write` |
| **Images** | `/rest/1.3/images/list` | Imágenes asociadas a un sitio (producto, banners, order form) | `api_products_client` |
| **Debug** | `/rest/1.3/debug` | Devuelve el contexto de seguridad de tu petición. **Primer endpoint a llamar** cuando algo da 403 | — |

> `Orders` vs `Orders2` y `shipping` vs `shipping2` vs `shipping3`: son versiones del mismo servicio conviviendo. **Nuevo código: `orders2` y `shipping3`.**

## Reglas de implementación que evitan el 90 % de los bugs

- **Empieza por `GET /rest/1.3/debug`.** Confirma que la clave llega y qué permisos tiene antes de culpar al endpoint.
- **Nunca hardcodees la clave.** `CLICKBANK_API_KEY` por entorno. Una clave por integración, con el permiso mínimo.
- **Throttle a ~8 req/s** con backoff exponencial. El límite diario es por cuenta: si te lo comes, tumbas las demás integraciones del usuario.
- **Trata `403` como ambiguo.** Distingue permisos vs. cuota mirando `/debug` y el texto plano del cuerpo.
- **Pagina hasta que el status deje de ser `206`**, no hasta que lleguen menos de 100 filas.
- **Fechas en `YYYY-MM-DD`** y rangos cerrados por ambos extremos. Analytics tiene *lag*: verifica `GET /analytics/status` (última actualización) antes de reportar el día en curso.
- **Idempotencia en escritura.** `POST /tickets/{receipt}` (reembolso) y `POST /shipnotice/{receipt}` no son reversibles: guarda el `receipt` procesado antes de llamar.
- **Analytics `subscription/details` solo lo ve el vendor/seller dueño del producto** (desde 13-dic-2022), no el afiliado.
- **Para tiempo real usa INS, no polling.** El polling de `orders2/list` cada minuto agota la cuota diaria; INS empuja el evento.

## Créditos de la especificación

`assets/open-clickbank.yaml` proviene del proyecto comunitario
[OcelliSolutions/OpenClickBank](https://github.com/OcelliSolutions/OpenClickBank) (licencia MIT),
contrastado con la [documentación oficial de ClickBank](https://support.clickbank.com/en/articles/10535400-clickbank-apis).
No es un documento oficial de ClickBank: ante una discrepancia, manda la documentación oficial.
