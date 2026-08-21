# Landing de TumuniAqui — cómo actualizarla

**Está publicada en:** https://tumuniaqui.web.app

Es un sitio de Firebase Hosting **separado** de la app. Vive en el mismo proyecto
(`app-incidencias-urbanas`) pero es otro sitio, así que publicar la landing **nunca**
toca la app que usan los vecinos de Licantén, ni al revés.

| | |
|---|---|
| **Landing** (esta carpeta) | https://tumuniaqui.web.app |
| **App** (`reporte-incidencias/`) | https://app-incidencias-urbanas.web.app |

---

## Para cambiar algo de la landing

**1. Edita el archivo:**

```
landing-tumuniaqui\public\index.html
```

Ábrelo con el Bloc de notas o con VS Code. Es un solo archivo: ahí está todo
(textos, colores, el mapa, la calculadora y el QR).

**2. Míralo antes de publicar** — haz doble clic en `public\index.html` y se abre en tu
navegador. Lo que veas ahí es exactamente lo que va a quedar en línea.

**3. Publícalo:**

```powershell
cd C:\Users\Administrador\Desktop\kpop\landing-tumuniaqui
npx --prefix ..\reporte-incidencias firebase deploy --only hosting --project app-incidencias-urbanas
```

Demora menos de un minuto. El cambio queda visible al tiro.

---

## Cosas que vas a querer cambiar en algún momento

**El número de WhatsApp.** Está una sola vez, cerca del final del archivo. Busca
`var WHATSAPP` y cambia el número (formato `56912345678`, sin `+` ni espacios).
Ese valor alimenta el botón verde flotante *y* el formulario de demo.

**Los precios.** Busca `id="precio"`. Están los tres planes en UF. Si cambias la
propuesta comercial, acuérdate de cambiarlos también acá — hoy coinciden con
`reporte-incidencias/docs/PROPUESTA-COMERCIAL.md`.

**El código QR.** Apunta a `app-incidencias-urbanas.web.app/demo`. Si algún día
cambias esa dirección, el QR hay que regenerarlo (no basta con editar el texto:
el dibujo mismo codifica la dirección). Pídemelo y te lo genero.

**Un testimonio real.** Hoy no hay ninguno, a propósito: había uno de ejemplo con
`[Nombre del cliente]` y se sacó. Cuando Licantén (o quien sea) te autorice a
citarlos por escrito, ahí conviene agregar la sección de vuelta.

---

## Pendiente

- **Dominio propio.** Si algún día compras uno (ej. `tumuniaqui.cl`), se conecta desde
  la consola de Firebase → Hosting → sitio `tumuniaqui` → "Agregar dominio
  personalizado". Cuando lo hagas, hay que descomentar dos líneas en el `<head>` del
  HTML (están marcadas con una flecha ⬇️) para el SEO.
- **Avisarle a Licantén** que aparecen nombrados como caso de referencia, con enlaces
  a su portal y a su página de transparencia.
