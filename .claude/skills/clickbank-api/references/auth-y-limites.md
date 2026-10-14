# Autenticación, permisos, límites y errores

## 1. Claves

ClickBank tiene dos generaciones de credenciales conviviendo.

### Modelo vigente (desde 17-ago-2023)

Una sola **API Key** creada en la cuenta primaria. **Ya no se requiere Developer Key.**

```
Cuenta primaria → Settings / Account Settings → API Management → Create API Key
```

- Se le asignan permisos granulares al crearla.
- Se muestra **una sola vez**: si se pierde, se revoca y se crea otra.
- Una clave por integración. Así se revoca una sin tumbar el resto.

Header:

```http
Authorization: TU_API_KEY
Accept: application/json
```

### Modelo legado (aún aceptado)

Dos claves concatenadas con dos puntos:

```http
Authorization: DEV_KEY:CLERK_KEY
```

- **Developer API Key**: `Account Settings → Developer API Keys → Create New Developer Key`.
- **Clerk API Key**: `Users → crear usuario tipo API-only` con los roles necesarios; la clave se muestra al crearlo.

No es `Basic` ni `Bearer`. Es el valor crudo en el header `authorization`. No lo codifiques en base64.

### Verificación

```bash
curl -s -H "Authorization: $CLICKBANK_API_KEY" \
     -H "Accept: application/json" \
     https://api.clickbank.com/rest/1.3/debug
```

Devuelve el contexto de seguridad: qué cuenta se resolvió y qué permisos trae la clave.
Es el primer diagnóstico ante cualquier `403`.

## 2. Permisos

Cada endpoint declara los suyos (columna *Permisos* en `endpoints.md`). Agrupados:

| Permiso | Habilita |
|---|---|
| `api_analytics_client` | Todo `/analytics`: dimensiones, resúmenes, detalle y tendencias de suscripciones |
| `api_order_read` | Lectura de `/orders`, `/orders2`, `/quickstats`, `/shipping*` y `/tickets` |
| `api_order_write` | Crear y actualizar tickets (**incluye emitir reembolsos y cancelaciones**), crear ship notices, acusar devoluciones, `changeAddress` |
| `api_subscription_modifications` | `pause`, `reinstate`, `extend`, `changeProduct`, `changeDate` sobre suscripciones |
| `api_products_client` | `/products` completo (GET/PUT/DELETE) y `/images/list` |

Notas que cambian el diseño de tus claves:

- **Quickstats y Shipping no tienen permiso propio**: viajan bajo `api_order_read`. Una clave de solo
  reportes ya ve órdenes, envíos y tickets.
- **`api_order_write` mueve dinero.** Emite reembolsos. Nunca la pongas en una clave de reporting.
- **`api_subscription_modifications` es independiente** de `api_order_write`: pausar o extender una
  suscripción no requiere poder reembolsar, y viceversa. Sepáralas.
- `changeProduct` exige **ambos**: `api_order_write` y `api_subscription_modifications`.

Principio: **la clave que solo lee reportes no debe poder emitir reembolsos.** `api_order_write` es la más peligrosa del conjunto.

## 3. Límites de uso

| Límite | Valor | Alcance |
|---|---|---|
| Diario | 25.000 peticiones | Por **cuenta**, compartido entre todas las integraciones y sitios |
| Por segundo | 10 peticiones | Por **dirección IP** |
| Filas por respuesta | 100 | Por llamada, en todos los endpoints paginados |

Consecuencias prácticas:

- El límite diario es un recurso común. Una integración descontrolada deja sin API a las demás — incluidas las de terceros que el usuario haya conectado. Diseña para consumir poco: rangos de fechas amplios en una sola llamada, no un día por petición.
- Al superarlo, la respuesta es **`403 Forbidden`**, no `429`. No hay header `Retry-After`.
- Para tiempo real, **INS** (webhooks) en lugar de polling. Ver `ins-webhooks.md`.

Throttling recomendado: 8 req/s con *token bucket*, y backoff exponencial (2 s, 4 s, 8 s, 16 s) ante `5xx`.

## 4. Paginación

No usa `?page=`. Usa un **header de petición**:

```http
Page: 2
```

Algoritmo correcto:

```
page = 1
repetir:
    respuesta = GET recurso  con header Page: page
    acumular filas
    si respuesta.status != 206: terminar
    page += 1
```

**No** cortes cuando lleguen menos de 100 filas: la API puede devolver menos de 100 y aun así tener más datos. El único indicador fiable es el `206`.

## 5. Códigos de estado

| Código | Significado en ClickBank |
|---|---|
| `200` | OK, resultado completo |
| `204` | Operación aceptada sin cuerpo (p. ej. `HEAD /orders2/{receipt}` con suscripción activa, acuse de devolución) |
| `206` | Contenido parcial — **hay más páginas** |
| `400` | Petición inválida (ticket inexistente, reapertura de un ticket no cerrado, producto no físico) |
| `403` | Ambiguo: sin permiso · recurso ajeno · recurso inexistente · **cuota agotada** · suscripción no activa en `HEAD` |
| `500` | Error del servidor — reintenta con backoff |

El cuerpo de error es **texto plano**. Parsearlo como JSON revienta el cliente: léelo como string.

## 6. Rarezas del formato de respuesta

Heredadas de la implementación XML (JSR-311):

1. **Nillable, no nullable.** Un campo vacío puede llegar como `{"@nil": "true"}` u objeto vacío en vez de `null`. Normaliza: objeto vacío o con clave `nil` → `None`/`null`.
2. **Arrays que llegan como objeto.** Con un solo elemento, `lineItems` puede venir como objeto en lugar de lista. Envuelve siempre: `if not isinstance(x, list): x = [x]`.
3. **Enums con valor `nil`.** Muchos enums (`Role`, `TicketType`, `ProductType`...) incluyen `nil` como valor centinela. No es un valor válido de negocio.
4. **Números como string.** Los importes pueden venir como cadena. Convierte con `Decimal(str(v))`, nunca con `float()` directo en dinero.

Los clientes de `scripts/` ya aplican las cuatro normalizaciones.

## 7. Fechas

- Formato `YYYY-MM-DD` en todos los parámetros de rango.
- Rangos **inclusivos** en ambos extremos.
- Quickstats sin filtros devuelve los **últimos 45 días**.
- Analytics tiene latencia de consolidación: consulta `GET /rest/1.3/analytics/status` (`lastUpdate`) antes de dar por cerrado el día en curso.
- Los timestamps de las respuestas vienen en la zona horaria de la cuenta ClickBank, no en UTC. Fija la zona explícitamente al comparar con datos de otras fuentes.
