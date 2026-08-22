// Caza acotada a los canales SIN licitación: Compra Ágil y Trato Directo.
//
// Por qué existe aparte de `historico`: ese recorre TODAS las órdenes de compra
// del rubro y pide la ficha de cada una (1.146 en 60 días → horas, y la API
// empieza a responder 429). Acá se descarta antes de pedir nada:
//
//   - El sufijo del código de la OC ya dice el mecanismo, sin gastar petición:
//       AG = Compra Ágil    CM = Convenio Marco    SE = viene de una licitación
//   - Solo se piden las fichas de AG (y opcionalmente las SE, que pueden ser
//     Trato Directo cuando vienen con CodigoLicitacion vacío).
//
// Uso:
//   node scripts/mp-directas.mjs [--dias=30] [--pausa=2500] [--incluir-se]
//                                [--csv=directas.csv] [--tope=250]

import { writeFileSync } from 'fs'
import { crearCliente, aFechaApi } from './lib/mercadoPublico.mjs'
import { evaluarTexto, normalizar } from './lib/cazador.mjs'

const argv = process.argv.slice(2)
const opcion = (nombre, porDefecto) => {
  const a = argv.find(x => x.startsWith(`--${nombre}=`))
  return a ? a.slice(nombre.length + 3) : porDefecto
}
const bandera = nombre => argv.includes(`--${nombre}`)

const DIAS = Number(opcion('dias', 30))
const PAUSA = Number(opcion('pausa', 2500))
const TOPE = Number(opcion('tope', 250))
const INCLUIR_SE = bandera('incluir-se')

const fmt = n => (n == null || n === '' ? '—' : new Intl.NumberFormat('es-CL').format(n))
const dormir = ms => new Promise(r => setTimeout(r, ms))

/** El sufijo del código de OC (1234-56-AG26 → AG). */
const tipoDeCodigo = codigo => (String(codigo).match(/-([A-Z]{2})\d*$/i)?.[1] ?? '').toUpperCase()

const mp = crearCliente({ verboso: false })

// ── Fase 1: barrido por día, sin pedir fichas ────────────────────────────────

console.log(`Barriendo órdenes de compra de ${DIAS} días (1 petición por día)…\n`)

const candidatas = []
for (let i = 1; i <= DIAS; i++) {
  const dia = new Date(Date.now() - i * 86_400_000)
  process.stdout.write(`\r  día ${i}/${DIAS} — ${aFechaApi(dia)} …        `)
  let listado = []
  try {
    listado = (await mp.ordenesPorFecha(dia)).Listado ?? []
  } catch (e) {
    console.warn(`\n  ⚠ ${aFechaApi(dia)}: ${e.message}`)
    continue
  }
  for (const oc of listado) {
    // exigirProducto: el nombre de una OC es "ASEO Y ORNATO, STOCK DE
    // POLIETILENO". Sin esto, el área municipal pega y se gasta una petición
    // de ficha en una compra de bolsas de basura.
    const r = evaluarTexto(oc.Nombre ?? '', { exigirProducto: true })
    if (!r || r.puntaje === 0) continue
    const tipo = tipoDeCodigo(oc.Codigo)
    if (tipo === 'CM') continue // Convenio Marco: otro canal, no se cotiza acá
    if (tipo === 'SE' && !INCLUIR_SE) continue
    candidatas.push({ codigo: oc.Codigo, nombre: oc.Nombre, tipo, rubro: r.puntaje, terminos: r.terminos })
  }
}
process.stdout.write('\r' + ' '.repeat(60) + '\r')

const porTipo = candidatas.reduce((a, c) => ((a[c.tipo] = (a[c.tipo] ?? 0) + 1), a), {})
console.log(`  ${candidatas.length} órdenes del rubro sin licitación: ${JSON.stringify(porTipo)}`)

// Las de mayor peso de rubro primero: si hay que cortar por tope, que corte lo flojo.
candidatas.sort((a, b) => b.rubro - a.rubro)
const aPedir = candidatas.slice(0, TOPE)
if (candidatas.length > TOPE) console.log(`  (se piden las ${TOPE} de mayor fit de rubro)`)

// ── Fase 2: ficha solo de las candidatas ─────────────────────────────────────

console.log(`\nPidiendo ficha de ${aPedir.length} órdenes (pausa ${PAUSA}ms)…\n`)

const detalladas = []
for (const [i, c] of aPedir.entries()) {
  process.stdout.write(`\r  ficha ${i + 1}/${aPedir.length} …        `)
  try {
    const oc = (await mp.orden(c.codigo)).Listado?.[0]
    if (!oc) continue
    // Sin licitación asociada y no es Ágil → el organismo eligió proveedor directo.
    const mecanismo = c.tipo === 'AG' ? 'Compra Ágil' : oc.CodigoLicitacion ? 'Licitación' : 'Trato Directo'
    if (mecanismo === 'Licitación') continue
    detalladas.push({
      ...c,
      mecanismo,
      organismo: oc.Comprador?.NombreOrganismo ?? '',
      unidad: oc.Comprador?.NombreUnidad ?? '',
      region: (oc.Comprador?.RegionUnidad ?? '').trim(),
      comuna: oc.Comprador?.ComunaUnidad ?? '',
      contacto: oc.Comprador?.NombreContacto ?? '',
      mail: oc.Comprador?.MailContacto ?? '',
      fono: oc.Comprador?.FonoContacto ?? '',
      proveedor: oc.Proveedor?.Nombre ?? '',
      total: Number(oc.Total) || 0,
      fecha: (oc.Fechas?.FechaEnvio ?? oc.Fechas?.FechaCreacion ?? '').slice(0, 10),
      link: `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=${c.codigo}`,
    })
  } catch (e) {
    console.warn(`\n  ⚠ ${c.codigo}: ${e.message}`)
  }
  await dormir(PAUSA)
}
process.stdout.write('\r' + ' '.repeat(60) + '\r')

// ── Agrupado por organismo: a quién llamar ───────────────────────────────────

const porOrganismo = new Map()
for (const d of detalladas) {
  const k = normalizar(d.organismo)
  if (!k) continue
  const acc = porOrganismo.get(k) ?? {
    organismo: d.organismo, region: d.region, comuna: d.comuna,
    agil: 0, directo: 0, monto: 0, contactos: new Set(), ejemplos: [],
  }
  acc[d.mecanismo === 'Compra Ágil' ? 'agil' : 'directo']++
  acc.monto += d.total
  if (d.contacto) acc.contactos.add(`${d.contacto}${d.mail ? ` <${d.mail}>` : ''}`)
  if (acc.ejemplos.length < 3) acc.ejemplos.push(`${d.nombre} ($${fmt(d.total)})`)
  porOrganismo.set(k, acc)
}

const leads = [...porOrganismo.values()]
  .map(l => ({ ...l, compras: l.agil + l.directo, puntaje: l.directo * 5 + l.agil * 3 }))
  .sort((a, b) => b.puntaje - a.puntaje)

console.log(`\n${'═'.repeat(78)}`)
console.log(`ÓRDENES SIN LICITAR DEL RUBRO — ${detalladas.length} en ${DIAS} días`)
console.log(`${'═'.repeat(78)}\n`)

for (const [i, l] of leads.entries()) {
  console.log(`${String(i + 1).padStart(2)}. ${l.organismo}  [${l.region}]`)
  console.log(`    ${l.compras} compras del rubro sin licitar · ${l.agil} Compra Ágil · ${l.directo} Trato Directo`)
  console.log(`    Monto acumulado: $${fmt(Math.round(l.monto))}`)
  if (l.contactos.size) console.log(`    Contacto: ${[...l.contactos].slice(0, 2).join(' · ')}`)
  for (const e of l.ejemplos) console.log(`      · ${e}`)
  console.log()
}

const csv = opcion('csv')
if (csv) {
  const cols = ['codigo', 'fecha', 'mecanismo', 'organismo', 'unidad', 'region', 'comuna',
    'contacto', 'mail', 'fono', 'nombre', 'total', 'proveedor', 'link']
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  writeFileSync(csv, [cols.join(','), ...detalladas.map(d => cols.map(c => esc(d[c])).join(','))].join('\n'), 'utf-8')
  console.log(`  → ${csv} (${detalladas.length} filas)`)
}
console.log(`  Peticiones usadas: ${mp.llamadas}`)
