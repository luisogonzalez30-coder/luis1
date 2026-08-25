# Dónde quedamos — 11 de agosto de 2026

Resumen corto para retomar en una conversación nueva sin arrastrar historial.
El detalle técnico completo está en `ESTADO_PROYECTO.md` (44 secciones).

La app funciona y está en producción: https://app-incidencias-urbanas.web.app/licanten

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
| `retomar-aqui-md-9f2ccr` | Un retoque suelto de este mismo archivo | 21-ago | Sin fusionar, resto de una tanda ya publicada |

**Las conversaciones de `cosas2` y `kpop` son distintas**: no tienen repositorio asociado, así
que lo único que existe de ellas es el chat. Ahí borrar **sí** es pérdida total y no hay nada
que rescatar después. Sacar lo que sirva antes de tocarlas.

---

## Las cinco funciones de IA, implementadas y apagadas (25-ago-2026)

Están las cinco que conversamos: **sugerencia de categoría mirando la foto**, **desempate de
duplicados** entre categorías distintas, **bot conversacional**, **transcripción de notas de
voz** y **resumen narrado de la Cuenta Pública**. El detalle técnico está en **§48**; el costo,
en **`docs/COSTOS-IA.md`**.

**Todo viene apagado y no rompe nada.** Sin `ANTHROPIC_API_KEY` el sistema se comporta
exactamente como hoy: el vecino elige su categoría a mano y el bot muestra su menú de botones.
Eso es a propósito — se puede desplegar sobre Licantén sin arriesgar nada, y encender después.

Cuatro cosas que conviene tener claras antes de encenderlo:

- **La IA propone, las tablas deciden.** Nunca devuelve gravedad ni departamento: solo la
  categoría, y §7/§8 siguen derivando el resto. Un municipio puede defender una tabla ante el
  concejo; no puede defender "el modelo decidió".
- **No necesita Blaze ni tarjeta de Firebase.** Corre en el servicio de Render, que ya llama
  APIs externas. Lo de la tarjeta sigue pendiente por lo de siempre (el SLA), no por esto.
- **El costo tiene techo puesto en código**: tope de gasto mensual que apaga la IA sola, tope
  de turnos por conversación, y límite por IP en los endpoints públicos.
- **La transcripción de audio usa otro proveedor** (Claude no acepta audio) y por eso tiene su
  propia variable. Antes de encenderla con vecinos reales hay que sumarlo a la política de
  privacidad, que además sigue esperando abogado.

Verificado: **31 + 25 pruebas pasando**, y **ya está publicado en producción** (25-ago). El
despliegue automático corrió verde, el sitio sirve el bundle nuevo y se comprobó por contraste
que lleva la configuración de Firebase incrustada — el fallo silencioso de §39, que publica un
sitio muerto con la CI en verde.

Lo que **no** se pudo hacer desde acá: probar contra la API real de Claude (no hay clave en
este entorno) ni mirar la pantalla. **La revisión visual sigue siendo tuya.**

---

## Te toca a ti (bloqueado sin tu acción)

1. ~~Desplegar las reglas~~ — ✅ hecho el 10-ago.
2. ~~Desplegar el frontend~~ — ✅ hecho el 10-ago: §35 a §37 y §40 están en línea.
3. **Revisar la vista previa del PR #3 y hacer merge**: la vista previa se publica sola en <https://github.com/luisogonzalez30-coder/luis1/pull/3> (comentario automático con la URL, vence a los 7 días). Ahí está todo lo de esta tanda sin publicar: rediseño completo, mapa de calor, PDF gerencial, compresión de fotos, páginas legales y sectores reales. **Son 25 commits y 21 archivos (+6.956 líneas) de una vez, sobre un municipio con vecinos reales usándolo**, así que revisar antes del merge no es opcional. El botón **Merge pull request** publica en producción.
4. ~~**Crear la variable `URL_BOT`**~~ — ✅ **hecho y verificado el 21-ago**. Quedó en `https://proyectomuni.onrender.com`. Costó dos vueltas porque esta misma guía pedía crearla "con algo como `https://tumuniaqui-bot.onrender.com`", una dirección inventada como ejemplo que se copió literal; **Render contesta 404 en cualquier subdominio suyo sin dueño, así que una URL inventada se ve idéntica a un servicio caído** y el vigilante estuvo 7 corridas avisando de una caída que no existía. De ahí salieron dos cambios (PR #7): un 404 ya no se reporta como "el bot reporta problemas" sino como "no existe /salud en esa dirección", y se puede probar una dirección antes de guardarla con el campo `url_bot` en Actions → Vigilar el servicio → Run workflow, sin tocar el aviso real.

   **El ciclo completo quedó demostrado en producción**: la corrida 9 revisó el sitio (200) y `/salud` del bot (200, sano) y **cerró sola el aviso #6**. El vigilante corre cada 30 minutos y avisa por issue, que GitHub reenvía por correo.
5. **Confirmar que el índice `(municipio_id, estado, categoria, fecha_creacion)` de `tickets_publicos` quedó Habilitado** en <https://console.firebase.google.com/project/app-incidencias-urbanas/firestore/indexes>. El usuario confirmó el 21-ago que quedó **Habilitado** (no se pudo verificar desde la sesión: sin credenciales de Firebase; el bloqueo del proxy ya no aplica desde el 24-ago). **Ya no es bloqueante**: `buscarActivosPorCategoria` degrada sola si el índice falta, así que la app funciona igual; sin él simplemente sigue usando la ventana del mapa y la detección de duplicados queda menos precisa. Si aparece como fallido o no existe, se recrea con `npm run desplegar:reglas` o a mano desde esa misma pantalla.
6. **Confirmar las 16 coordenadas de sectores que faltan**: `node scripts/configurar-sectores.mjs licanten --revisar` da un link de Google Maps por sector, menos de un minuto cada uno. Los 3 confirmados ya quedaron cargados el 11-ago (y con la coordenada del centro **corregida**, ver §43.1). Mientras las otras 16 no estén, sus incidencias se agrupan en "Fuera de los sectores definidos" y el buscador de direcciones sigue sin su fuente local, la que funciona sin internet (§37.3).
7. **Correo de datos personales del municipio**: `node scripts/configurar-contacto-datos.mjs licanten <correo@municipalidad>`. Está vacío, así que las páginas legales mandan al vecino a la Oficina de Partes.
8. **Revocar la cuenta `TERRENO` del bot viejo** si sigue en `usuarios_municipales`: nadie la usa y tiene permiso de escritura en producción. El bot actual usa cuenta de servicio.
9. **Confirmar visualmente** que el PDF de la Cuenta Pública sale bien paginado — requiere login al panel del Alcalde, no tengo acceso.
10. **Tarea programada del respaldo diario** en Windows: nunca confirmaste si la creaste (§25).
10. **WhatsApp del Alcalde**, si algún día se repone la alerta: `node scripts/configurar-whatsapp-alcalde.mjs licanten +569XXXXXXXX`. Hoy guardar el número no sirve de nada por sí solo (§39.3).
11. **Encender la IA, si quieres usarla** (§48). Nada de esto corre todavía:
    1. Sacar una clave en `console.anthropic.com` y cargarla en **Render → Settings →
       Environment** como `ANTHROPIC_API_KEY`. Conviene poner también `IA_TOPE_USD_MES`
       (25 es un valor cómodo: en el escenario realista se gasta ~$5). Al guardar, Render
       reinicia solo y el log dice `[ia] Activa con modelo claude-opus-5`.
    2. ~~Fusionar a `main`~~ — ✅ **hecho el 25-ago**. El frontend ya está publicado y
       verificado contra producción: el bundle nuevo se está sirviendo, lleva la
       configuración de Firebase incrustada (la comprobación del fallo silencioso de
       §39) y trae el código de IA adentro. Como no hay clave todavía, el formulario
       se comporta exactamente igual que antes — la sugerencia solo aparecerá cuando
       hagas el paso 1.
    3. Probarlo tú: reportar algo eligiendo **a propósito la categoría equivocada** y ver si
       el aviso aparece en el Paso 3. Y escribirle al número algo que no sea un ticket
       ("¿cuándo arreglan la luz de mi calle?") para ver si contesta en vez de mostrar el menú.
    4. La transcripción de audios queda aparte (`OPENAI_API_KEY`) y **no conviene encenderla
       todavía**: suma un proveedor nuevo que recibe datos de vecinos y eso hay que declararlo
       en la política de privacidad primero (§48.6).

---

## Pendiente para operar, ahora que hay cliente (§27 tiene la lista completa)

Reordenado el 11-ago tras la aceptación. Antes esta lista era "lo que falta para vender"; ahora hay un municipio real usando el sistema, así que los tres primeros puntos son riesgo operativo, no comercial.

1. **La tarjeta. Ahora bloquea de verdad.** El bot corre en Render **plan Free, sin SLA**, y la propuesta compromete descuento por indisponibilidad (§7.2). Firebase sigue en la cuota gratis compartida. Mientras era una demo daba lo mismo; con un municipio dependiendo del servicio a diario es el riesgo más concreto que hay. Sin tarjeta tampoco hay plan Blaze ni dominio propio.
2. **Las 16 coordenadas de sectores que faltan.** Solo 3 de las 19 localidades existen en el panel. Los vecinos de Duao, La Pesca, Idahue y el resto van a reportar y sus incidencias caerán todas en "Fuera de los sectores definidos" — un hueco que en demo no se notaba y con operación real sí. Menos de un minuto por sector: ver el punto 3 de "Te toca a ti".
3. **Reponer la alerta de emergencias al Alcalde, que ahora tiene plazo.** En la reunión se dijo "en desarrollo, se activa en las próximas semanas", así que la frase ya corre. Es la función más vendedora de la propuesta (§3.3) y hoy **no existe**. Necesita un listener nuevo **y** una plantilla aprobada en Meta (con la API oficial no se puede mandar texto libre fuera de la ventana de 24 h).
4. **Limpiar los 6 reportes de prueba de Licantén.** Ya no es cosmética: en cuanto entren los reportes reales del municipio, las estadísticas del primer mes y la primera Cuenta Pública nacen contaminadas. Varios son pruebas tuyas y se notan (uno dice *"Reja rota"* pero está categorizado **Árbol caído**; otro es de **Linares**, otra ciudad). Decidir cuáles borrar **antes** de que el municipio empiece a usarlo.
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

**Y una trampa que ya costó una vez** (§43.1): al escribir en Firestore desde un script, usar **exactamente las claves que lee el frontend**. El campo `coordenadas` es `{ lat, lng }`; un script escribió `{ latitude, longitude }` "conservando el formato", los documentos quedaron con los dos pares, y el mapa siguió dibujando el viejo. Peor: el chequeo leía `latitude ?? lat`, o sea prefería la clave recién escrita, y dio todo en verde. **Un verificador que acepta más formatos que la aplicación no verifica nada.** Lo detectó el usuario mirando la pantalla. `scripts/verificar-presentacion.mjs` ahora exige `lat`/`lng` y falla si no están.

---

## Entrega ya armada

`Escritorio/TuMuniAqui-Entrega/` tiene las dos carpetas (app general y versión Licantén) con su LEEME y los links. Sin credenciales adentro, a propósito.
