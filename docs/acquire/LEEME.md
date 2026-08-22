# Informe para Acquire.com — cómo regenerarlo

El PDF publicable es **`docs/TuMuniAqui-Product-and-Technology-Report.pdf`** (26 páginas,
bilingüe: informe en inglés + anexo ejecutivo en español).

Esta carpeta tiene el **código fuente** del informe, para que se pueda actualizar sin
rehacerlo desde cero:

| Archivo | Qué es |
|---|---|
| `portada.html` | La portada, en una página A4 sin márgenes (por eso va aparte: en impresión el navegador no pinta dentro del margen de página, así que una portada a sangre completa no se puede hacer en el mismo documento que el cuerpo) |
| `cuerpo.html` | Todo el resto del informe: índice, las 16 secciones en inglés y el anexo en español |

## Para cambiar algo

Edita el HTML que corresponda. Los dos archivos se abren en el navegador haciendo doble
clic; lo que veas ahí es prácticamente lo que sale impreso.

## Para volver a generar el PDF

Hace falta Node y un Chromium. Con Chrome instalado en Windows:

```powershell
npm install playwright-core
node render.mjs
```

`render.mjs` (abajo) imprime cada archivo a PDF y luego hay que unirlos. Si es más
cómodo, se puede hacer sin script: abrir cada HTML en Chrome → **Imprimir** → *Guardar
como PDF*, con **Márgenes: Ninguno** y **Gráficos de fondo: activado**, y unir los dos
PDF resultantes con cualquier herramienta.

```js
// render.mjs
import { chromium } from 'playwright-core'
const b = await chromium.launch()
const ctx = await b.newContext()
for (const [src, out] of [['portada.html', '_portada.pdf'], ['cuerpo.html', '_cuerpo.pdf']]) {
  const p = await ctx.newPage()
  await p.goto(`file://${process.cwd()}/${src}`, { waitUntil: 'networkidle' })
  await p.emulateMedia({ media: 'print' })
  await p.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true, scale: 1 })
  await p.close()
}
await b.close()
```

## Antes de publicar la ficha en Acquire

La sección **16 (Financial summary)** quedó con las filas marcadas para completar:
ingresos reconocidos, facturas emitidas, MRR, costos operativos reales y pipeline. Son
las únicas cifras del informe que no se pudieron verificar contra el producto, porque
dependen de la contabilidad. En due diligence el comprador va a pedir respaldo de cada
una, así que conviene llenarlas con números que se puedan documentar.
