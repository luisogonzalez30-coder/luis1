# Recetas — tareas frecuentes ya resueltas

Todos los ejemplos usan `scripts/clickbank.py`. El equivalente en Node está en `scripts/clickbank.mjs`
con los mismos nombres de método (camelCase).

## 1. Diagnóstico: ¿mi clave sirve y a qué llega?

Antes de depurar cualquier otra cosa.

```python
from clickbank import ClickBank
cb = ClickBank()

print(cb.debug.context())        # qué cuenta y qué permisos resolvió la clave
print(cb.quickstats.accounts())  # nicknames a los que la clave tiene lectura
```

Si `debug` responde y el endpoint que quieres da `403`, el problema es **permiso o cuota**, no la clave.

## 2. Reporte de ventas netas de un período

`quickstats/count` suma el rango en **una sola petición** — no iteres día por día, quema cuota.

```python
from decimal import Decimal
from clickbank import ClickBank, as_decimal, as_list

cb = ClickBank()
data = cb.quickstats.count(start="2026-08-01", end="2026-08-31", account="minicuenta")

for row in as_list(data.get("quickStatsData") if isinstance(data, dict) else data):
    ventas      = as_decimal(row.get("saleAmount"))
    reembolsos  = as_decimal(row.get("refundAmount"))
    chargebacks = as_decimal(row.get("chgbkAmount"))
    neto        = ventas - reembolsos - chargebacks
    tasa_refund = (reembolsos / ventas * 100) if ventas else Decimal(0)
    print(f"Neto: {neto:.2f} | Tasa de reembolso: {tasa_refund:.2f}%")
```

Para convertir a otra moneda, aplica la tasa de cambio exacta que te den; **no** uses la que devuelva
la API para un día distinto al de la conversión real. Los importes vienen en la moneda del cliente
(`currency`), no siempre en USD: agrupa por moneda antes de sumar.

## 3. Serie diaria para un dashboard

```python
filas = list(cb.quickstats.list(start="2026-06-01", end="2026-08-31", account="minicuenta"))
# un registro por día: quickStatDate, saleAmount, refundAmount, chgbkAmount, ...
```

Un rango de 92 días entra en 1–2 peticiones. Cachea el resultado: el histórico cerrado no cambia,
solo los últimos días siguen moviéndose por reembolsos y chargebacks tardíos.

## 4. Rendimiento por afiliado, SKU o tracking ID

```python
filas = list(cb.analytics.dimension(
    role="VENDOR", dimension="AFFILIATE",
    start="2026-08-01", end="2026-08-31", account="minicuenta",
))
```

Dimensiones útiles: `AFFILIATE`, `PRODUCT_SKU`, `TRACKING_ID`, `CUSTOMER_COUNTRY`,
`CUSTOMER_CURRENCY`, `CUSTOMER_PROVINCE`, `CUSTOMER_LANGUAGE`, `VENDOR_CATEGORY`.

Métricas por fila (`DimensionColumn`): `HOP_COUNT`, `ORDER_FORM_SALE_CONVERSION`,
`EARNINGS_PER_HOP`, `GROSS_SALE_AMOUNT`, `NET_SALE_AMOUNT`, `REFUND_RATE`, `CHARGEBACK_RATE`,
`REBILL_AMOUNT`, `UPSELL_AMOUNT`.

**`TRACKING_ID` es la unión con tu tráfico pagado o orgánico**: el TID que pusiste en el hoplink
vuelve aquí. Es lo que permite atribuir ventas a una campaña o a un video concreto.

Consulta `GET /analytics/status` antes de reportar el día en curso: Analytics consolida con retraso.

```python
print(cb.analytics.status())   # lastUpdate
```

## 5. Suscripciones en riesgo (churn)

Solo el vendor dueño del producto lo ve.

```python
por_cancelar = list(cb.analytics.subscription_details(role="VENDOR", bucket="cancelthirty"))
completan    = list(cb.analytics.subscription_details(role="VENDOR", bucket="compthirty"))
tendencias   = cb.analytics.subscription_trends(role="VENDOR",
                                                startDate="2026-06-01", endDate="2026-08-31")
```

Buckets: `cancelthirty`, `cancelsixty` (canceladas), `compthirty`, `compsixty` (que terminan),
`startdate`, `canceldate`, `nextpmtdate` (por rango de fechas), `status` (por estado).

Estados de suscripción (`SubscriptionStatus`): `ACTIVE`, `COMPLETED`, `CANCELED`,
`RETRY_PAYMENT`, `REQUEST_NEW_CARD`.

> `RETRY_PAYMENT` y `REQUEST_NEW_CARD` son **churn involuntario**: el cliente no se quiso ir,
> falló la tarjeta. Es la cohorte con mejor tasa de recuperación — atácala primero.

## 6. Reembolso seguro (dinero real, irreversible)

Siempre en dos pasos: simular y luego emitir.

```python
# 1. Cuánto se devolvería realmente, en la moneda del cliente
simulacion = cb.tickets.refund_amounts("ABC12345",
                                       refundType="PARTIAL_PERCENT", refundAmount=50)
print(simulacion)

# 2. Emitir (registra el receipt en tu base ANTES de llamar: no hay deshacer)
ticket = cb.tickets.create(
    "ABC12345",
    type="rfnd",
    reason="ticket.type.refund.2",       # no satisfecho con el producto
    refund_type="PARTIAL_PERCENT",
    refund_amount=50,
    comment="Reembolso parcial acordado por soporte",
    retain_subscription=True,            # devuelve el cargo pero mantiene la suscripción
)
```

Reglas que cambian el resultado:

| Situación | Efecto |
|---|---|
| `type="rfnd"` sobre producto recurrente | Reembolsa **y** cancela los cobros futuros |
| `type="cncl"` sobre producto recurrente | Solo cancela cobros futuros, **no** devuelve dinero |
| `type="rfnd"` o `"cncl"` sobre producto único | Ambos reembolsan la venta |
| `retain_subscription=True` | Devuelve el cargo sin matar la suscripción |
| `PARTIAL_PERCENT` | Entre 1 y 80, dos decimales. La cuenta debe tener reembolsos parciales habilitados, o `403` |
| `PARTIAL_AMOUNT` | Monto en la moneda del cliente — usa `refund_amounts` para saber la conversión |

Cerrar un ticket de reembolso abierto (`update(id, action="close")`) **cancela la solicitud**,
no la aprueba. Es el error más caro de esta API.

Códigos de razón válidos: enum `TicketReasonRequest` en `schemas.md`.

## 7. Fulfillment de bienes físicos

```python
pendientes = list(cb.shipping.list(status="notshipped"))   # shipping3

for orden in pendientes:
    receipt = orden.get("receipt")
    if ya_enviado_en_mi_bd(receipt):      # idempotencia obligatoria
        continue
    cb.shipping.create_ship_notice(
        receipt,
        date="2026-09-01",              # yyyy-mm-dd
        carrier="UPS",
        tracking="1Z999AA10123456784",
        comments="Enviado desde bodega Santiago",
        item="SKU_CAMISETA",            # obligatorio si la orden trae varios ítems físicos
        fillOrder=True,                 # genera los avisos restantes de la misma orden
    )
    marcar_enviado(receipt)
```

Para devoluciones físicas, el reembolso no se completa hasta acusar recibo del producto:

```python
cb.tickets.acknowledge_return(ticket_id)   # 204 sin cuerpo si va bien
```

## 8. Sincronización incremental a base de datos

Arquitectura correcta, no polling:

1. **INS** (ver `ins-webhooks.md`) escribe cada evento en cuanto ocurre. Clave única
   `(receipt, transaction_type, transaction_time)`.
2. **Conciliación diaria** a las 03:00: `quickstats/list` del día anterior y comparación con lo que
   guardó INS. Si hay diferencia, `orders2/list` de ese día para rellenar el hueco.
3. **Backfill histórico**: una sola vez, en rangos mensuales, con el throttling del cliente activo.

```python
from datetime import date
import calendar

for mes in range(1, 9):
    ini = date(2026, mes, 1)
    fin = date(2026, mes, calendar.monthrange(2026, mes)[1])
    for orden in cb.orders.list(start=ini.isoformat(), end=fin.isoformat()):
        upsert(orden)
```

Presupuesto de cuota: 25.000 req/día para **toda** la cuenta. Un backfill de 3 años en rangos
mensuales son ~36 peticiones más las páginas. Un backfill día a día son ~1.100 más páginas: puede
dejar sin API a las demás integraciones del usuario ese día.

## 9. Verificar si una suscripción sigue viva

```python
if cb.orders.is_active("ABC12345"):
    ...   # 204
else:
    ...   # 403: reembolsada, cancelada, inexistente o sin acceso — son indistinguibles
```

`403` aquí **no** significa "sin permiso" necesariamente. Si necesitas distinguir el motivo,
consulta `cb.orders.get(receipt)` y mira el estado real.

## 10. Gestión de suscripciones desde tu backoffice

```python
cb.orders.pause("ABC12345")                                 # pausar
cb.orders.reinstate("ABC12345")                             # reactivar cancelada
cb.orders.extend("ABC12345", periods=2)                     # regalar 2 períodos (retención)
cb.orders.change_product("ABC12345", sku="PLAN_PRO")        # upgrade / downgrade
cb.orders.change_date("ABC12345", date="2026-10-15")        # mover el próximo cobro
cb.orders.change_address("ABC12345", address1="...", city="...", country="CL")
```

`extend` es la herramienta de retención más barata: cuesta margen, no efectivo, y evita el
`RFND` que además penaliza tu ratio de reembolsos ante ClickBank.

Varias de estas operaciones están marcadas **BETA** en la especificación: valida el resultado
leyendo la orden después de escribir, no confíes solo en el `200`.

## 11. Catálogo de productos

```python
for p in cb.products.list():
    print(p.get("sku"), p.get("title"), p.get("productType"))

cb.products.save("PLAN_PRO", title="Plan Pro", ...)   # PUT crea o actualiza
cb.products.remove("PLAN_VIEJO")
```

Los parámetros del `PUT` van **por query string**, no en el cuerpo. Los detalles de precios
(`StandardPricing`, `RecurringPricing`, `PhysicalPricing`) están en `schemas.md`.

## 12. Generar un cliente en otro lenguaje

`assets/open-clickbank.yaml` es una especificación OpenAPI 3.0.1 completa:

```bash
npx @openapitools/openapi-generator-cli generate \
  -i assets/open-clickbank.yaml -g typescript-fetch -o ./src/clickbank

# o Python, Go, PHP, Java, C#…
```

Ajusta después dos cosas que ningún generador acierta solo:
la **paginación por header `Page` + status `206`**, y el **`403` que en realidad es rate limit**.
