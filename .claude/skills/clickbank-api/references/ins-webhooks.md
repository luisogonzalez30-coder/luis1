# Instant Notification Service (INS) — webhooks de ClickBank

La API REST es *pull*. INS es *push*: ClickBank envía un `POST` a tu URL cada vez que ocurre un evento
(venta, rebill, reembolso, chargeback, cancelación, carrito abandonado). Es la forma correcta de
mantener datos en tiempo real **sin quemar la cuota diaria de 25.000 peticiones**.

## 1. Configuración

```
Account Settings → My Site → Advanced Tools → Instant Notification URL
```

- **URL**: debe ser HTTPS y responder rápido (`200`) o ClickBank reintenta.
- **Secret Key**: hasta 16 caracteres alfanuméricos. Es la clave de cifrado. Guárdala como secreto de entorno.
- **Versión**: usa **6.0 o superior**. Las versiones anteriores **no cifran** el payload y viajan en texto claro.
  Carrito abandonado (`ABANDONED_ORDER`) solo existe desde 6.0.

## 2. Formato del `POST`

Cuerpo JSON con dos campos, ambos en base64:

```json
{
  "notification": "<payload cifrado en base64>",
  "iv": "<vector de inicialización en base64>"
}
```

## 3. Descifrado

Algoritmo: **AES-256-CBC**.
Clave: los **primeros 32 caracteres del SHA-1 hexadecimal** de tu secret key, usados como bytes ASCII
(32 caracteres = 32 bytes = AES-256). No es el digest binario.

El descifrado correcto **es** la autenticación: si el payload se descifra y produce JSON válido, el
mensaje viene de ClickBank y no fue alterado. No hace falta comparar firmas aparte.

### Node.js (18+)

```js
import crypto from 'node:crypto';

export function decryptIns(body, secretKey) {
  const key = crypto.createHash('sha1').update(secretKey).digest('hex').slice(0, 32);
  const iv = Buffer.from(body.iv, 'base64');
  const payload = Buffer.from(body.notification, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'utf8'), iv);
  decipher.setAutoPadding(false);                       // el relleno se limpia a mano
  let out = Buffer.concat([decipher.update(payload), decipher.final()]).toString('utf8');

  out = out.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]+$/g, '').trim();
  out = out.slice(0, out.lastIndexOf('}') + 1);         // descarta relleno PKCS7 residual
  return JSON.parse(out);
}
```

### Python

```python
import base64, hashlib, json
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

def decrypt_ins(body: dict, secret_key: str) -> dict:
    key = hashlib.sha1(secret_key.encode()).hexdigest()[:32].encode()
    iv = base64.b64decode(body["iv"])
    payload = base64.b64decode(body["notification"])

    dec = Cipher(algorithms.AES(key), modes.CBC(iv)).decryptor()
    raw = dec.update(payload) + dec.finalize()

    text = raw.decode("utf-8", errors="ignore")
    text = text[: text.rfind("}") + 1]          # elimina relleno PKCS7 / nulos
    return json.loads(text)
```

### PHP

```php
$body   = json_decode(file_get_contents('php://input'), true);
$key    = substr(sha1($secretKey), 0, 32);
$plain  = openssl_decrypt(
    base64_decode($body['notification']), 'AES-256-CBC', $key,
    OPENSSL_RAW_DATA, base64_decode($body['iv'])
);
$data = json_decode(trim($plain, "\0"), true);
```

## 4. Estructura del payload descifrado

```jsonc
{
  "transactionTime": "2026-09-01T14:05:00-06:00",
  "receipt": "ABC12345",
  "transactionType": "SALE",
  "vendor": "minicuenta",
  "affiliate": "afiliado01",
  "role": "VENDOR",
  "totalAccountAmount": 47.00,
  "paymentMethod": "VISA",
  "totalOrderAmount": 59.00,
  "totalTaxAmount": 0.00,
  "totalShippingAmount": 0.00,
  "currency": "USD",
  "orderLanguage": "ES",
  "trackingCodes": ["tiktok_ago"],
  "declinedConsent": false,
  "version": 6.0,
  "attemptCount": 1,
  "lineItems": [ /* ... */ ],
  "customer": { "billing": { /* ... */ }, "shipping": { /* ... */ } },
  "upsell": { "upsellOriginalReceipt": "…", "upsellFlowId": 3, "upsellSession": "…", "upsellPath": "…" },
  "vendorVariables": { "v1": "…", "v2": "…" }
}
```

### Campos raíz

| Campo | Tipo | Nota |
|---|---|---|
| `transactionTime` | fecha-hora | Zona horaria de la cuenta, no UTC |
| `receipt` | string | Clave natural del evento. Úsala para idempotencia |
| `transactionType` | enum | Ver tabla siguiente |
| `vendor` | string | Nickname del vendedor |
| `affiliate` | string? | Nickname del afiliado que originó la venta |
| `role` | enum | `VENDOR` o `AFFILIATE`: **desde qué rol te llega** la notificación |
| `totalAccountAmount` | decimal | Lo que te toca **a ti** según tu rol |
| `totalOrderAmount` | decimal | Total pagado por el cliente |
| `totalTaxAmount`, `totalShippingAmount` | decimal | Impuestos y envío |
| `currency` | ISO 4217 | La del cliente, no necesariamente USD |
| `orderLanguage` | enum | `DE`, `EN`, `ES`, `FR`, `IT`, `PT` |
| `trackingCodes` | array&lt;string&gt; | Los TID que pasaste en el hoplink |
| `declinedConsent` | bool | El cliente rechazó consentimiento de marketing → **no lo agregues a listas** |
| `version` | decimal | Versión del INS |
| `attemptCount` | int | Nº de intento de entrega. `> 1` = tu endpoint falló antes |
| `vendorVariables` | objeto | `v1`…`v9`, los parámetros que enviaste en el pay link |

### `lineItems[]`

| Campo | Nota |
|---|---|
| `itemNo` | SKU / número de ítem del producto |
| `productTitle` | Título del producto |
| `productPrice`, `productDiscount` | Precio y descuento aplicado |
| `jvPayout`, `affiliatePayout` | Reparto de comisiones |
| `taxAmount`, `shippingAmount`, `shippingLiable` | Impuestos, envío y quién lo asume |
| `shippable` | `true` = bien físico → dispara flujo de Shipping / Ship Notice |
| `recurring` | `true` = suscripción → habrá `BILL` recurrentes |
| `accountAmount` | Lo que te toca de esta línea |
| `quantity` | Unidades |
| `downloadUrl` | URL de entrega del digital |
| `lineItemType` | Tipo de línea |

### `customer.billing` / `customer.shipping`

`firstName`, `lastName`, `fullName`, `email`, `phoneNumber` y `address` con
`address1`, `address2`, `city`, `county`, `state`, `postalCode`, `country`.

## 5. `transactionType` — todos los valores

| Valor | Qué pasó | Efecto en ingresos |
|---|---|---|
| `SALE` | Venta inicial | + |
| `BILL` | Rebill de una suscripción | + |
| `RFND` | Reembolso | − |
| `CGBK` | Chargeback (contracargo) | − y penaliza tu ratio |
| `INSF` | Fondos insuficientes en el rebill | 0, reintento pendiente |
| `CANCEL-REBILL` | Suscripción cancelada | Fin de ingresos futuros |
| `UNCANCEL-REBILL` | Cancelación revertida | Reactivación |
| `SUBSCRIPTION-CHG` | Cambio de plan/producto de la suscripción | Ajusta MRR |
| `ABANDONED_ORDER` | Carrito abandonado (v6.0+) | 0 — **oro para remarketing** |
| `CUSTOMER_AUTH_FAILURE` | Falló la autenticación del cliente | 0 |
| `CUSTOMER_EMAIL_UPDATE` | El cliente cambió su email | Sincroniza tu CRM |
| `CUSTOMER_UPDATE_CC_NOTIFICATION` | Aviso de actualización de tarjeta | Riesgo de churn involuntario |
| `PURCHASE_DETAILS_EMAIL_RESPONSE` | Respuesta al email de detalles de compra | 0 |
| `TEST`, `TEST_SALE`, `TEST_BILL`, `TEST_RFND`, `CANCEL-TEST-REBILL`, `UNCANCEL-TEST-REBILL` | Eventos de prueba | **Fíltralos de los reportes** |

## 6. Receptor robusto — reglas

1. **Responde `200` en menos de 5 s.** Encola y procesa después; si tardas, ClickBank reintenta y `attemptCount` sube.
2. **Idempotencia por `(receipt, transactionType, transactionTime)`.** Los reintentos llegan duplicados: un `INSERT` sin clave única duplica ingresos.
3. **Descarta los `TEST_*`** antes de escribir en la base de datos de producción, o márcalos con una bandera.
4. **Un fallo de descifrado es un `400`, no un `500`.** Si no descifra, el mensaje no es de ClickBank: registra la IP y descarta.
5. **Nunca registres el payload descifrado completo en logs**: lleva nombre, email, dirección y teléfono del cliente.
6. **Respeta `declinedConsent: true`**: ese contacto no entra a listas de marketing.
7. **Concilia contra la API una vez al día.** INS puede perder un evento; `quickstats/list` u `orders2/list` del día anterior detecta el hueco.

## 7. INS + API: quién hace qué

| Necesidad | Herramienta |
|---|---|
| Reaccionar al instante a una venta/reembolso | **INS** |
| Reconstruir historial o backfill | **API** (`orders2/list`, `quickstats/list`) |
| Datos que INS no trae (detalle de suscripción, tendencias, EPC por afiliado) | **API** (`analytics`) |
| Auditar que no falte ningún evento | **Ambas**: conciliación diaria |
