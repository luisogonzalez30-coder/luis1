# Todo lo que hay que pagar para que TuMuniAquí siga funcionando

Lista hecha el 26-ago-2026, verificando cada servicio contra producción y contra el
código, no de memoria. Complementa a `PLATAFORMAS.md` (que dice *qué* servicios hay)
respondiendo la otra pregunta: **cuáles de ellos pasan una factura**.

Referencia de conversión: dólar ~$950, UF $40.844,79. Las dos se mueven — rehacer los
pesos antes de usar una cifra en una cotización.

## Lo que entra: qué paga el municipio

**Plan Comuna: 12 UF al mes ≈ $490.000.** Es fijo y no depende de cuántos reportes
haga la gente. Esa asimetría —ingreso fijo, costos variables— es la única razón por la
que esta lista importa.

## Los gastos, ordenados por qué tan seguros son

### 1. Fijos, ya comprometidos

| Gasto | Cuánto | Notas |
|---|---|---|
| **Render Starter** (el bot de WhatsApp y toda la IA) | **US$7/mes ≈ $6.650** | Ya está contratado y pagándose. Verificado en el panel el 26-ago |

Es el único costo fijo del proyecto. Todo lo demás o es gratis o es por uso.

### 2. Por uso — suben con la actividad

| Gasto | Cuánto | Techo |
|---|---|---|
| **Anthropic** (las 5 funciones de IA) | **~US$5,5/mes ≈ $5.200** al volumen de Licantén (100 reportes) | Sí, si `IA_TOPE_USD_MES` está puesta en Render |
| **Meta / WhatsApp Cloud API** | Por mensaje de plantilla. **Tarifa de Chile sin verificar** | No hay tope puesto |

Sobre Anthropic: no hay suscripción ni mínimo. Un mes sin reportes cuesta **cero**. Los
$5,5 son un **techo**, no una estimación central — el bot resuelve gratis los caminos
deterministas (número de ticket, "mis reportes") y la IA solo cubre lo que antes
terminaba en el menú de "no te entendí". El detalle está en `COSTOS-IA.md`.

Sobre Meta: **es el costo variable más viejo del proyecto, anterior a la IA**, y el
único sin techo. Cada reporte genera al menos dos mensajes de plantilla. Que la tarifa
chilena siga sin verificarse es el hueco más grande de esta lista.

### 3. Gratis hoy, y por qué

| Servicio | Plan | Hasta cuándo aguanta |
|---|---|---|
| **Firebase** | Spark (gratis) | 50.000 lecturas de Firestore al día. Las consultas ya están acotadas a propósito (§26) justamente para no llegar ahí |
| **Cloudinary** | Free | 25 GB. Las fotos de los vecinos se comprimen antes de subir |
| **GitHub** | Free | 2.000 minutos de Actions al mes. La vigilancia usa una fracción |
| **OpenStreetMap, Nominatim, ArcGIS** | Público | No pasan factura, pero se pueden caer y la app tiene que aguantarlo |

### 4. Opcionales — no se están pagando y hoy no hacen falta

| Gasto | Cuánto | Para qué |
|---|---|---|
| **Dominio propio `.cl`** | ~$10.000/año | Hoy la app vive en `.web.app`. Es una de las cinco promesas de la propuesta que todavía no se pueden cumplir (§33) |
| **Firebase Blaze** | Sin costo base, pago por uso sobre la cuota gratis | Se necesita **para conectar el dominio propio**, no para la IA. La IA vive en Render, que ya llama APIs externas |
| **OpenAI** (transcribir notas de voz) | ~US$0,003 por audio | **Apagado a propósito.** Antes de encenderlo hay que declarar el proveedor en la política de privacidad (§48.6) |

## El resumen en una línea

Hoy TuMuniAquí cuesta **US$7 fijos al mes más lo que consuman Anthropic y Meta**, contra
un ingreso de ~$490.000. Con el volumen real de Licantén, los costos variables andan por
el 1% del ingreso.

## Lo único que falta comprobar

1. **La tarifa de Meta en Chile.** Es el único gasto sin techo y sin cifra.
2. **Que `IA_TOPE_USD_MES` esté puesta en Render.** Si esa variable no existe, el valor
   por defecto en `ia.js` es `0`, que significa **sin tope**. El tope es lo que hace que
   el gasto de IA tenga techo: al alcanzarlo el bot vuelve solo al menú de botones, que
   es gratis y sigue funcionando. Se revisa en Render → `ProyectoMuni` → Environment.
