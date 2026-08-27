# Contenido de redes sociales para vender TuMuniAquí a otros municipios

Esto es distinto de `docs/KIT-DIFUSION.md`: ese kit es para que **Licantén** se lo
publique a sus vecinos. Este documento es para la cuenta de **TuMuniAquí como
producto**, con un solo objetivo: que otro alcalde o su equipo lo vea y pida una
reunión. La audiencia no es un vecino con un bache, es alguien que decide compras
municipales.

## El problema real: no es un producto "bonito de mostrar"

TuMuniAquí no es una app de consumo con una interfaz vistosa para lucir en un
video — es una herramienta de gestión. Nadie hace scroll y se detiene por un
dashboard de presupuesto. Lo que sí detiene el scroll es **el momento que ya
está probado en la reunión presencial**: el vecino reporta y el aviso de
WhatsApp llega en segundos, delante de la persona que mira. Es un truco viejo de
demos de software (mostrar la reacción en tiempo real, no la interfaz) y ya
sabes que funciona, porque convenció al Alcalde de Licantén en vivo (Minuto 3-5
de `docs/PAUTA-REUNION-ALCALDE.md`). El contenido de RRSS es lo mismo, grabado.

## No hace falta salir en cámara

Todo el contenido de este documento se graba con **captura de pantalla del
celular**, no con la cara. Eso resuelve dos de tus tres dudas a la vez:

- **iPhone**: Centro de Control → botón de grabar pantalla (si no está, se
  agrega en Ajustes → Centro de Control).
- **Android**: deslizar desde arriba → "Grabar pantalla" en los ajustes rápidos.
- Edición: **CapCut** (gratis, iOS/Android/PC) para cortar, poner texto en
  pantalla y música. No hace falta nada más sofisticado.

La única vez que conviene una cara es el testimonio del Alcalde de Licantén, y
esa cara es la de él, no la tuya — ver el punto 4 más abajo.

## Regla de datos: grabar siempre sobre el tenant demo

Nunca grabes sobre la cuenta real de Licantén para contenido público. El tenant
demo (login con tu correo personal) ya está preparado exactamente para esto:
100 reportes, sin RUT ni teléfonos de vecinos reales (§43.1/§43.2 de
`ESTADO_PROYECTO.md`), y dice "(demostración)" en el título — para redes eso no
importa, nadie fuera del municipio necesita saber que es un dato real. Usar el
demo evita que un reporte real de un vecino de Licantén quede circulando en un
video de LinkedIn.

## Los cuatro contenidos que puedes grabar esta semana

### 1. El hook — "3 preguntas que ningún alcalde puede responder hoy"
**Formato**: video vertical, 20-25 seg. Sin pantalla todavía, solo texto grande
sobre fondo simple (o tú hablando si te acostumbras a cámara — es opcional).

> Texto en pantalla, uno por uno:
> "¿Cuántos reclamos entraron el mes pasado?"
> "¿Cuánto se gastó este año en baches?"
> "¿Cuál es el sector más desatendido de la comuna?"
> "Si su municipio no puede responder esto en la pantalla del celular, siga
> viendo."

Es literalmente el Minuto 0-3 de la pauta de reunión, que ya está probado.
Sirve como gancho para LinkedIn y como primer segundo de cualquier reel.

### 2. La demo — el momento que convenció al Alcalde real
**Formato**: video vertical, 30-40 seg, pantalla capturada (split o corte entre
dos capturas: el formulario y WhatsApp).

Guion:
1. (0-8s) Pantalla del formulario ciudadano, dedo marcando un punto en el mapa
   y tomando "una foto" (usa una tuya, no de un vecino real). Texto: "30
   segundos. Sin instalar nada, sin crear cuenta."
2. (8-15s) Corte a WhatsApp: llega el mensaje con el número de ticket. Texto:
   "Y esto le llega solo, sin que nadie en la municipalidad haga nada."
3. (15-30s) Corte al panel (demo): aparece el reporte con la foto. Texto: "Y
   esto es lo que ve el alcalde. No es una app para vecinos — es su panel de
   control."
4. Cierre con logo/texto: "TuMuniAquí — [tu contacto o dirección]"

Esto es exactamente lo que ya filmas en cada reunión presencial (Minuto 3-8).
La diferencia es que aquí queda grabado una vez y sirve para todos los alcaldes
que todavía no has visitado.

### 3. El caso real — "ya lo usa un municipio"
**Formato**: carrusel de LinkedIn/Facebook (7 imágenes) o video de 20 seg.

**Ya armado**: `docs/carrusel-b2g/slide1.png` a `slide7.png`, 1080x1080, listo para subir
directo, con la paleta real del código (`src/utils/tema.js` / `src/index.css`: azul
`#1D4ED8`/`#1E3A8A`, grises zinc, colores de estado), sin nombrar la municipalidad
cliente y sin ofrecer nada gratis. `slide3.png` (panel del alcalde) es una maqueta
ilustrativa, no una captura real — lo dice el pie de foto chico; si prefieres una
captura real, te toca tomarla tú desde el tenant demo (desde estas sesiones no se puede
abrir el sitio en producción, es el muro de red descrito en `CLAUDE.md`).

Esto es lo más fuerte que tienes y todavía no lo usas: **tienes un cliente real,
no un prototipo** — sin necesidad de nombrarlo para que pese. El contenido:

1. Portada: "Ya está funcionando en un municipio real" (Región del Maule, sin nombrar la
   comuna) + marca TuMuniAquí + "Un producto de LOG-In Soluciones Integrales SpA".
2. **Qué es TuMuniAquí, en una frase**: los tres pasos del sistema completo (el vecino
   reporta → se clasifica solo por gravedad y departamento → el municipio gestiona y
   responde por WhatsApp). Esta es la slide que faltaba — sin ella el resto asume que
   quien mira ya sabe qué es el producto.
3. Panel del alcalde (maqueta ilustrativa): pendientes, % resuelto, emergencias, por
   asignar, sectores con más reportes, presupuesto, Cuenta Pública en un clic.
4. Las cinco funciones de IA **ya listas para usar** (no "en producción" — ese lenguaje
   es interno, para el alcalde lo que importa es que ya está disponible hoy), con el
   costo real aproximado (~$5.000/mes para 100 reportes, pago por uso).
5. El flujo del vecino en 3 pasos + el WhatsApp automático + **modo sin conexión**: el
   reporte se guarda en el celular si no hay señal y se envía solo al recuperarla
   (`src/utils/colaOffline.js`, §10 de `ESTADO_PROYECTO.md` — la foto no se conserva sin
   conexión, eso no se promete en el texto).
6. Los cuatro argumentos de compra pública: Compra Ágil, garantía de 60 días, sin cobro
   por volumen, IA sin suscripción aparte.
7. Cierre: marca + LOG-In Soluciones Integrales SpA + CTA de demostración (no de piloto
   gratuito) + `contacto.luisgonzaleznunez@log-in.cl`.

**Ojo con lo que no puedes decir todavía** (misma tabla de
`PAUTA-REUNION-ALCALDE.md`, sección "NO prometer"): no muestres ni insinúes la
alerta de emergencia al Alcalde ni el aviso de "cuadrilla asignada" — no están
implementados en producción. Lo que sí puedes prometer con nombre y fecha son
los dos avisos por WhatsApp al vecino (entra el reporte / se resuelve), porque
están funcionando y verificados.

**Tampoco ofrezcas piloto gratuito ni "sin costo" en el contenido público** — la
llamada a la acción es pedir una demostración, no regalar el uso.

### 4. El testimonio — pídeselo al alcalde del municipio cliente
**Formato**: 15-20 seg, grabado por él con su propio celular (igual que el
punto 7 de `KIT-DIFUSION.md`, pero apuntado a otros alcaldes, no a sus vecinos).

Esto vale más que cualquier cosa que produzcas tú, porque es un alcalde
hablándole a otro alcalde, no un vendedor. Pídele algo simple y en sus
palabras, sin guion rígido — la pauta ya usada para el video a vecinos sirve de
plantilla:

> "Con esto sé qué está pasando en cada sector de la comuna sin que nadie tenga
> que contármelo."

Un audio de WhatsApp de 30 segundos también sirve como cita para un post de
LinkedIn ("Así lo describe el alcalde de nuestro primer municipio cliente: …"),
sin necesidad de video ni de nombrar la comuna — a menos que el municipio autorice
expresamente aparecer identificado.

## Dónde publicar

- **LinkedIn**: es donde están los asesores municipales, jefes de informática y
  algunos alcaldes o concejales. Formato que mejor funciona ahí: el carrusel
  del punto 3 y posts de texto largo contando el caso Licantén como historia
  (problema → qué se hizo → resultado), no solo el video.
- **Facebook**: muchos alcaldes chilenos y sus equipos de comunicaciones son
  más activos acá que en LinkedIn. El video del punto 2 funciona mejor en este
  formato que el carrusel.
- No hace falta TikTok/Instagram para esta audiencia — son canales de consumo
  masivo, no donde decide un municipio.

## Ritmo sugerido

No hace falta un calendario editorial diario. Con una publicación cada 1-2
semanas alternando entre demo (punto 2) y caso real (punto 3) alcanza — la
venta B2G no se gana por volumen de posts, se gana porque cuando el municipio
por fin busca "sistema de reportes ciudadanos" encuentra algo con casos reales,
no una página vacía.
