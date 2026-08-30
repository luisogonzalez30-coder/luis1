# Instrucciones para Claude — SAAS de licitaciones

**Este NO es TuMuniAquí.** Si vienes de leer el `CLAUDE.md` de la raíz, olvida el
contexto de municipalidades: acá el cliente es otro, el producto es otro y no hay
ningún municipio en producción esperando.

## Qué es esto

SaaS para que una **pyme chilena proveedora del Estado** encuentre a qué compras
públicas puede postular, sin revisar mercadopublico.cl a mano todos los días.

| | TuMuniAquí (raíz del repo) | Esto (`SAAS/`) |
|---|---|---|
| Cliente | municipalidades | pymes proveedoras |
| Quién paga | el municipio | la pyme |
| Estado | **en producción**, Licantén depende de él | sin publicar, sin usuarios |
| Stack | React + Vite + Firebase | Next.js + Supabase (PostgreSQL) |
| Con Mercado Público | vende **a** municipios por ahí | **es** el producto |

Lo único que comparten es el conocimiento de la API de ChileCompra, que está
verificado en `../docs/MERCADO-PUBLICO.md` y en la rama
`claude/mercado-publico-verification-vrgedr`. Vale la pena leerlo antes de tocar
la ingesta: son cosas medidas contra la API real, no supuestos.

**Nada de este proyecto puede tocar archivos fuera de `SAAS/`.** Si una tarea
parece necesitarlo, es señal de que se está mezclando lo que no se debe mezclar.

## Orden de lectura

1. **`README.md`** de esta carpeta, entero. Es corto y dice qué está hecho, qué
   está solo escrito y qué está sin verificar.
2. **`docs/ESTRUCTURA.md`** — la estructura de Next.js y las cuatro decisiones
   que la explican.
3. **`pruebas/LEEME.md`** — cómo levantar un PostgreSQL local para probar el
   esquema sin Supabase. Correr esas pruebas antes de dar nada por bueno.

Las migraciones se aplican **en orden**: `0001` las tablas, `0002` las
coincidencias, `0003` la cola de enriquecimiento.

## Tres cosas que ya se decidieron y no conviene volver a discutir

**La API no permite alertar de Compra Ágil abierta.** Aparece cuando ya se emitió
la orden de compra, o sea cuando ya la ganó otro. Sirve como inteligencia
comercial, no como aviso al que responder. No prometerlo en la landing.

**La API no expone fechas de pago**, así que el semáforo financiero no se calcula
solo con ella. Por eso `historial_compradores` tiene columna `fuente` y arranca en
gris. Un verde por omisión sería inventarle solvencia a un organismo.

**La cuota manda sobre el diseño del backend**: 10.000 peticiones al día y 429 en
ráfaga, ~7 s reales por ficha. De ahí la ingesta en dos fases. Cualquier cambio
que pida más fichas por corrida tiene que justificar de dónde sale la cuota.

## Reglas de trabajo

- **Escribir en español**, directo, explicando el porqué. Nada de "¡Listo! 🎉".
- **Probar antes de decir que funciona.** `npm run prueba` corre las pruebas de
  TypeScript sin necesitar base ni ticket; para el esquema, `pruebas/LEEME.md`.
- **No inventar valores por omisión.** Un monto que no vino es `null`, no `0`;
  una fecha ilegible es `null`, no la de hoy. Un cero inventado se ve idéntico a
  un dato real y arruina cualquier filtro.
- **El ticket de la API y la `SERVICE_ROLE_KEY` nunca cruzan al navegador**, ni
  en un log, ni en una variable `NEXT_PUBLIC_*`. Por eso `ingesta/` vive fuera
  de `app/`.
- **Dejar escrito en el README lo que quedó a medias.** Cada conversación arranca
  en un contenedor nuevo y no ve las otras.

## Lo que falta (al 30-ago-2026)

1. **Verificar la ingesta contra la API real.** Es lo único bloqueante. Todo el
   mapeo está escrito contra la forma *documentada* de la respuesta, con datos de
   prueba a mano. Hace falta un ticket (gratis, formulario "Solicitud de Ticket"
   en `api.mercadopublico.cl`) y una corrida de `npm run ingesta:dia`.
2. **El frontend.** Solo existe la estructura de carpetas.
3. **El despachador de correos.** La cola queda armada en
   `coincidencias.notificada_en IS NULL`; falta el proceso que la vacía.
4. **Los planes.** `usuarios.max_preferencias` se aplica pero nada lo sube al
   cambiar de plan: eso lo escribe el webhook de pagos.

## Un muro conocido

La política de red de estos contenedores **bloquea `api.mercadopublico.cl`**, así
que desde una sesión no se puede probar la ingesta contra la API real aunque haya
ticket. Cómo se levanta está en el `CLAUDE.md` de la raíz, sección "Un muro
conocido"; el dominio ya está en la lista que hay que autorizar.
