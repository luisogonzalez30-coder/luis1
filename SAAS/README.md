# Radar de Licitaciones

SaaS para que una pyme chilena encuentre en qué compras del Estado puede
vender, sin revisar mercadopublico.cl a mano todos los días.

> **Esto no es TuMuniAquí.** Está en este repositorio porque acá se pidió y
> porque acá vive el conocimiento verificado de la API de ChileCompra
> (`docs/MERCADO-PUBLICO.md`, rama `claude/mercado-publico-verification-vrgedr`),
> pero es un producto distinto, con otro cliente y otro modelo de negocio.
> `CLAUDE.md` es explícito en que este repositorio es solo TuMuniAquí.
> **Conviene moverlo a su propio repositorio antes de que crezca**; mientras
> tanto vive acá, aislado en esta carpeta, sin tocar nada del resto.

---

## Qué hay hecho y qué no

| | Estado |
|---|---|
| Esquema completo en PostgreSQL (4 tablas + 2 de apoyo) | ✅ escrito y **probado contra PostgreSQL 16 real** |
| `pg_trgm`, índices GIN, RLS | ✅ probado con usuarios y sesiones reales |
| Motor de alertas (`oportunidades_de`) | ✅ probado sobre 50.000 licitaciones |
| Ingesta fase 1 y fase 2 (TypeScript) | ✅ escrita, con pruebas unitarias verdes |
| Ingesta contra la API real | ⛔ **sin verificar**: hace falta un ticket, y estas sesiones no alcanzan `api.mercadopublico.cl` |
| Frontend Next.js | ⛔ solo la estructura de carpetas (`docs/ESTRUCTURA.md`) |
| Semáforo con datos de pago reales | ⛔ **la API no expone fechas de pago** — ver abajo |

---

## Puesta en marcha

```bash
# 1. Base de datos
supabase db push          # o pegar los .sql en el SQL Editor, en orden

# 2. Variables
cp .env.example .env      # rellenar; el ticket se pide gratis en api.mercadopublico.cl

# 3. Pruebas (no necesitan ni ticket ni base)
npm run prueba

# 4. Ingesta
npm run ingesta:dia       # fase 1: listado del día, 1 petición
npm run ingesta:fichas    # fase 2: fichas de lo que le pega a alguna alerta
```

Las migraciones van **en orden** — `0001` crea las tablas, `0002` las
coincidencias, `0003` la cola de la fase 2.

---

## Las tres cosas que hay que entender antes de tocar el código

### 1. La API no sirve para alertar de Compra Ágil en tiempo real

Tu brief dice que el endpoint del listado diario devuelve *"todas las
licitaciones y Compras Ágiles publicadas en un día"*. La primera mitad es
cierta; **la segunda no**, y cambia lo que se le puede prometer al cliente.

Por la API, una Compra Ágil aparece cuando ya se emitió la orden de compra —
es decir, cuando ya se la ganó otro. Las compras ágiles **abiertas a
cotización** solo se ven en el buscador dedicado del escritorio de proveedor,
que no tiene endpoint público. Así que el producto puede:

- alertar de **licitaciones** abiertas: sí, es el caso principal;
- alertar de **Compra Ágil** abierta: no, no con esta API;
- usar las compras ágiles ya emitidas como **inteligencia comercial** (qué
  organismo compra tu rubro sin licitar, y con qué frecuencia): sí, y es
  probablemente lo más vendible que hay acá — a un Trato Directo no se
  postula, pero un organismo que compró tu rubro tres veces en dos meses es
  un comprador con presupuesto y necesidad probada al que se le puede llamar.

Vale decirlo en la landing antes de que lo descubra el primer cliente que
pagó por "alertas de Compra Ágil".

### 2. El semáforo financiero necesita una fuente que la API no da

`licitaciones.json` y `ordenesdecompra.json` traen cuándo se **emitió** y
cuándo se **aceptó** una orden. No traen cuándo se **pagó**. No hay forma de
calcular días de pago solo con esta API.

Por eso `historial_compradores` tiene una columna `fuente` y el semáforo
arranca en **gris** (`sin_datos`) hasta tener al menos 5 órdenes evaluadas.
Un verde por omisión sería inventarle solvencia a un organismo, que es
exactamente el error que el producto promete evitar.

Las fuentes reales, en orden de esfuerzo:

1. **`reporte_usuario`** — los propios proveedores declaran cuánto tardaron en
   cobrarle a cada organismo. Es lo más caro de conseguir y lo único
   defendible como diferencial: con volumen se vuelve un dato que ningún
   competidor puede copiar.
2. **`dipres`** — informes trimestrales de deuda del Estado a proveedores.
3. **`chilecompra`** — reportes de plazo de pago de la DCCP.
4. **`api_oc`** — días entre emisión y aceptación de la orden. Mide burocracia
   interna, no pago. Sirve de señal, nunca de veredicto.

El semáforo se calcula solo, en una columna generada, contra el plazo legal de
30 días de la Ley 21.131: verde ≤30 días, amarillo ≤60, rojo >60 o con más de
la mitad de los pagos fuera de plazo.

### 3. La cuota es la restricción que ordena todo el backend

10.000 peticiones al día por ticket, y la API responde **429 en ráfaga**
(medido: 60 rechazos en los primeros 80 pedidos). Con la pausa de 1,2 s más el
backoff, **cada ficha completa cuesta ~7 segundos reales**.

De ahí la ingesta en dos fases:

- **Fase 1** (`ingestar-dia.ts`): 1 petición trae el listado del día completo,
  con nombre, código, estado y cierre. Barato.
- **Fase 2** (`enriquecer-fichas.ts`): 1 petición **por licitación** para la
  ficha con organismo, monto e ítems. Caro, así que solo se piden las que le
  pegan a alguna preferencia activa de algún usuario.

Medido en la base de prueba: de 45.000 licitaciones abiertas, la cola de
fase 2 seleccionó **2.500**. Un 94% de peticiones ahorradas, y ese 94% es la
diferencia entre un producto que funciona y uno que se queda sin cuota a
media mañana.

---

## Cómo se probó

No es una revisión de código: el esquema se ejecutó contra un PostgreSQL 16
real, con un simulacro del esquema `auth` y los roles de Supabase.

| Prueba | Resultado |
|---|---|
| Migración aplicada dos veces seguidas | idempotente, sin errores |
| RUT con módulo 11 | la base rechaza un DV inválido |
| Semáforo generado | verde/amarillo/rojo/gris según mediana y muestras |
| Preferencia sin ningún criterio | rechazada por CHECK (mandaría el diario entero) |
| Tope de perfiles por plan | bloqueado, con bloqueo de fila contra carreras |
| RLS: usuario 2 leyendo datos del usuario 1 | 0 filas |
| RLS: usuario 2 llamando al motor con un perfil ajeno | 0 filas |
| RLS: usuario escribiendo en `licitaciones_cache` | denegado |
| RLS: suscripción cancelada | pierde el acceso al caché |
| RLS: visitante `anon` | sin permiso siquiera de intentarlo |
| Índice de trigramas, término selectivo, 50.000 filas | Bitmap Index Scan, 2,5 ms |
| Motor con preferencia estrecha | ~110 ms |
| Motor con preferencia amplia (13.214 coincidencias) | ~3.200 ms → por eso existe `0002` |
| Lectura del tablero desde `coincidencias` | 0,13 ms |
| Zona horaria: verano (UTC−3) e invierno (UTC−4) | correcta en ambos |
| Mapeo: monto ausente | `null`, nunca `0` |

Tres bugs salieron de correr las pruebas, no de leer el código:

1. **`similarity()` en vez de `word_similarity()`.** Comparaba las cadenas
   enteras, así que una palabra clave corta contra una descripción larga daba
   ~0.06 y el match difuso **no disparaba nunca**. Con `word_similarity` el
   mismo caso da 0.85.
2. **El filtro de texto estaba en el `WHERE` exterior**, fuera del escaneo, así
   que el índice GIN no se alcanzaba. Y `%> ANY(array)` tampoco lo usa —GIN no
   soporta `ScalarArrayOpExpr` para ese operador—: 1.776 ms contra 157 ms. Se
   resolvió con un `LATERAL` por palabra clave.
3. **El filtro por región usaba la región de la licitación y la pantalla
   mostraba la del organismo.** El usuario filtraba por una cosa y veía otra;
   filtrar por "Maule" devolvía 0 resultados mientras la lista sin filtro
   mostraba "Maule" en todas las filas.

---

## Lo que falta

- **Verificar la ingesta contra la API real.** Todo el mapeo (`mapear.ts`)
  está escrito contra la forma documentada de la respuesta, y las pruebas usan
  fixtures escritos a mano. Los nombres exactos de los campos de la ficha
  —`Comprador.RegionUnidad`, `Items.Listado[].CodigoProducto`, `Fechas.*`—
  hay que confirmarlos con una respuesta de verdad. Se hace con
  `npm run ingesta:dia` y un ticket.
- **El frontend.** Solo está la estructura.
- **El despachador de correos** (`ingesta/despachar-alertas.ts`): la función
  `materializar_coincidencias` ya deja la cola lista en
  `coincidencias.notificada_en IS NULL`; falta el proceso que la vacía.
- **Los planes.** `usuarios.max_preferencias` existe y se aplica, pero nada lo
  sube al cambiar de plan: eso lo tiene que escribir el webhook de pagos.
