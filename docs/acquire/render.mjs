import { chromium } from 'playwright-core';
const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b = await chromium.launch({ executablePath: EXEC, args:['--no-sandbox','--disable-dev-shm-usage'] });
const ctx = await b.newContext();
for (const [src, out] of [['portada.html','_portada.pdf'], ['cuerpo.html','_cuerpo.pdf']]) {
  const p = await ctx.newPage();
  await p.goto(`file://${process.cwd()}/${src}`, { waitUntil: 'networkidle' });
  await p.emulateMedia({ media: 'print' });
  await p.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true, scale: 1 });
  await p.close();
  console.log('ok', out);
}
await b.close();
