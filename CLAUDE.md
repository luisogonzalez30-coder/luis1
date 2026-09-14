# Instrucciones para Claude — TuMuniAquí

Este archivo se carga solo, al inicio de **cada** sesión que se abra sobre este repositorio,
en cualquier dispositivo. Es la memoria común entre conversaciones: cada chat arranca en un
contenedor nuevo y no ve lo que pasó en los otros, así que lo que no esté escrito aquí o en
los archivos que este archivo nombra, se pierde.

Mantenerlo corto. Es contexto que se paga en cada sesión.

## Qué es esto

Plataforma de reportes ciudadanos para municipalidades chilenas. **Licantén es cliente real
y está en producción** — hay un municipio dependiendo del servicio, no es un proyecto de
práctica.

- App: https://app-incidencias-urbanas.web.app/licanten
- Demo: https://app-incidencias-urbanas.web.app/demo

## Alcance — qué entra aquí y qué no

Este repositorio es **el motor y sus dos verticales**: la app, el bot de WhatsApp, la landing,
los scripts y el material comercial. Todo eso es el mismo producto y comparte este contexto.

- **TuMuniAquí** — comunas. Licantén en producción.
- **TuCondoAquí** — condominios y edificios (desde el 14-sep-2026). Misma base de código, misma
  base de datos; el tenant trae un campo `vertical` y, si no lo trae, es `'municipio'`.
  Ver `docs/ESTUDIO-MERCADO-CONDOMINIOS.md`, `docs/TUCONDOAQUI-ARQUITECTURA.md` y §50.

Lo que **no** entra: los otros frentes del usuario (la API de ChatGPT, log-inspa.cl, MundoGol,
kpop). Viven en sus propios espacios y no deben mezclarse acá — mezclarlos es lo que hacía que
cada conversación arrancara sin saber de qué se estaba hablando.

## Antes de tocar nada — el orden de lectura

1. **`RETOMAR-AQUI.md`** — siempre, entero. Es corto y dice dónde quedó el trabajo y qué
   está bloqueado esperando al usuario.
2. **`LEEME.md`** — qué hay en cada carpeta y cómo se corre el proyecto.
3. **`ESTADO_PROYECTO.md`** — el detalle técnico, 50 secciones numeradas (§1 a §50).
   **No lo leas entero: son ~34 mil tokens.** Busca la sección con
   `grep -n "^## " ESTADO_PROYECTO.md` y lee solo el rango que necesitas con `sed -n`.
4. **`DESPLEGAR.md`** — antes de publicar cualquier cambio.

Si la tarea toca algo que ya tiene sección en `ESTADO_PROYECTO.md`, léela antes de escribir
código. Casi todo lo que parece nuevo ya está decidido ahí.

## Las otras conversaciones

El usuario trabaja en varios chats en paralelo (Mercado Público, automatización diaria,
orden de carpetas, informes). Cada uno es una sesión aislada. Para ver el estado de todas
sin preguntarle a él, usar la herramienta `list_sessions` del servidor `claude-code-remote`:
devuelve título, rama, si está bloqueada y qué necesita. Vale la pena mirarlo cuando el
usuario habla de algo que no empezó en esta conversación.

Lo que **no** se puede: leer el historial de otra conversación. Por eso todo lo que importa
tiene que terminar escrito en el repositorio.

## Reglas de trabajo

- **Escribir en español**, en el tono de los documentos que ya están: directo, sin
  autobombo, explicando el porqué. Nada de "¡Listo! 🎉".
- **Trabajar en la rama `claude/...` asignada y fusionar a `main` cuando esté lista.** Lo que
  se queda en una rama sin fusionar es invisible para las otras sesiones. Es el error más
  caro de este flujo.
- **Cerrar cada sesión actualizando `RETOMAR-AQUI.md`**: qué se hizo, qué quedó a medias, qué
  necesita del usuario. Si el cambio es técnico y tiene sustancia, agregar sección nueva a
  `ESTADO_PROYECTO.md` con fecha, siguiendo el formato de las anteriores.
- **Verificar antes de decir que algo funciona.** `npm run revisar` prueba de una pasada la
  app, el portal de consulta, la PWA, la landing, el bot de WhatsApp y los certificados.
- **No prometer funciones que no existen.** §21 y §32 listan lo diseñado pero no implementado
  (la alerta de emergencia al Alcalde, entre otras). Al Alcalde se le dijo "en desarrollo" —
  no hay deuda contraída y conviene no crearla.

## Secretos

El `.env` de la carpeta local del usuario tiene credenciales reales de Firebase y Cloudinary.
Nunca subirlas al repositorio, nunca pegarlas en un chat, nunca mandarlas a un servicio
externo. `serviceAccountKey.json` y `backups/` viven fuera del repositorio y ahí se quedan.

## Un muro que estuvo puesto: la red de las sesiones

> **Levantado desde el 30-ago-2026.** Comprobado corriendo el código, no leyendo esto:
> producción, la landing, el bot, Nominatim y `api.mercadopublico.cl` responden todos, y el
> proxy reporta `"selective": false` (sin lista blanca). **`npm run revisar` y los scripts de
> `mp:*` funcionan desde acá.** Lo que sigue es el diagnóstico de cuando estaba puesto, que
> se conserva porque el bloqueo se define por entorno y puede volver en una sesión nueva.
>
> Antes de dar por caído un servicio, comprobar cuál de los dos mundos es: `curl` a un
> dominio del proyecto. Código `000` o 403 del proxy = la red de la sesión. Cualquier otra
> respuesta = el servicio contestó, y lo que diga es real.

La política de red de estos contenedores **bloqueaba el dominio de producción**
(`app-incidencias-urbanas.web.app`): el proxy respondía 403 al intentar conectarse. Un
`curl` desde aquí devolvía código `000`, que *parece* el sitio caído y no lo es. No sacar
conclusiones de eso ni salir a arreglar nada: comprobar el estado real mirando la última
corrida de `vigilar.yml` en GitHub Actions, que sí alcanza el sitio.

Un detalle que confunde el diagnóstico con Mercado Público: la API contesta
`{"Codigo":203,"Mensaje":"Ticket no válido."}` con HTTP 200. Un 203 en el cuerpo es la API
viva rechazando el ticket, no la red bloqueada.

Lo mismo bloquea las APIs externas (es lo que dejó detenida la integración con Mercado
Público). GitHub es la excepción: va por un proxy aparte y funciona igual, lo que hace
confuso el diagnóstico —se puede leer el repositorio pero no el sitio que ese repositorio
publica.

**Cómo se levanta** (solo el usuario, desde claude.ai/code → ícono de nube sobre la caja de
mensajes → engranaje del entorno → `Network access` → **Custom**, marcando
`Also include default list of common package managers`; sin esa casilla se rompe npm).
Hay **dos entornos** y las sesiones están repartidas entre ambos: `Default` y `diseño`.
Arreglar uno solo deja el problema vivo en la mitad de las conversaciones.

La lista de dominios que necesita este proyecto:

```
app-incidencias-urbanas.web.app     la app y el portal de consulta
tumuniaqui.web.app                  la landing comercial
proyectomuni.onrender.com           el bot de WhatsApp (/salud)
api.mercadopublico.cl               Mercado Público
www.mercadopublico.cl
graph.facebook.com                  API oficial de WhatsApp (Meta)
api.cloudinary.com                  fotos de los vecinos
res.cloudinary.com
nominatim.openstreetmap.org         buscador de direcciones
server.arcgisonline.com             vista satelital
*.googleapis.com                    Firebase, para los scripts de scripts/
*.firebaseio.com
fonts.gstatic.com
unpkg.com
cdnjs.cloudflare.com
*.frame.claudeusercontent.com       lectura de artefactos
```

El cambio aplica solo a sesiones nuevas: las que ya están corriendo conservan la política
con la que arrancaron.

## Vigilancia automática

- `.github/workflows/vigilar.yml` — cada 30 minutos, avisa de una caída inmediata.
- `.github/workflows/revision-diaria.yml` — 9:00 AM, revisa el conjunto y abre un issue con
  la etiqueta `revision-diaria` si algo está mal. Se cierra solo cuando el día siguiente sale
  limpio.

Si hay un issue abierto con esa etiqueta, atenderlo antes que lo que venga.
