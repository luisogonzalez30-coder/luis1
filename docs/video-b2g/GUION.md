# Guion del video de demostración

El texto que se narra en `demo-tumuniaqui-v2.mp4`, con los tiempos reales de la animación
que ya está armada. Sirve para dos cosas: leerlo al grabar tu propia voz encima del video,
o cambiarlo y volver a generar todo.

**Duración total: 1 minuto 25 segundos.** Nueve bloques, uno por escena.

---

## Cómo grabarlo con tu voz

1. Abre el video y ponlo en pantalla, sin audio.
2. Graba tu voz leyendo los bloques en orden, respetando el segundo de entrada de cada uno
   (la columna "Entra"). No hace falta ser exacto al décimo: si te atrasas o adelantas un
   segundo, no se nota.
3. Deja **una pausa de un segundo entre bloque y bloque**. Es lo que hace que suene
   institucional y no apurado.
4. Junta voz y video en CapCut: pones el video, encima tu audio, y alineas el primer
   "Hoy" con el segundo 1.

Tono: formal pero cercano, como explicándoselo a un alcalde sentado al frente. Sin
entusiasmo de comercial. Las frases cortas del final (bloques 8 y 9) van más lentas.

---

## El guion

### Bloque 1 · Entra en 0:01 · dura 14 s
**En pantalla**: fondo negro, aparecen "Un bache.", "Una luminaria apagada.", "Un basural."
y caen papeles.

> Hoy, cuando un vecino quiere reportar un bache o una luminaria apagada, tiene que llamar
> por teléfono o ir hasta el municipio. Y ese reclamo, muchas veces, se pierde.

---

### Bloque 2 · Entra en 0:15 · dura 2 s
**En pantalla**: el logo de TuMuniAquí aparece con una onda.

> TuMuniAquí cambia eso.

*(Al generarlo por computador se escribe "Tu Muni Aquí" separado, para que lo pronuncie
bien. Leyéndolo tú, va normal.)*

---

### Bloque 3 · Entra en 0:18 · dura 13 s
**En pantalla**: el mapa se dibuja, cae el pin, aparecen las tarjetas de ubicación y foto.

> El vecino marca el lugar en el mapa, describe el problema y toma una foto. Treinta
> segundos, desde su celular, sin instalar ninguna aplicación y sin crear una cuenta.

---

### Bloque 4 · Entra en 0:32 · dura 7 s
**En pantalla**: "¿Sin señal? Igual funciona." La barra de envío corre al recuperar la
conexión.

> Y si no hay señal, el reporte queda guardado y se envía solo cuando vuelve la conexión.

---

### Bloque 5 · Entra en 0:40 · dura 11 s
**En pantalla**: la conversación de WhatsApp, con el indicador de "escribiendo" antes de
cada mensaje.

> Al instante recibe un aviso por WhatsApp con el número de su reporte. Y otro cuando queda
> resuelto, sin que nadie en la municipalidad tenga que hacer nada.

---

### Bloque 6 · Entra en 0:52 · dura 9 s
**En pantalla**: el flujo de tres pasos se ilumina, con las etiquetas "Alta" y "Obras".

> Mientras tanto, el sistema calcula la gravedad del reporte y lo deriva automáticamente al
> departamento que corresponde.

---

### Bloque 7 · Entra en 1:02 · dura 10 s
**En pantalla**: el panel del alcalde, con los números contando hacia arriba y las barras
llenándose.

> Y esto es lo que ve el alcalde. Cuántos reportes hay pendientes. Qué sectores concentran
> los problemas. Y cuánto se está gastando de verdad.

---

### Bloque 8 · Entra en 1:13 · dura 5 s
**En pantalla**: fondo negro, las dos frases en grande.

> No es una aplicación para vecinos. Es su panel de control.

**Esta es la frase que vende.** Va más lenta que el resto, con una pausa marcada después
de "vecinos".

---

### Bloque 9 · Entra en 1:18 · dura 4 s
**En pantalla**: cierre azul con el logo, la llamada a la acción y el correo.

> TuMuniAquí. Un producto de LOG-In Soluciones Integrales.

---

## Lo que este guion evita decir, a propósito

Sigue la misma regla que `docs/PAUTA-REUNION-ALCALDE.md`: **no se promete nada que no esté
funcionando.** En concreto, no aparece la alerta de emergencia al WhatsApp del Alcalde ni
el aviso de "cuadrilla asignada" — están diseñados pero no implementados. Tampoco nombra a
la municipalidad cliente ni ofrece nada gratis.

Lo que sí afirma está verificado: los dos avisos por WhatsApp al vecino (cuando entra el
reporte y cuando se resuelve) salen en producción, y el modo sin conexión existe
(`src/utils/colaOffline.js`, §10 de `ESTADO_PROYECTO.md`).

Un detalle del bloque 4: el reporte se guarda sin conexión, **pero la foto no**. El guion
dice "el reporte queda guardado", que es cierto, sin entrar en la excepción. Si alguien
pregunta en una reunión, la respuesta honesta es que la foto hay que volver a adjuntarla.

---

## Si cambias el texto

Está también en `hacer_voz.py`, en la lista `BLOQUES`. Cambias ahí, corres el script y te
devuelve la voz nueva más los tiempos de cada bloque en `tiempos.json`. Esos tiempos van a
la constante `TL` de `fuente-animacion.html`, y recién ahí se vuelve a grabar. El orden es
siempre ese: **la animación se calza a la voz, no al revés.**
