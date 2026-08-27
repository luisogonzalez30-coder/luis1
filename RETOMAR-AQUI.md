# Dónde quedamos — 27 de agosto de 2026

Resumen corto para retomar en una conversación nueva sin arrastrar historial.
El detalle técnico completo está en `ESTADO_PROYECTO.md` (49 secciones).

La app funciona y está en producción: https://app-incidencias-urbanas.web.app/licanten
**Y desde el 26-ago la IA está encendida.** Las secciones están en orden cronológico, así que
lo más reciente está más abajo: busca los títulos con fecha **26-ago**.

Otros dos documentos que se escribieron para no volver a calcular ni buscar lo mismo:
`docs/COSTOS-IA.md` (cuánto cuesta la IA) y `docs/PLATAFORMAS.md` (de qué servicios depende
todo esto, con sus paneles).

---

## 🎉 El Alcalde de Licantén aceptó el proyecto (11-ago-2026)

**Licantén es cliente.** Esto cambia el orden de todo lo que sigue: lo que era "pendiente para vender" ahora es **pendiente para operar**, y tiene un municipio real esperando del otro lado.

Se aceptó viendo **solo lo que funciona de verdad**. En la reunión no se prometió la alerta de emergencia al Alcalde ni el aviso de "cuadrilla asignada" — quedaron dichas como "en desarrollo" y "próxima etapa". **No hay deuda contraída**: lo que se entregue de acá en adelante suma, no rescata. Conviene no romper eso.

Lo primero que hay que resolver, en este orden, está en **"Pendiente para operar"** más abajo. El resumen: la tarjeta (el bot corre en plan Free sin SLA y ahora hay un municipio dependiendo de él), las 16 coordenadas de sectores que faltan, y la alerta de emergencia, que ahora tiene fecha de vencimiento porque se dijo "próximas semanas".

---

## El sistema está operativo de punta a punta

**Verificado el 11-ago a primera hora**: Meta aprobó las dos plantillas durante la noche y **los 4 avisos que estaban esperando salieron solos**. Un reporte creado a las 02:04 de hoy también recibió su aviso, o sea que la cadena completa funciona en vivo: el vecino reporta → le llega el WhatsApp → el funcionario ve el reporte con su foto → el vecino puede consultar por WhatsApp.

Lo que **no existe** todavía, y no se debe prometer:

- **La alerta de emergencia al WhatsApp del Alcalde** (§32/§39.3). Es la función más vendedora de la propuesta comercial y no está implementada. Necesita un listener nuevo **y** una plantilla aprobada.
- **El aviso de "cuadrilla asignada"** (§42): el código está listo, apagado tras la variable `WHATSAPP_TEMPLATE_ASIGNACION`. Falta crear la plantilla `ticket_asignado` en Meta (el texto está guardado en §42) y poner esa variable en Render.

---

## Antes de firmar el segundo municipio

Los textos de WhatsApp son de **un solo municipio**: las plantillas dicen "Municipalidad de Licantén" adentro y los links van fijos a `/licanten`. Los listeners sí son multi-municipio. Hay que parametrizar el nombre y los links antes del cliente 2 — **ver §44**, que además explica que el límite de 2 números de Meta se levanta con la verificación de negocio.

---

## Para vender (al siguiente municipio — con Licantén ya funcionó)

- **`docs/PAUTA-REUNION-ALCALDE.md`** — guion de 20 minutos con tiempos, frases textuales, objeciones y links en orden. **Probado y ganado el 11-ago con el Alcalde de Licantén.** La idea que lo ordena: al Alcalde no se le vende una app para vecinos, se le vende su panel de control.
- **`docs/KIT-DIFUSION.md`** — material de la semana 5 listo para que publique la municipalidad: afiche con QR, publicaciones de Facebook, mensaje para juntas de vecinos, cartel del mesón, guion de radio y video del Alcalde.
- **`docs/PROPUESTA-COMERCIAL-NOTAS.md`** sección 1 — lo que la propuesta promete y todavía no se puede cumplir. Leerla antes de enviarla.

**Cuentas**: `contacto@alcaldelicanten.com` abre Licantén real (6 reportes). El correo personal (`luis.ogonzalez.30@gmail.com`) abre el tenant **demo**, que quedó preparado para presentaciones (§43): 101 reportes, 3 sectores, calificaciones, y el nombre "Municipalidad de Licantén (demostración)". Desde el 11-ago el demo además tiene el mapa bien centrado sobre el pueblo y **sin RUT ni teléfonos de personas reales** (§43.1, §43.2).

---

## Lo que se cerró el 11 de agosto, antes de la reunión con el Alcalde

- **El mapa apuntaba al lugar equivocado** (§43.1). La coordenada de "Licantén (centro)" estaba 6,5 km al oeste del pueblo, en el campo, y marcada como confirmada. Antes de arreglarla, **5 de los 6 reportes de Licantén caían "fuera de sectores"**. Eran **cuatro** cosas separadas: la coordenada del sector, una **copia** de esa coordenada en `preparar-demo.mjs`, el `centro_mapa` de cada tenant (que decide dónde abre el mapa y no se arregla solo), y los 48 reportes del demo ya sembrados sobre los potreros. Todas corregidas.
  El primer intento de mover los 48 **falló en silencio** y el chequeo lo dio por bueno — escribió en las claves equivocadas. Lo pilló el usuario mirando el mapa. Está contado en §43.1 y el aprendizaje quedó abajo, en "Cómo empezar la próxima conversación": vale para cualquier script que escriba en Firestore.
- **Fuera los datos personales del demo** (§43.2): 13 RUT y 25 celulares de personas reales, borrados con `FieldValue.delete()`. Respaldo en `backups/incidencias-antes-de-corregir-2026-08-11.json`.
- **Pauta de la reunión actualizada**: los avisos por WhatsApp salieron de la tabla "NO prometer" —Meta aprobó anoche y están saliendo— y pasaron a ser demo en vivo del Minuto 3-5. Es el mejor momento del guion: reportas desde el celular y el aviso llega delante del Alcalde.

## Lo que se cerró el 10 de agosto (todo desplegado y verificado)

- **Las fotos del vecino llegan al funcionario** (§38). Reglas desplegadas; confirmado con un reporte real.
- **No se crean más "reportes fantasma"** (§40), y los **23 huérfanos** que había quedaron borrados (respaldo en `backups/tickets-huerfanos-2026-08-10.json`).
- **Frontend publicado**: buscador de direcciones (§37), panel del Alcalde (§36) y **páginas legales** (§35), que llevaban una semana sin publicarse.
- **El bot conversacional funciona** (§41): el webhook quedó montado, la app publicada en Meta, y el vecino ya recibe respuesta. Escribirle *"mis reportes"* devuelve su lista, identificándolo por el teléfono desde el que escribe.
- **Menú de 3 botones tocables** (§41.5) para cualquier mensaje que el bot no entienda — nació de la primera prueba real, donde el corrector del teléfono convirtió "mis reportes" en "mía reportes".
- **Aviso de "cuadrilla asignada"** programado y apagado hasta que exista su plantilla (§42).
- **Tenant de demostración presentable** (§43), sin inventar un solo dato sobre Licantén.

---

## Si vas a hablar de WhatsApp, lee §39 antes que §23 o §32

> ✅ **Resuelto el 11-ago-2026.** Meta aprobó las dos plantillas durante la noche y los avisos están saliendo: los 6 reportes de Licantén tienen el suyo enviado. Lo que decía este recuadro hasta ayer —que las plantillas estaban "En revisión" y Meta rechazaba todo con el error engañoso `132001`— quedó atrás, pero el diagnóstico sigue en §39.5 por si se repite al crear la próxima plantilla. Lo que hay que recordar de ahí: **el error habla de nombre e idioma cuando el problema es el estado de la plantilla**, no hay nada que arreglar en el código, y tras la aprobación conviene **reiniciar el servicio en Render** para que los pendientes reintenten solos.

El bot **ya no es** el no oficial (Baileys) que describen esas dos secciones: está migrado a la **Cloud API oficial de Meta** y corre en Render, no en tu PC. El riesgo de que Meta bloqueara el número **está cerrado**. Eso nunca se había documentado, y §21/§23/§27 más la propuesta comercial seguían describiendo el bot viejo — por eso se escribió §39, que es lo único verificado contra el código y contra producción.

**Funciona y está verificado**: aviso al vecino cuando entra su reporte (`alerta_nuevo_ticket`) y cuando se resuelve (`ticket_resuelto`). Todos los reportes desde el 1 de agosto tienen su aviso enviado.

**Se perdió en la migración**: la alerta de emergencia al Alcalde (§32), el aviso de "cuadrilla asignada", y "mis reportes" — esta última **ya se repuso** el 10-ago (§41). Las otras dos siguen sin existir: sus campos se escriben en cada reporte pero **ningún código los consume**, así que configurar `whatsapp_alcalde` no enciende nada.

Los textos aprobados de las dos plantillas quedaron guardados en §39.2 (el texto real vive en Meta, así que si lo editas allá, actualiza esa sección).

---

## Despliegue automático: funcionando (21-ago-2026)

Se configuró de punta a punta y **está publicando**. Al abrir o actualizar un PR
sube una vista previa a una URL temporal y la deja como comentario; al hacer
merge a `main` publica en producción. Guía clic por clic, sin terminal, en
**`DESPLEGAR.md`**.

| Pieza | Estado |
|---|---|
| Cuenta de servicio `github-desplegador` en Google Cloud | ✅ creada |
| Roles `Firebase Hosting Admin` + `Cloud Run Viewer` en IAM | ✅ concedidos |
| Secreto `FIREBASE_SERVICE_ACCOUNT` en GitHub | ✅ creado |
| Los 8 secretos `VITE_*` en GitHub | ✅ creados |
| Vista previa publicándose sola en el PR #3 | ✅ verificado |
| Merge a `main` → producción | ✅ **ejecutado y verde** (24 y 25-ago) |

Esa última fila decía "nunca se ha ejecutado todavía" y quedó desactualizada:
el 24-ago hubo dos publicaciones a producción por esta vía, las dos exitosas, y
el 25-ago salió la tanda de IA (§48). El flujo ya no es teórico.

Lo que sí sigue siendo cierto: **desde estas sesiones no se puede mirar el sitio
publicado**, solo leer el código y las corridas de Actions. Que el despliegue
diga "success" quiere decir que Firebase recibió los archivos, no que la
pantalla se vea bien. Esa comprobación sigue siendo tuya.

### Tres diagnósticos equivocados que costaron vueltas

Valen más que el resultado, porque los tres fallaban en silencio.

**1. Un build verde NO prueba que los `VITE_*` existan.** Se dio por hecho que
estaban configurados porque el paso "Compilar" pasaba. Es falso: Vite no falla
cuando falta un `VITE_*`, lo reemplaza por `undefined` y compila igual. Los ocho
estaban vacíos. Ese razonamiento erróneo llegó a quedar escrito acá y en
`DESPLEGAR.md`, mandando al usuario a saltarse un paso que sí hacía falta.

**2. Sin esos valores el sitio se publica y queda muerto, sin ningún error a la
vista.** `firebase.js` llama a `getAuth(app)` al evaluarse el módulo; con la
configuración vacía lanza `auth/invalid-api-key` durante la cadena de imports,
antes de que `main.jsx` ejecute una línea. Y como el `#carga-inicial` de
`index.html` vive dentro de `#root` y solo desaparece cuando React lo reemplaza,
el vecino ve el logo girando **para siempre**. La CI, verde.

Arreglado por los dos lados: el flujo comprueba los ocho antes de compilar y
falla nombrando los que falten (sin imprimir valores), y `main.jsx` importa
`App` de forma dinámica para poder atrapar el error y mostrar una pantalla que
explica que el problema es del servidor, con los números de emergencia visibles.

**3. Un 403 de Google significa que el secreto está BIEN.** Cuando la cuenta de
servicio existía pero sin roles, el error era
`This account is missing the following required permissions`. Para llegar ahí la
credencial tuvo que leerse y autenticarse. Cuando el secreto de verdad falta, el
error es otro: `Input required and not supplied: firebaseServiceAccount`, en 0
segundos, sin contactar a Google. Confundirlos lleva a rehacer un secreto que
estaba correcto.

### Un dato que se descubrió por ir a la fuente

El bucket es `app-incidencias-urbanas.firebasestorage.app`, **no**
`.appspot.com`. Se había supuesto lo segundo por costumbre; el valor real salió
de la consola de Firebase. Con el supuesto, las fotos habrían fallado sin dar un
error claro.

### La regla que sigue vigente

Trabajando desde Claude Code **en la nube** no existen `.env` ni
`serviceAccountKey.json` —están en `.gitignore` a propósito— y el proxy bloquea
el dominio del sitio. **Si la sesión no puede desplegar ni abrir el sitio,
decirlo en el primer mensaje, no al final.** Eso costó varias idas y vueltas con
el usuario, que revisaba el sitio y lo veía idéntico.

Ahora hay salida: la vista previa del PR se publica sola y el usuario la abre
desde su lado. La revisión visual sigue siendo suya — desde la nube no se puede
ver el sitio publicado, solo leer código y registros.

**Alternativa que evitaría los 8 secretos**: esos valores **no son secretos** —
viajan dentro del JavaScript que descarga cualquier visitante, y lo que protege
los datos son las reglas de Firestore. Se pueden commitear como
`.env.production` y sacar del workflow. Se le ofreció al usuario y prefirió no
decidirlo; **queda como opción abierta, no como pendiente**.

---

## El contexto ahora se carga solo, y la red dejó de mentir (24-ago-2026)

Dos cosas que arreglan el mismo problema de fondo: cada conversación arrancaba sin saber de
qué se estaba hablando, y cada una volvía a tropezar con el mismo muro.

**`CLAUDE.md` en la raíz** (PR #10 y #11). Claude Code lo lee solo al inicio de *toda* sesión
que se abra sobre este repositorio, en cualquier dispositivo, sin que haya que pedirlo. Fija
el orden de lectura, advierte que `ESTADO_PROYECTO.md` no se lee entero, deja escrito que
Licantén está en producción, que este repositorio es **solo TuMuniAquí** —los otros frentes
viven aparte— y que lo que se queda en una rama sin fusionar es invisible para las demás
sesiones.

**La red de los entornos quedó abierta.** Estaba en `Trusted`, que bloquea el dominio de
producción: un `curl` devolvía `000` y *parecía* el sitio caído. Ahora está en `Custom` con
los quince dominios del proyecto, en **los dos entornos** (`Default` y `diseño`). La lista y
los pasos quedaron en `CLAUDE.md` por si hay que rehacerlo.

Con eso se desbloquea también **Integración API Chile Compras**, que llevaba dos días
detenida esperando exactamente esto.

**Verificado contra producción el 24-ago a las 16:30 UTC**, ya con la red abierta: app,
demo, portal de consulta, PWA, landing y bot responden; el bot reporta `ok: true` sin
problemas y 65 horas en pie; certificados con 29 días. Y lo que más importaba: **el bundle
publicado lleva la configuración de Firebase incrustada**. Es el fallo silencioso de §39 —si
esa variable llega vacía el sitio se publica igual, la CI queda verde y el vecino se queda
mirando la pantalla de carga—; se comprobó por contraste, porque compilar sin `.env` produce
`apiKey:void 0` y producción no lo tiene.

**Un detalle que va a confundir**: `npm run revisar` puede seguir diciendo "la red bloquea el
dominio" en una sesión que arrancó *antes* del cambio. `curl` sale por el proxy y `fetch` de
Node va por otro camino, que conserva la lista con la que arrancó la sesión. En una sesión
nueva funciona completo. No es un error del script.

---

## Qué guarda cada rama, para poder archivar las conversaciones (24-ago-2026)

La barra lateral se llenó de conversaciones y conviene ordenarla. Antes de hacerlo, esto:

**Archivar, no borrar.** Archivar las esconde de la lista y se puede deshacer. Borrar elimina
la conversación y sus datos de forma **permanente**. Y ojo: **el historial de un chat no lo
puede recuperar nadie**, tampoco Claude en otra sesión — de las demás conversaciones solo se
ve el título, el estado y la rama. Lo que se pierde al borrar es el razonamiento, no el
código.

**El código está a salvo**: todas las sesiones de este repositorio empujaron su rama a GitHub
y las ramas sobreviven aunque la conversación desaparezca. Se recupera cualquiera con
`git checkout claude/<rama>`.

| Rama (`claude/…`) | Qué guarda | Último commit | Estado |
|---|---|---|---|
| `chile-compras-api-integration-b4zcip` | Integración con la API de Mercado Público (+1.131 líneas, `docs/MERCADO-PUBLICO.md`) | 22-ago | Sin fusionar. Estaba detenida por la red, ya levantada |
| `mercado-publico-verification-vrgedr` | Lo anterior más 2 commits: la moneda de cada orden (4.126 UF no son $4.126) y el Convenio Marco | 22-ago | Sin fusionar. **Es la que contiene lo demás**, si se retoma una sola, esta |
| `tumuniaqui-pdf-report-c7ubr7` | El informe de producto y tecnología para publicar en **Acquire.com**, con PDF armado (`docs/acquire/`) | 22-ago | Sin fusionar |
| `organize-project-folders-iiwdbv` | Organizador de carpetas: `scripts/organizar-claude.ps1` y `.sh` | 23-ago | Sin fusionar. Esperaba que corrieras el script que mueve los secretos |
| `web-automation-daily-9am-g2y52n` | 10 líneas en `LEEME.md`: cómo correr la revisión desde PowerShell | 24-ago | Sin fusionar. Lo demás de esa sesión ya entró en el PR #9 |
| `remove-unnecessary-folders-sb79yn` | **Borra `functions/`** (−3.063 líneas): Cloud Functions nunca desplegadas que duplicaban el bot | 16-ago | Sin fusionar. Conviene comprobarlo antes de fusionar algo que elimina |
| `tienda-shopify-v3-v8des8` | Investigación de producto y ficha para Shopify (`tienda-shopify/`) | 05-ago | Sin fusionar. **No es TuMuniAquí**, ver el alcance en `CLAUDE.md` |
| `nueva-skill-instalada-rlmxjb` | **Centinela TA**, plataforma de Transparencia Activa: 87 archivos, +10.810 líneas | 15-ago | **PR #2 abierto**. Tampoco es TuMuniAquí |
| `retomar-aqui-md-9f2ccr` | El fix de precios que a `main` le faltaba (§49) + esta misma tabla | 27-ago | Sin fusionar, al día con `main`, esperando confirmación para fusionar (ver más arriba) |

**Las conversaciones de `cosas2` y `kpop` son distintas**: no tienen repositorio asociado, así
que lo único que existe de ellas es el chat. Ahí borrar **sí** es pérdida total y no hay nada
que rescatar después. Sacar lo que sirva antes de tocarlas.

---

## La IA está encendida y funcionando (26-ago-2026)

**`/ia/estado` responde `{"activa":true}` y los ocho sistemas están verdes.** Las cinco
funciones corren en producción: sugerencia de categoría mirando la foto, desempate de
duplicados entre categorías distintas, bot conversacional, transcripción de notas de voz
(apagada aparte, ver abajo) y resumen narrado de la Cuenta Pública.

El detalle técnico está en **§48**. El costo, en **`docs/COSTOS-IA.md`**: en el escenario
realista para Licantén (100 reportes/mes) son **~$5.000 al mes**, un 1% de las 12 UF del plan
Comuna. Es pago por uso, sin suscripción.

### Lo que hay que entender del diseño

- **La IA propone, las tablas deciden.** Nunca devuelve gravedad ni departamento: solo la
  categoría, y §7/§8 siguen derivando el resto. Un municipio puede defender una tabla ante el
  concejo; no puede defender "el modelo decidió". Además la categoría se valida contra el
  catálogo real: una que no existe se descarta y no llega a Firestore.
- **Si se quita la clave, todo vuelve solo al comportamiento anterior**, sin caerse. El vecino
  elegiría su categoría a mano y el bot mostraría su menú de botones (§41.5).
- **El costo tiene techo puesto en código**: tope de gasto mensual que apaga la IA sola
  (persistido en `configuracion/ia_gasto`, para que sobreviva a los reinicios), tope de turnos
  por conversación, y límite por IP en los endpoints públicos.
- **En el bot, el orden de resolución no cambió.** Un número de ticket y "mis reportes" siguen
  siendo deterministas y gratis; la IA solo cubre lo que antes caía en el menú de "no te
  entendí". Por eso cuesta bastante menos de lo calculado.

### Lo único que sigue apagado, a propósito

**La transcripción de notas de voz.** Claude no acepta audio, así que necesita otro proveedor
(`OPENAI_API_KEY`, variable aparte). Eso significa un tercero más recibiendo **la voz de los
vecinos**, que es el dato más sensible de todo el sistema. Antes de encenderla hay que sumarlo
a la política de privacidad (§35.2), que además sigue esperando revisión de abogado.

### Lo que falta, y es tuyo

**Probarla con los ojos.** Desde estas sesiones no se puede mirar la pantalla. Dos pruebas de
un minuto:

1. Reportar algo eligiendo **a propósito la categoría equivocada** — en el Paso 3, al subir la
   foto, debería aparecer el aviso proponiendo la correcta.
2. Escribirle al WhatsApp del municipio algo que **no** sea un número de ticket ("¿cuándo
   arreglan la luz de mi calle?"). Antes salía el menú de botones; ahora debería contestar.

---

## Dos días que costó encender la IA, y por qué vale leerlo (25 y 26-ago-2026)

El código estuvo listo el 25 y funcionaba. Lo que costó fue el despliegue, y ninguna pista
apuntaba a la causa.

**Render venía desplegando el bot desde `claude/retomar-aqui-md-9f2ccr`**, una rama de trabajo
del 21-ago que nunca se fusionó y a la que le faltaban **1.338 líneas** del bot, incluidos los
tres archivos de IA. Render hacía su trabajo perfecto: traía el último commit… de la rama
equivocada.

**Eso era más grave que la IA apagada**: producción se desplegaba desde una rama sin fusionar,
así que nada de lo que entraba a `main` llegaba al bot, y cualquiera que hubiera seguido
trabajando en esa rama habría publicado sin que nadie lo revisara. Corregido apuntando el
servicio a `main`.

**Los tres espejismos que hicieron perder tiempo** (el caso completo, en `DESPLEGAR.md`):

1. `/salud` decía `ok: true` y `/` decía `Status: OK`. El servicio estaba sano — lo que estaba
   mal era *qué versión* corría, y ninguna de esas pantallas lo dice.
2. Guardar una variable de entorno **reinicia** el servicio. Eso hizo que el contador bajara a
   4 minutos y pareciera que el deploy había funcionado. No había traído código nuevo.
3. El servicio **no aparece** en la lista principal de Render: está dentro de `My project` →
   `Production` → `ProyectoMuni`. Los `centinela-ta-*` que se ven sueltos son de otro proyecto.
   Por eso el primer Deploy se hizo sobre el servicio equivocado.

**El dato que sí sirve para diagnosticar** es `minutosArriba` en `/salud`: si no baja a cerca
de cero, no hubo despliegue ni reinicio; si baja pero la ruta nueva sigue en 404, hubo reinicio
sin código nuevo — y ahí hay que mirar la rama.

---

## Tres cosas que este documento decía y eran falsas (26-ago-2026)

Se descubrieron mirando el panel de Render y el código, no de memoria. Conviene tenerlo
presente: **este archivo se desactualiza**, y creerle sin verificar cuesta caro.

| Decía | Es |
|---|---|
| "El bot corre en Render **plan Free, sin SLA**" — era el pendiente #1 | **Plan Starter**, pagado. Ese riesgo ya no existe. Firebase sí sigue en Spark |
| "El merge a `main` **nunca se ha ejecutado**" | Ya había corrido en producción desde el 24-ago |
| El bot se publica **a mano** en Render | `Auto-Deploy` está en **On Commit**: ahora que apunta a `main`, se actualiza solo |

---

## Lo que se limpió de paso (26-ago-2026)

**Google Maps no se usaba y se borró.** El proyecto arrastraba la dependencia
`@googlemaps/js-api-loader`, un `src/utils/googleMapsLoader.js` completo y la variable
`VITE_GOOGLE_MAPS_API_KEY` — nada de eso lo importaba ningún componente. Los mapas siempre
fueron Leaflet con OpenStreetMap y ArcGIS, y el buscador de direcciones siempre fue Nominatim.

No hace falta pagar ninguna API key de Google Maps. Se borró en vez de solo anotarlo porque el
archivo estaba bien escrito y era creíble: alguien podía "terminar de conectarlo" y encender un
cobro que el proyecto no necesita.

**`docs/PLATAFORMAS.md`** (nuevo) — el inventario de todas las plataformas de las que depende
la producción, con su panel y cuáles cuestan plata. Es lo primero que se busca cuando algo se
cae y nadie se acuerda de dónde vive.

---

## La rama `retomar-aqui-md-9f2ccr` dejó de divergir de `main` (27-ago-2026)

Sesión local (con acceso real al navegador, no a través del proxy de la nube). Encontró la
rama con dos problemas separados, no uno:

1. **3 archivos con cambios locales sin comitear** (`ESTADO_PROYECTO.md`,
   `docs/PROPUESTA-COMERCIAL.md`, `landing/public/index.html`): la sincronización de precios
   del 19/26-ago (§49) se había hecho y publicado directo desde el PC (`npm run desplegar`),
   pero nunca se comiteó ni se subió. Comprobado contra el sitio en vivo antes de tocar nada:
   `tumuniaqui.web.app` ya servía los precios nuevos: el archivo local **no** estaba
   desactualizado respecto a producción, solo respecto a git.
2. **8 días de atraso contra `main`**: la rama seguía en el estado del 21-ago (antes del PR #3,
   antes de la IA, antes de `CLAUDE.md`). Se comiteó lo del punto 1, se empujó, se fusionó
   `main` y aparecieron 2 conflictos reales — nada más, el resto mezcló solo:
   - `RETOMAR-AQUI.md`: un párrafo pidiendo revisar y fusionar el PR #3, que `main` ya daba por
     hecho desde el 21-ago. Se tomó la versión de `main`.
   - `ESTADO_PROYECTO.md`: **dos secciones "§48" independientes**, numeradas igual porque las
     dos ramas partieron del mismo `§47` — la de las cinco funciones de IA (25-ago, en `main`)
     y la del tope de Compra Ágil con IVA (19-ago, en esta rama). Las dos son trabajo real y
     verificado, así que se conservaron ambas: la de IA se quedó en §48 (la citan
     `docs/PLATAFORMAS.md`, `docs/GASTOS.md`, `docs/COSTOS-IA.md` y este mismo archivo, así que
     tocar su número habría significado corregir referencias en cuatro archivos más), la de
     precios pasó a **§49**.

**Lo único que esta rama le aportaba de verdad a `main`** era el fix de precios: `main` tenía
la tabla vieja (UF 8/12/20) en `landing/public/index.html` y `docs/PROPUESTA-COMERCIAL.md` a
pesar de que su propio `docs/COSTOS-IA.md` ya calculaba con la tabla nueva (UF 12/20/33) —
o sea que ni `main` estaba internamente consistente en esto. El resto de los commits de esta
rama (script de un jefe por departamento en el demo, script de preparación del demo, nota de
`URL_BOT`) ya estaban reflejados en `main` de otra forma.

**Queda pendiente, y es decisión tuya**: fusionar esta rama a `main` dispara el despliegue
automático a producción (`desplegar.yml`). El cambio real que publicaría es mínimo —solo
empareja el archivo con lo que `tumuniaqui.web.app` ya muestra— pero es un municipio real con
vecinos dependiendo del servicio, así que no se hizo sin confirmar contigo primero.

---

## Te toca a ti (bloqueado sin tu acción)

1. ~~Desplegar las reglas~~ — ✅ hecho el 10-ago.
2. ~~Desplegar el frontend~~ — ✅ hecho el 10-ago: §35 a §37 y §40 están en línea.
3. ~~**Revisar el PR #3 y hacer merge**~~ — ✅ **fusionado el 21-ago** (commit `7015e78`, "Publica el rediseno, el costeo y el despliegue automatico"). Este punto siguió pidiendo una acción ya hecha durante cinco días; se comprobó el 26-ago contra `main`. El rediseño, el mapa de calor, el PDF gerencial, la compresión de fotos, las páginas legales y los sectores reales están todos publicados.
4. ~~**Crear la variable `URL_BOT`**~~ — ✅ **hecho y verificado el 21-ago**. Quedó en `https://proyectomuni.onrender.com`. Costó dos vueltas porque esta misma guía pedía crearla "con algo como `https://tumuniaqui-bot.onrender.com`", una dirección inventada como ejemplo que se copió literal; **Render contesta 404 en cualquier subdominio suyo sin dueño, así que una URL inventada se ve idéntica a un servicio caído** y el vigilante estuvo 7 corridas avisando de una caída que no existía. De ahí salieron dos cambios (PR #7): un 404 ya no se reporta como "el bot reporta problemas" sino como "no existe /salud en esa dirección", y se puede probar una dirección antes de guardarla con el campo `url_bot` en Actions → Vigilar el servicio → Run workflow, sin tocar el aviso real.

   **El ciclo completo quedó demostrado en producción**: la corrida 9 revisó el sitio (200) y `/salud` del bot (200, sano) y **cerró sola el aviso #6**. El vigilante corre cada 30 minutos y avisa por issue, que GitHub reenvía por correo.
5. **Confirmar que el índice `(municipio_id, estado, categoria, fecha_creacion)` de `tickets_publicos` quedó Habilitado** en <https://console.firebase.google.com/project/app-incidencias-urbanas/firestore/indexes>. El usuario confirmó el 21-ago que quedó **Habilitado** (no se pudo verificar desde la sesión: sin credenciales de Firebase; el bloqueo del proxy ya no aplica desde el 24-ago). **Ya no es bloqueante**: `buscarActivosPorCategoria` degrada sola si el índice falta, así que la app funciona igual; sin él simplemente sigue usando la ventana del mapa y la detección de duplicados queda menos precisa. Si aparece como fallido o no existe, se recrea con `npm run desplegar:reglas` o a mano desde esa misma pantalla.
6. **Confirmar las 16 coordenadas de sectores que faltan**: `node scripts/configurar-sectores.mjs licanten --revisar` da un link de Google Maps por sector, menos de un minuto cada uno. Los 3 confirmados ya quedaron cargados el 11-ago (y con la coordenada del centro **corregida**, ver §43.1). Mientras las otras 16 no estén, sus incidencias se agrupan en "Fuera de los sectores definidos" y el buscador de direcciones sigue sin su fuente local, la que funciona sin internet (§37.3).
7. **Correo de datos personales del municipio**: `node scripts/configurar-contacto-datos.mjs licanten <correo@municipalidad>`. Está vacío, así que las páginas legales mandan al vecino a la Oficina de Partes.
8. **Revocar la cuenta `TERRENO` del bot viejo** si sigue en `usuarios_municipales`: nadie la usa y tiene permiso de escritura en producción. El bot actual usa cuenta de servicio.
9. **Confirmar visualmente** que el PDF de la Cuenta Pública sale bien paginado — requiere login al panel del Alcalde, no tengo acceso.
10. **Tarea programada del respaldo diario** en Windows: nunca confirmaste si la creaste (§25).
11. **WhatsApp del Alcalde**, si algún día se repone la alerta: `node scripts/configurar-whatsapp-alcalde.mjs licanten +569XXXXXXXX`. Hoy guardar el número no sirve de nada por sí solo (§39.3).
12. ~~**Encender la IA**~~ — ✅ **hecho y verificado el 26-ago**: `/ia/estado` responde
    `{"activa":true}`. Falta lo único que no se puede hacer desde una sesión: **probarla con los
    ojos**. Dos pruebas de un minuto:
    1. Reportar algo eligiendo **a propósito la categoría equivocada**, y ver si en el Paso 3,
       al subir la foto, aparece el aviso proponiendo la correcta.
    2. Escribirle al número del municipio algo que **no** sea un ticket ("¿cuándo arreglan la
       luz de mi calle?"), y ver si contesta en vez de mostrar el menú de botones.

    La transcripción de audios sigue apagada aparte (`OPENAI_API_KEY`) y **no conviene
    encenderla todavía**: manda la voz de los vecinos a un tercero y eso hay que declararlo
    antes en la política de privacidad (§48.6 y §48.6.b).

---

## Pendiente para operar, ahora que hay cliente (§27 tiene la lista completa)

Reordenado el 11-ago tras la aceptación. Antes esta lista era "lo que falta para vender"; ahora hay un municipio real usando el sistema, así que los tres primeros puntos son riesgo operativo, no comercial.

1. ~~**La tarjeta**~~ — ✅ **resuelto, al menos en Render**. Se comprobó el 26-ago en el panel: el servicio `ProyectoMuni` está en **plan Starter** (0,5 CPU, 512 MB), no en Free. Este documento decía "plan Free, sin SLA" y llevaba tiempo desactualizado. **Firebase sigue en Spark** (cuota gratis compartida), así que lo del plan Blaze y el dominio propio sigue pendiente — pero el riesgo más concreto, que el bot se apagara sin aviso con un municipio dependiendo, ya no está.
2. **Las 16 coordenadas de sectores que faltan.** Solo 3 de las 19 localidades existen en el panel. Los vecinos de Duao, La Pesca, Idahue y el resto van a reportar y sus incidencias caerán todas en "Fuera de los sectores definidos" — un hueco que en demo no se notaba y con operación real sí. Menos de un minuto por sector: ver el punto 3 de "Te toca a ti".
3. **Reponer la alerta de emergencias al Alcalde, que ahora tiene plazo.** En la reunión se dijo "en desarrollo, se activa en las próximas semanas", así que la frase ya corre. Es la función más vendedora de la propuesta (§3.3) y hoy **no existe**. Necesita un listener nuevo **y** una plantilla aprobada en Meta (con la API oficial no se puede mandar texto libre fuera de la ventana de 24 h).
4. **Limpiar los 6 reportes de prueba de Licantén.** Ya no es cosmética: en cuanto entren los reportes reales del municipio, las estadísticas del primer mes y la primera Cuenta Pública nacen contaminadas. Varios son pruebas tuyas y se notan (uno dice *"Reja rota"* pero está categorizado **Árbol caído**; otro es de **Linares**, otra ciudad). Ese primer caso es justamente el que la sugerencia de categoría (§48.3) ahora previene: mirando la foto habría propuesto corregirlo antes de enviarlo. Decidir cuáles borrar **antes** de que el municipio empiece a usarlo.
5. **El aviso de "cuadrilla asignada"** (§42). Se dijo "próxima etapa". El código está listo y apagado; falta la plantilla `ticket_asignado` en Meta y la variable en Render.
6. **El costo por mensaje de Meta.** Cada reporte genera al menos dos mensajes de plantilla, y ahora el volumen deja de ser hipotético. Verifica la tarifa vigente de mensajes de utilidad en Chile y métela en tus números: la propuesta dice "no hay cobro por cantidad de reportes", cierto para lo que le cobras al municipio, falso para lo que te cuesta a ti.
7. **Cómo facturas.** Ya tienes SpA. Falta inscribirte como proveedor en Mercado Público (gratis y online) — la propuesta afirma que ya lo estás, y ahora hay que emitir de verdad.
8. **El acuerdo de tratamiento de datos.** Las páginas legales están escritas y publicadas (§35.2), pero falta que **las revise un abogado** y el acuerdo que la propuesta menciona. Con un municipio firmado, esto pasa de "conviene" a "corresponde".

~~Reponer "mis reportes"~~ — ✅ hecho el 10-ago (§41). ~~Política de privacidad y términos~~ — ✅ publicadas (§35.2). ~~Datos de prueba del demo~~ — ✅ 11-ago (§43.1, §43.2).

**Si vuelves a enviar la propuesta a otro municipio**, lee antes `docs/PROPUESTA-COMERCIAL-NOTAS.md` sección 1: es la tabla de lo que el documento promete y todavía no puedes cumplir.

---

## Dar de alta una municipalidad nueva

Los datos que hay que pedirle están en la conversación del 09-ago pero **no quedaron escritos como documento**. Resumen: nombre institucional, coordenadas del centro, dos colores hex, logo PNG, nombres de las cuadrillas (sin esto no se puede asignar nada), listado de sectores con un punto de referencia cada uno, y por cada funcionario nombre + correo + rol + departamento. Más el correo del encargado de datos personales y el WhatsApp del Alcalde. **No** hay que pedir categorías ni departamentos (vienen fijos) ni precios de materiales (se construyen solos con el historial).

**Ahora hace falta de verdad**: con Licantén aceptado hay que pedirle formalmente estos datos (cuadrillas, funcionarios con su rol, correo del encargado de datos personales, WhatsApp del Alcalde). Pedir en la próxima conversación que quede como `docs/ALTA-MUNICIPALIDAD.md`, en formato de formulario para enviar por correo, con el comando que corresponde a cada dato.

---

## Cómo empezar la próxima conversación

Para que salga barata, apunta a secciones en vez de pedir que lea todo:

> "Lee RETOMAR-AQUI.md y la sección §32 y §39 de ESTADO_PROYECTO.md. Quiero reponer la alerta de emergencia al WhatsApp del Alcalde."

Evita "lee ESTADO_PROYECTO.md completo": son ~40 mil tokens, el equivalente a veinte mensajes.

**Dos gotchas de esta máquina que van a aparecer** (§20 y §38.4): el **emulador de Firestore no arranca** acá (falla Netty al abrir un selector, con y sin sandbox), así que las reglas no se pueden probar localmente — lo que sí funciona es `npx firebase deploy --only firestore:rules --dry-run`, que las compila contra el proyecto real sin publicarlas. Y la API `firebaserules:test` de Google devuelve **403** con la cuenta de servicio del repo, que no tiene el permiso `firebaserules.rulesets.test`.

**Un método que valió la pena y conviene repetir**: cuando algo "no funciona en producción", comparar el ruleset **realmente desplegado** (se baja con la Rules API usando `serviceAccountKey.json`) contra `firestore.rules`, y leer las banderas reales de `incidencias` con el Admin SDK. Así se encontró el bug de las fotos y así se comprobó que las notificaciones sí salen. Está escrito en §38.2.

**La lección más cara de esta sesión, que vale para cualquier "no funciona en producción"**:
antes de buscar el bug, comprobar **qué versión está corriendo de verdad**. Dos días se fueron
en la IA apagada porque el servicio decía `ok: true` y parecía recién reiniciado, mientras
servía código de otra rama. Un servicio sano no es un servicio actualizado, y ninguna pantalla
de estado lo distingue sola — hay que mirar la rama y el commit desplegado.

**Y una trampa que ya costó una vez** (§43.1): al escribir en Firestore desde un script, usar **exactamente las claves que lee el frontend**. El campo `coordenadas` es `{ lat, lng }`; un script escribió `{ latitude, longitude }` "conservando el formato", los documentos quedaron con los dos pares, y el mapa siguió dibujando el viejo. Peor: el chequeo leía `latitude ?? lat`, o sea prefería la clave recién escrita, y dio todo en verde. **Un verificador que acepta más formatos que la aplicación no verifica nada.** Lo detectó el usuario mirando la pantalla. `scripts/verificar-presentacion.mjs` ahora exige `lat`/`lng` y falla si no están.

---

## Entrega ya armada

`Escritorio/TuMuniAqui-Entrega/` tiene las dos carpetas (app general y versión Licantén) con su LEEME y los links. Sin credenciales adentro, a propósito.
