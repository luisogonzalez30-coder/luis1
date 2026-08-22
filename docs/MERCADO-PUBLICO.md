# Caza de oportunidades en Mercado Público

Integración con la API de ChileCompra para encontrar a quién venderle
TuMuniAqui dentro del Estado, sin revisar mercadopublico.cl a mano todos los
días.

La idea que ordena todo: **no se trata de ganar licitaciones grandes**. Contra
una licitación pública abierta de varios miles de UTM compite una integradora
con departamento de propuestas. Donde un proveedor chico gana es en los canales
de baja competencia: Trato Directo, Compra Ágil y licitaciones de tramo chico
(L1, LE). Los scripts están armados para priorizar eso.

---

## Puesta en marcha (una sola vez)

1. Pedí el ticket gratuito en el formulario **"Solicitud de Ticket"** de
   `api.mercadopublico.cl`. Llega por correo. Cuota: 10.000 peticiones al día.

2. Guardalo en tu `.env` local (ese archivo **no se versiona**):

   ```
   MERCADOPUBLICO_TICKET=tu-ticket-aca
   ```

   Alternativa sin `.env`: `export MERCADOPUBLICO_TICKET=...` en el shell, o
   pasar `--ticket=...` en cada comando.

3. Probá la conexión:

   ```bash
   npm run mp:verificar
   ```

   Tiene que decir `✓ Conectado` y mostrarte cuántas licitaciones activas hay
   hoy. Si dice que la API rechazó el ticket, el ticket venció o está mal
   copiado — no es problema del script.

> La API es lenta y castiga las ráfagas. El cliente espera 1,2 s entre llamadas
> y reintenta con espera creciente.
>
> **Medido en agosto 2026:** devuelve **429 explícito**, no 500 como decía esta
> nota antes, y lo hace de forma masiva — 60 rechazos en los primeros 80
> pedidos. Con la pausa de 1,2 s más el backoff, cada ficha termina costando
> ~7 s reales, no 1,2 s. Por eso `historico --dias=60`, que pedía 1.146 fichas,
> se proyectaba en **~2,4 horas**. Si vas a pedir muchas fichas, subí la pausa
> (`mp:directas` acepta `--pausa=`) en vez de pelearte con el backoff.

---

## Los tres comandos

### `npm run mp:historico` — de dónde salen los leads de verdad

```bash
node scripts/mercado-publico.mjs historico --dias=60 --csv=leads.csv
```

Recorre las **órdenes de compra** de los últimos N días y se queda con las del
rubro. Ahí es donde aparece el Trato Directo, que en el listado de licitaciones
no se ve.

Esto es lo más valioso de toda la integración, y conviene entender por qué: **al
Trato Directo no se postula**. El organismo elige a un proveedor directamente,
casi siempre porque ya lo conoce. Por Ley de Transparencia igual queda
publicado — así que sirve como inteligencia comercial, no como aviso al que
responder. Si la Municipalidad de X compró tres veces "mantención de software de
atención ciudadana" por trato directo en dos meses, eso no es una licitación a
la que llegaste tarde: es un comprador con presupuesto asignado, necesidad
probada y un proveedor actual al que le podés competir en la próxima renovación.

La acción que sale de acá es **llamar a la unidad de compras o al departamento
de informática**, no cotizar.

El comando deja `.cache-mercadopublico.json` con el conteo por organismo. No se
versiona; se regenera. Corré esto una vez por semana.

### `npm run mp:activas` — lo que está abierto hoy

```bash
node scripts/mercado-publico.mjs activas --max=40 --csv=pipeline.csv
```

Baja todas las licitaciones publicadas, filtra por rubro sobre el nombre, y
recién pide la ficha completa de las que pasaron el filtro (pedir la ficha de
todas quemaría la cuota diaria en una corrida).

Usa el caché del histórico para puntuar recurrencia, así que **corré `historico`
antes** — si no, ese criterio queda en cero y te avisa.

### `npm run mp:directas` — solo los canales sin licitación

```bash
node scripts/mp-directas.mjs --dias=30 --csv=directas.csv
node scripts/mp-directas.mjs --dias=30 --incluir-se   # suma los Trato Directo
```

Es `historico` acotado a lo que se compra sin licitar. La diferencia está en
que descarta **antes de gastar peticiones**: el sufijo del código de la orden
ya dice el mecanismo, sin pedir la ficha.

| Sufijo | Qué es |
|---|---|
| `AG` | Compra Ágil — no hay licitación de por medio |
| `CM` | Convenio Marco — se compra del catálogo |
| `SE` | Emitida desde una licitación… **o Trato Directo**, si viene con `CodigoLicitacion` vacío |

Por defecto solo mira las `AG`, que es donde está el volumen y donde la
clasificación es inequívoca. `--incluir-se` agrega las `SE` para pescar los
Trato Directo, a costa de bastantes más peticiones.

### `detalle` — la ficha antes de decidir

```bash
node scripts/mercado-publico.mjs detalle 1509-12-LE26
```

Comprador, unidad, **nombre y correo del contacto**, monto, items con su código
UNSPSC y el plazo. Es lo que necesitás para decidir si vale el esfuerzo de armar
la oferta, y a quién escribirle.

Hay además `inspeccionar <codigo>`, que vuelca el JSON crudo. Sirve si algún
campo sale vacío y hay que confirmar cómo lo llama la API.

---

## Cómo se puntúa

Cuatro criterios, sumando o restando sobre el puntaje de rubro:

| Criterio | Suma | Resta |
|---|---|---|
| **Fit de rubro** | término del núcleo del producto en el nombre o la descripción | términos de la lista de exclusiones descartan la oportunidad entera |
| **Convenio Marco** | el llamado es de Convenio Marco: **+12**, y no se le aplica el castigo de tramo | — |
| **Competencia** | tramo chico (L1, LE, LS, E2, CO): +4 | tramo grande (LP, LQ, LR, H2): −2 |
| **Urgencia** | cierra en ≤3 días: +3 · en ≤7 días: +2 | plazo mayor a 20 días: −1 |
| **Recurrencia** | el organismo ya compró el rubro: +2 · lo compra seguido (3+): +4 | — |
| **Comprador objetivo** | municipalidad, gobierno regional, SUBDERE, SERVIU: +4 | — |
| **UNSPSC** | los items están clasificados en el rubro: +3 | — |

Resultado: **Alto** (≥16), **Medio** (≥10), **Bajo**. Bajo el umbral de 5 ni se
muestra.

Lo de la urgencia parece contraintuitivo pero no lo es: un plazo corto reduce el
universo de competidores que alcanzan a preparar una oferta seria. Un plazo
largo atrae a todo el mundo.

**El Convenio Marco es la excepción al criterio de tramo, y hay que tratarlo
aparte.** La API no lo expone como un tipo propio: el llamado viaja como una
licitación cualquiera — el de agosto 2026 (`2239-2-LR26`, "Convenio Marco
Desarrollo de software") salió como LR. Con la regla de tramo a secas se comía
un −2 y quedaba en **Bajo 8**, al fondo del listado, siendo la oportunidad más
valiosa que había. Pero en un Convenio Marco el tramo no mide competencia:
una vez adjudicado se vende del catálogo sin licitar, que es exactamente el
canal de menor competencia. Detectado por texto y puntuado por lo que es, el
mismo llamado da **Alto 22**.

Contra lo que decía antes este documento, entonces, **el Convenio Marco sí se
ve por la API**. Lo que sigue siendo cierto es que la postulación se prepara
con meses de anticipación: el convenio dura 2-3 años, y si te lo perdés,
esperás hasta la próxima ronda.

**Ruido de área vs. producto.** Los términos marcados `contexto: true` en el
perfil (`aseo y ornato`, `alumbrado publico`, `cuadrillas`…) nombran un
departamento municipal, no un producto. En licitaciones sirven; en órdenes de
compra son una trampa, porque el nombre de la OC es "ASEO Y ORNATO, STOCK DE
POLIETILENO" y el área pega aunque se estén comprando bolsas de basura. Los
comandos que recorren órdenes de compra pasan `exigirProducto: true` y exigen
que además pegue un término de producto. Sin eso, la corrida de agosto 2026
devolvió 196 resultados de los que **solo 28 eran software**.

El script imprime **por qué** puntuó cada oportunidad. Si un puntaje no te
cuadra, esa línea te dice qué criterio lo infló.

---

## Ajustar el filtro

Todo el criterio comercial vive en `scripts/lib/perfilProveedor.mjs`. La lógica
no se toca:

- **`PALABRAS_CLAVE`** — con su peso. Peso 10 = casi seguro es negocio nuestro
  (`reporte de incidencias`, `incidencias urbanas`). Peso 5-6 = adyacente, mismo
  comprador y mismo presupuesto, se puede entrar por ahí (`gobierno digital`,
  `plataforma web`).
- **`EXCLUSIONES`** — sin esto, "adquisición de equipos computacionales" y
  "cableado estructurado" copan el listado y esconden lo vendible.
- **`COMPRADORES_PRIORITARIOS`** — hoy prioriza municipios, que es a quién le
  vende el producto.
- **`REGIONES`** — vacío es todo Chile. Poné `['maule', 'ohiggins']` para
  acotar.
- **`PUNTAJE_MINIMO`** — subilo si el listado sale muy largo.

Después de tocar el perfil, corré `activas` de nuevo: no gasta cuota extra por
oportunidad ya vista, vuelve a pedir las fichas.

---

## Lo que esto NO cubre

**Compra Ágil en tiempo real.** Las compras ágiles publicadas y todavía abiertas
a cotización se ven en el buscador dedicado de Compra Ágil del escritorio de
proveedor. Por la API se ven cuando ya se emitió la orden de compra — o sea,
tarde para cotizar, pero a tiempo para el análisis de recurrencia. Tope: 100
UTM. Rota rápido: hay que mirarlo cada pocos días.

**Postular por vos.** Ningún script puede. La API es de solo lectura
(`/servicios/v1/publico/`, todo `GET`): no existe endpoint para enviar una
oferta. Ofertar es siempre desde el escritorio de proveedor, con login, y es un
acto comercial vinculante. Al Trato Directo, además, no se postula por diseño:
el organismo elige y publica después. Lo automatizable llega hasta detectar,
puntuar y dejar el borrador; el envío es humano.

**Requisitos de la cuenta.** Para ofertar en Compra Ágil y ser visible en
Convenio Marco hace falta estar **hábil** en ChileProveedores y con los **rubros
actualizados** en "Administración → Administrar rubros" del escritorio de
proveedor. Rubro desactualizado = invisible para esos dos canales, por mucho que
el script encuentre la oportunidad.
