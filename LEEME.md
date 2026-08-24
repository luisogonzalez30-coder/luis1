# TuMuniAquí — espacio de trabajo

Plataforma de reportes ciudadanos para municipalidades chilenas.

Esta carpeta es ahora el **espacio de trabajo completo e independiente** del proyecto: tiene todo el código, el historial de cambios, los scripts, la documentación y el material comercial. Se armó el 17 de agosto de 2026 copiando el proyecto vivo desde `Escritorio/kpop/reporte-incidencias`.

En producción:

- General (cualquier municipalidad): https://app-incidencias-urbanas.web.app/demo
- Licantén: https://app-incidencias-urbanas.web.app/licanten

---

## ⚠️ Esta carpeta YA NO se puede compartir

El 17 de agosto de 2026 se copió el archivo `.env` dentro. Desde ese momento la carpeta contiene credenciales reales de Firebase y Cloudinary.

**No la envíes por correo ni por WhatsApp, no la subas a Drive y no la comprimas para pasársela a nadie.** Si necesitas una versión mostrable, borra el `.env` de la copia antes de mandarla.

Lo que sí sigue afuera, y conviene que siga así:

| Qué falta | Para qué se necesita | Dónde se saca |
|---|---|---|
| `serviceAccountKey.json` | Correr los scripts de `scripts/`. Da acceso total a la base de datos, saltándose cualquier restricción | Firebase Console → Configuración → Cuentas de servicio |
| `backups/` | Nada para desarrollar; son respaldos con datos reales de vecinos | Se regeneran con `npm run backup` |

Nota sobre el `.env`: no trae `VITE_GOOGLE_MAPS_API_KEY`. Hoy da igual, porque el buscador de direcciones usa Nominatim (OpenStreetMap, gratis y sin clave). Solo hará falta si se termina de conectar `src/utils/googleMapsLoader.js`, que está escrito pero todavía no lo llama nadie.

## Cómo arrancar

Las dependencias ya están instaladas. Desde esta carpeta:

```bash
npm run dev
```

Si alguna vez borras `node_modules`, se recuperan con `npm install`.

Los otros comandos útiles están en `package.json`: `npm run build`, `npm run desplegar`, `npm run backup`, `npm run emulators`.

## Cómo saber si todo está funcionando

```bash
npm run revisar
```

**En PowerShell usa esto en su lugar**, desde la carpeta del proyecto:

```powershell
node scripts\revisar-sistemas.mjs
```

Windows viene con la ejecución de scripts deshabilitada y `npm` en PowerShell es un script (`npm.ps1`), así que `npm run ...` falla con `UnauthorizedAccess` aunque todo esté bien instalado. `node` es un programa, no un script, y no lo bloquea. (La otra salida es escribir `npm.cmd run revisar`; las dos hacen lo mismo y ninguna necesita tocar la configuración de seguridad de Windows.)

Revisa de una pasada la app, el portal de consulta de ticket, la PWA, la landing comercial, el bot de WhatsApp y los certificados, y deja un informe con el estado de cada uno. Termina en error solo si hay algo roto de verdad.

**Sin abrir la consola**: en GitHub, pestaña **Actions** → *Revisión diaria de sistemas* → botón **Run workflow**. Corre lo mismo y deja la tabla en el resumen de la corrida.

Eso mismo corre **solo, todos los días a las 9:00 de la mañana** (`.github/workflows/revision-diaria.yml`). Si algo está mal, se abre un issue en el repositorio con la etiqueta `revision-diaria` —GitHub manda el correo— y se cierra solo cuando la revisión del día siguiente salga limpia. Es distinto del vigilante de `vigilar.yml`, que cada 30 minutos avisa de una caída inmediata: la revisión diaria mira el conjunto completo y cosas que se degradan despacio, como un certificado a punto de vencer o un despliegue que quedó atrasado.


## Qué hay en cada carpeta

| Carpeta / archivo | Qué es |
|---|---|
| `src/` | La aplicación web (React) |
| `functions/` | Funciones de servidor de Firebase |
| `whatsapp-api-oficial/` | Integración con la API oficial de WhatsApp |
| `scripts/` | Scripts de mantención: sectores, respaldos, crear cuentas, configurar el WhatsApp del alcalde |
| `public/` y `dist/` | Archivos estáticos y el build ya compilado |
| `docs/` | Propuesta comercial, kit de difusión, pauta para la reunión con el alcalde e informe de costos |
| `landing/` | La landing comercial de TuMuniAquí (proyecto de hosting aparte) |
| `entrega-2026-08-02/` | Foto congelada de la entrega del 2 de agosto: las carpetas `1-App-General` y `2-App-Licanten` tal como estaban. Es material viejo, el código vivo es el de esta carpeta |

## Documentación

Léela apuntando a secciones, no entera — `ESTADO_PROYECTO.md` son ~34 mil tokens.

| Archivo | Para qué |
|---|---|
| `RETOMAR-AQUI.md` | Dónde quedó el trabajo y qué está bloqueado esperándote |
| `ESTADO_PROYECTO.md` | El detalle técnico completo, por secciones (§1 a §34) |
| `DESPLEGAR.md` | Cómo publicar cambios |

## Sobre la carpeta original

`Escritorio/kpop/reporte-incidencias` **sigue existiendo intacta**. Las dos carpetas comparten el mismo historial de git pero desde ahora son independientes: si editas en una, la otra no se entera. Para no confundirte, trabaja en una sola —esta— y deja la otra como respaldo.
