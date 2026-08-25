# Cuánto cuesta agregarle IA a TuMuniAquí

Calculado el 25-ago-2026. **Rehacer los números antes de cualquier cotización**: los
precios de Claude son los vigentes a esta fecha, pero la UF, el dólar y la tarifa de
Meta cambian.

Esto existe para no volver a calcularlo desde cero en cada conversación, y para que
la cifra que se le diga a un municipio salga de acá y no de una estimación al vuelo.

## Lo que hay que entender antes de mirar las tablas

**No hay costo fijo nuevo.** Ninguna de las cinco funciones tiene suscripción,
activación ni mínimo mensual. Todo es pago por uso: un mes sin reportes cuesta cero.
Eso importa para el flujo de caja de un negocio que todavía tiene un solo cliente.

**El costo escala con los reportes; al municipio se le cobra fijo.** Ahí está el
único riesgo real de este cambio. El plan Comuna son **12 UF al mes** (valor adoptado
el 19-ago-2026, ver `PROPUESTA-COMERCIAL-NOTAS.md`), o sea **~$490.000** con la UF de
referencia. Si el costo variable creciera sin techo, se comería el margen. Las tablas
de abajo dicen cuánto margen se come de verdad.

## Precios de referencia usados

| Concepto | Valor | Fuente |
|---|---|---|
| Claude Opus 5 | $5,00 entrada / $25,00 salida por millón de tokens | precios vigentes al 25-ago-2026 |
| Claude Haiku 4.5 | $1,00 entrada / $5,00 salida por millón de tokens | ídem |
| UF | $40.844,79 | la misma referencia que usa la propuesta (2-ago-2026) |
| Dólar | ~$950 | **referencial, verificar el día que se ocupe** |
| Plan Comuna | 12 UF/mes ≈ $490.000 | `PROPUESTA-COMERCIAL-NOTAS.md`, precios del 19-ago-2026 |

## Costo por operación (Claude Opus 5)

| Función | Qué consume | Costo unitario |
|---|---|---|
| Clasificar foto + texto | foto ~1.500 tok + las 58 categorías ~1.300 + descripción ~100; salida ~150 | **$0,018 por reporte** |
| Duplicado semántico | ~900 tok entrada, ~60 salida. Solo corre cuando Haversine ya encontró candidatos cerca (~20% de los reportes) | $0,006 por chequeo |
| Bot conversacional | ~4 turnos, ~8.000 tok de entrada acumulada y ~600 de salida | **$0,055 por conversación** |
| Transcribir un audio | ~30 segundos | $0,003 + la clasificación |
| Resumen de Cuenta Pública | datos ya calculados, solo los redacta | $0,05 por informe |

**La transcripción no es de Claude.** La API de Claude acepta imágenes y documentos,
no audio. Esa función necesita un proveedor de transcripción aparte — es la única de
las cinco que suma un tercero nuevo al sistema, con lo que eso implica también para
la política de privacidad (§35.2).

## Los tres escenarios, por municipio y por mes

| | Reportes/mes | Costo IA (Opus 5) | En pesos | % del ingreso |
|---|---|---|---|---|
| **Arranque** — lo realista para Licantén (6.900 hab.) | 100 | $5,5 | ~$5.200 | **1%** |
| **Régimen** — municipio activo | 500 | $27 | ~$25.000 | **5%** |
| **Alto** — sería una ciudad, no Licantén | 2.000 | $106 | ~$100.500 | **20%** |

Desglose del escenario de régimen (500 reportes, 300 conversaciones, 100 audios):

```
Clasificación    500 × $0,018  = $ 9,00
Bot              300 × $0,055  = $16,50   ← dos tercios del total
Duplicados       500 × $0,0012 = $ 0,60
Audios           100 × $0,003  = $ 0,30
Informes           4 × $0,05   = $ 0,20
                                 ------
                                  $26,60
```

Con **Claude Haiku 4.5** los mismos tres escenarios salen **$1,1 / $5,3 / $21**.

**La recomendación es partir con Opus 5** para que la clasificación sea confiable
desde el primer reporte real, medir la precisión con datos de verdad, y recién ahí
evaluar si Haiku la mantiene. Cambiar de modelo es una línea en `ia.js` y es
reversible.

## Corrección a la baja, tras implementarlo (25-ago-2026)

Los escenarios de arriba suponen que **cada conversación** pasa por el modelo. La
implementación quedó más barata que eso: el bot conserva sus caminos deterministas
—un número de ticket y "mis reportes" se siguen respondiendo con el código de
siempre, gratis— y la IA **solo cubre lo que antes terminaba en el menú de "no te
entendí"** (§48.5).

O sea que las cifras de la tabla son un **techo**, no una estimación central. Cuánto
más barato sale de verdad depende de qué proporción de los mensajes son consultas de
ticket, y eso recién se va a saber con vecinos reales usándolo. Conviene medirlo con
el gasto que queda registrado en `configuracion/ia_gasto` antes de ajustar el tope.

## El bot conversacional es la partida que hay que vigilar

Su costo depende de **conversaciones, no de reportes** — un vecino puede escribir diez
veces sin generar ningún reporte. En el escenario alto se lleva dos tercios del total.
Por eso va con dos límites puestos desde el día uno, no como pendiente:

- tope de turnos por conversación con IA (`IA_MAX_TURNOS`, por defecto 6),
- tope de gasto mensual estimado (`IA_TOPE_USD_MES`), al llegar al cual el bot vuelve
  solo al menú de botones de §41.5, que es gratis y sigue funcionando.

Que el bot degrade al menú en vez de caerse es la decisión de diseño que hace que este
costo tenga techo real.

## Lo que NO cuenta como costo de la IA

Dos cosas que se necesitan igual, con IA o sin ella:

- **Render Starter, $7/mes.** Es el pendiente #1 de `RETOMAR-AQUI.md` — hoy el bot
  corre en plan Free, sin SLA, con un municipio dependiendo de él. La IA lo hace más
  urgente (el plan Free duerme a los 15 minutos y la primera respuesta llega lenta),
  pero no lo causa.
- **Firebase Blaze.** No hace falta para nada de esto: la IA vive en el servicio de
  Render, que ya llama APIs externas. Blaze se necesita por el dominio propio, que es
  otro tema.

## Puesta en marcha

**$0 en licencias.** No hay compra inicial ni activación. Lo único que cuesta es
tiempo de desarrollo.

## Dos números que hay que verificar antes de comprometer algo por escrito

1. **La tarifa de Meta por mensaje de utilidad en Chile.** Ya está anotada como
   pendiente #6 en `RETOMAR-AQUI.md`. Cada reporte genera al menos dos mensajes de
   plantilla, y es perfectamente posible que **Meta cueste más que la IA**. Lo bueno:
   las respuestas del bot conversacional van dentro de la ventana de 24 h que abre el
   propio vecino, o sea texto libre sin plantilla — esa parte no suma costo de Meta
   (misma regla que "mis reportes" hoy, §41.1).
2. **El dólar del día.** Acá se usó ~$950 como referencia.
