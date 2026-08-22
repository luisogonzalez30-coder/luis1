// Caza de oportunidades de venta al Estado en Mercado Público (ChileCompra).
//
// Requiere un ticket de api.mercadopublico.cl (gratuito, formulario "Solicitud
// de Ticket" en el sitio; cuota 10.000 peticiones/día). El ticket NO se
// versiona: va en .env como MERCADOPUBLICO_TICKET, o por --ticket=XXXX.
//
// Uso:
//   node scripts/mercado-publico.mjs verificar
//   node scripts/mercado-publico.mjs activas [--max=40] [--csv=pipeline.csv]
//   node scripts/mercado-publico.mjs historico [--dias=60] [--csv=leads.csv]
//   node scripts/mercado-publico.mjs detalle <codigo>
//   node scripts/mercado-publico.mjs inspeccionar <codigo>
//
// `historico` deja en .cache-mercadopublico.json el conteo de qué organismos
// compran el rubro y por qué vía. `activas` lo lee para puntuar recurrencia,
// así que conviene correr `historico` primero (una vez por semana basta).

import { writeFileSync, readFileSync, existsSync } from 'fs'
import { crearCliente, ErrorMercadoPublico, ESTADOS, aFechaApi } from './lib/mercadoPublico.mjs'
import {
  puntuarLicitacion,
  evaluarTexto,
  normalizar,
  nivel,
  accionRecomendada,
  unspscDelRubro,
  campo,
} from './lib/cazador.mjs'
import { PUNTAJE_MINIMO, UNSPSC } from './lib/perfilProveedor.mjs'

const CACHE = '.cache-mercadopublico.json'

const argv = process.argv.slice(2)
const comando = argv.find(a => !a.startsWith('-')) ?? 'verificar'
const opcion = (nombre, porDefecto) => {
  const a = argv.find(x => x.startsWith(`--${nombre}=`))
  return a ? a.slice(nombre.length + 3) : porDefecto
}

const fmt = n =>
  n === null || n === undefined || n === '' ? '—' : new Intl.NumberFormat('es-CL').format(n)

const fecha = f => (f ? String(f).slice(0, 10) : '—')

/** Borra la línea de progreso y deja el cursor listo para la salida final. */
const limpiarProgreso = () => process.stdout.write('\r' + ' '.repeat(60) + '\r')

/** Tabla en consola, recortando columnas para que no se rompa el ancho. */
const tabla = (filas, columnas) => {
  if (!filas.length) return console.log('  (sin resultados)')
  const anchos = columnas.map(c =>
    Math.min(c.max ?? 40, Math.max(c.titulo.length, ...filas.map(f => String(c.valor(f) ?? '').length)))
  )
  const linea = (celdas, relleno = ' ') =>
    celdas.map((c, i) => String(c).slice(0, anchos[i]).padEnd(anchos[i], relleno)).join(' │ ')
  console.log('  ' + linea(columnas.map(c => c.titulo)))
  console.log('  ' + linea(anchos.map(() => ''), '─').replace(/ │ /g, '─┼─'))
  for (const f of filas) console.log('  ' + linea(columnas.map(c => c.valor(f) ?? '—')))
}

const aCsv = (filas, columnas, ruta) => {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const texto = [
    columnas.map(c => esc(c.titulo)).join(','),
    ...filas.map(f => columnas.map(c => esc(c.valor(f))).join(',')),
  ].join('\n')
  writeFileSync(ruta, '\ufeff' + texto, 'utf-8')
  console.log(`\n  → ${ruta} (${filas.length} filas, abrible en Excel)`)
}

const leerCache = () => {
  if (!existsSync(CACHE)) return null
  try {
    return JSON.parse(readFileSync(CACHE, 'utf-8'))
  } catch {
    return null
  }
}

// ─── verificar ───────────────────────────────────────────────────────────────

const verificar = async mp => {
  console.log('Probando conexión con api.mercadopublico.cl …\n')

  const t0 = Date.now()
  const resp = await mp.licitacionesActivas()
  const ms = Date.now() - t0

  const listado = resp.Listado ?? []
  console.log(`  ✓ Conectado en ${(ms / 1000).toFixed(1)}s`)
  console.log(`  Licitaciones activas publicadas: ${fmt(resp.Cantidad ?? listado.length)}`)
  if (resp.FechaCreacion) console.log(`  Fecha de la respuesta: ${resp.FechaCreacion}`)

  if (listado.length) {
    console.log('\n  Campos que trae el listado liviano:')
    console.log('    ' + Object.keys(listado[0]).join(', '))
    console.log('\n  Primeras 3:')
    tabla(listado.slice(0, 3), [
      { titulo: 'Código', valor: l => l.CodigoExterno, max: 18 },
      { titulo: 'Nombre', valor: l => l.Nombre, max: 60 },
      { titulo: 'Estado', valor: l => ESTADOS[l.CodigoEstado] ?? l.CodigoEstado, max: 12 },
      { titulo: 'Cierre', valor: l => fecha(l.FechaCierre), max: 12 },
    ])
  }

  // Segunda llamada: confirma que el ticket sirve también para órdenes de
  // compra (es el endpoint donde vive el Trato Directo).
  const ayer = new Date(Date.now() - 86_400_000)
  console.log(`\n  Probando órdenes de compra del ${aFechaApi(ayer)} …`)
  const oc = await mp.ordenesPorFecha(ayer)
  const ocs = oc.Listado ?? []
  console.log(`  ✓ ${fmt(oc.Cantidad ?? ocs.length)} órdenes de compra ese día`)
  if (ocs.length) console.log('    campos: ' + Object.keys(ocs[0]).join(', '))

  console.log(`\n  Peticiones usadas en esta corrida: ${mp.llamadas} (cuota diaria: 10.000)`)
  console.log('\n  Todo OK. Siguiente paso: node scripts/mercado-publico.mjs historico --dias=60')
}

// ─── activas ─────────────────────────────────────────────────────────────────

const activas = async mp => {
  const max = Number(opcion('max', 40))
  const cache = leerCache()
  const recurrencia = new Map(Object.entries(cache?.recurrencia ?? {}))

  if (!cache) {
    console.log('  (sin histórico en caché: el criterio de recurrencia queda en cero.')
    console.log('   Corré `historico --dias=60` para activarlo.)\n')
  } else {
    console.log(`  Histórico en caché: ${cache.dias} días, ${recurrencia.size} organismos.\n`)
  }

  console.log('Descargando licitaciones activas …')
  const { Listado = [] } = await mp.licitacionesActivas()
  console.log(`  ${fmt(Listado.length)} activas. Filtrando por rubro sobre el nombre …`)

  // Primer filtro barato: solo el nombre, que es lo único que trae el listado.
  const candidatas = Listado.filter(l => {
    const r = evaluarTexto(l.Nombre)
    return r && r.puntaje > 0
  })
  console.log(`  ${candidatas.length} pegan con el rubro.`)

  const aConsultar = candidatas.slice(0, max)
  if (candidatas.length > max) {
    console.log(`  Pidiendo la ficha completa de las primeras ${max} (subí el tope con --max=).`)
  }

  const oportunidades = []
  for (const [i, c] of aConsultar.entries()) {
    process.stdout.write(`\r  ficha ${i + 1}/${aConsultar.length} …            `)
    try {
      const ficha = await mp.licitacion(c.CodigoExterno)
      const lic = ficha.Listado?.[0]
      if (!lic) continue
      const op = puntuarLicitacion(lic, { recurrencia })
      if (!op || op.puntaje < PUNTAJE_MINIMO) continue
      const codigos = unspscDelRubro(lic)
      if (codigos.length) {
        op.puntaje += 3
        op.razones.push(`UNSPSC del rubro: ${codigos.map(c => UNSPSC[c]).join(', ')}`)
      }
      oportunidades.push(op)
    } catch (e) {
      console.warn(`\n  ⚠ ${c.CodigoExterno}: ${e.message}`)
    }
  }
  limpiarProgreso()

  oportunidades.sort((a, b) => b.puntaje - a.puntaje)

  const columnas = [
    { titulo: 'Organismo', valor: o => o.comprador, max: 34 },
    { titulo: 'Mecanismo', valor: o => `${o.mecanismo} ${o.tipo}`.trim(), max: 16 },
    { titulo: 'Descripción', valor: o => o.nombre, max: 44 },
    { titulo: 'Monto est.', valor: o => `${fmt(o.monto)} ${o.moneda ?? ''}`.trim(), max: 18 },
    { titulo: 'Región', valor: o => o.region, max: 22 },
    { titulo: 'Cierre', valor: o => `${fecha(o.cierre)} (${o.dias ?? '?'}d)`, max: 16 },
    { titulo: 'Score', valor: o => `${nivel(o.puntaje)} ${o.puntaje}`, max: 10 },
    { titulo: 'Acción', valor: o => accionRecomendada(o), max: 46 },
    { titulo: 'Link', valor: o => o.link, max: 90 },
  ]

  console.log(`\nOPORTUNIDADES ACTIVAS — ${oportunidades.length} sobre el umbral (${PUNTAJE_MINIMO})\n`)
  tabla(oportunidades, columnas.slice(0, 8))

  console.log('\n  Por qué puntuó cada una:')
  for (const o of oportunidades.slice(0, 10)) {
    console.log(`    [${o.puntaje}] ${o.codigo} — ${o.razones.join(' · ')}`)
  }

  const csv = opcion('csv')
  if (csv) aCsv(oportunidades, columnas, csv)
  console.log(`\n  Peticiones usadas: ${mp.llamadas}`)
}

// ─── historico ───────────────────────────────────────────────────────────────

/**
 * Recorre las órdenes de compra de los últimos N días y arma el mapa de qué
 * organismos compran el rubro sin licitar. Ahí están los leads calientes: al
 * Trato Directo no se postula, se llega por relación con la unidad de compras.
 */
const historico = async mp => {
  const dias = Number(opcion('dias', 60))
  console.log(`Recorriendo órdenes de compra de los últimos ${dias} días …`)
  console.log('  (una petición por día; con --dias=60 son ~60 peticiones de las 10.000)\n')

  const recurrencia = {}
  const compras = []

  for (let i = 1; i <= dias; i++) {
    const dia = new Date(Date.now() - i * 86_400_000)
    process.stdout.write(`\r  día ${i}/${dias} — ${aFechaApi(dia)} …          `)
    let listado = []
    try {
      const resp = await mp.ordenesPorFecha(dia)
      listado = resp.Listado ?? []
    } catch (e) {
      console.warn(`\n  ⚠ ${aFechaApi(dia)}: ${e.message}`)
      continue
    }

    // Filtro por texto sobre el nombre de la OC, que es lo que trae el listado.
    for (const oc of listado) {
      const r = evaluarTexto(campo(oc, 'Nombre') ?? '')
      if (!r || r.puntaje === 0) continue
      compras.push({
        codigo: campo(oc, 'Codigo', 'CodigoOrden'),
        nombre: campo(oc, 'Nombre'),
        fecha: campo(oc, 'FechaEnvio', 'FechaCreacion'),
        puntajeRubro: r.puntaje,
        terminos: r.terminos,
      })
    }
  }
  limpiarProgreso()

  console.log(`  ${compras.length} órdenes de compra del rubro en la ventana.`)
  console.log('  Pidiendo la ficha de cada una para saber quién compró y por qué vía …\n')

  const detalladas = []
  for (const [i, c] of compras.entries()) {
    process.stdout.write(`\r  ficha ${i + 1}/${compras.length} …          `)
    try {
      const resp = await mp.orden(c.codigo)
      const oc = resp.Listado?.[0]
      if (!oc) continue

      const comprador =
        campo(oc, 'Comprador.NombreOrganismo', 'Comprador.NombreUnidad', 'Organismo') ?? ''
      const region = campo(oc, 'Comprador.RegionUnidad', 'Comprador.Region') ?? ''
      // La OC dice de qué proceso viene. Sin licitación asociada = compra
      // directa (Trato Directo o Compra Ágil según el tipo que informe la API).
      const origen = campo(oc, 'CodigoLicitacion', 'Licitacion', 'Cotizacion')
      const tipoTexto = normalizar(
        `${campo(oc, 'TipoCompra', 'Tipo', 'Descripcion') ?? ''} ${campo(oc, 'Nombre') ?? ''}`
      )
      const mecanismo = tipoTexto.includes('agil')
        ? 'Compra Ágil'
        : origen
          ? 'Licitación'
          : 'Trato Directo'

      const clave = normalizar(comprador)
      if (clave) recurrencia[clave] = (recurrencia[clave] ?? 0) + 1

      detalladas.push({
        ...c,
        comprador,
        region,
        mecanismo,
        proveedor: campo(oc, 'Proveedor.Nombre', 'Proveedor.NombreProveedor') ?? '',
        total: campo(oc, 'Total', 'TotalNeto'),
        moneda: campo(oc, 'Moneda', 'TipoMoneda') ?? '',
        link: `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=${c.codigo}`,
      })
    } catch (e) {
      console.warn(`\n  ⚠ ${c.codigo}: ${e.message}`)
    }
  }
  limpiarProgreso()

  // Leads: organismos que compraron el rubro sin licitar, ordenados por
  // cuántas veces lo hicieron.
  const porOrganismo = new Map()
  for (const d of detalladas) {
    const k = normalizar(d.comprador)
    if (!k) continue
    const acc = porOrganismo.get(k) ?? {
      comprador: d.comprador,
      region: d.region,
      compras: 0,
      directas: 0,
      monto: 0,
      ejemplos: [],
      link: d.link,
    }
    acc.compras++
    if (d.mecanismo !== 'Licitación') acc.directas++
    acc.monto += Number(d.total) || 0
    if (acc.ejemplos.length < 3) acc.ejemplos.push(d.nombre)
    porOrganismo.set(k, acc)
  }

  const leads = [...porOrganismo.values()]
    .map(l => ({
      ...l,
      puntaje: l.directas * 5 + l.compras * 2,
    }))
    .sort((a, b) => b.puntaje - a.puntaje)

  const columnas = [
    { titulo: 'Organismo', valor: l => l.comprador, max: 40 },
    { titulo: 'Mecanismo', valor: l => (l.directas ? 'Trato Directo / Ágil' : 'Licitación'), max: 20 },
    { titulo: 'Compras del rubro', valor: l => `${l.compras} (${l.directas} sin licitar)`, max: 20 },
    { titulo: 'Monto acumulado', valor: l => fmt(Math.round(l.monto)), max: 18 },
    { titulo: 'Región', valor: l => l.region, max: 22 },
    { titulo: 'Qué compró', valor: l => l.ejemplos.join(' | '), max: 60 },
    { titulo: 'Score', valor: l => `${nivel(l.puntaje)} ${l.puntaje}`, max: 10 },
    {
      titulo: 'Acción',
      valor: l =>
        l.directas
          ? `Contactar unidad de compras de ${l.comprador} como proveedor alternativo`
          : 'Seguir sus licitaciones del rubro',
      max: 60,
    },
  ]

  console.log(`\nLEADS POR HISTÓRICO — ${leads.length} organismos compraron el rubro en ${dias} días\n`)
  tabla(leads.slice(0, 30), columnas)

  writeFileSync(
    CACHE,
    JSON.stringify(
      { generado: new Date().toISOString(), dias, recurrencia, leads: leads.slice(0, 100) },
      null,
      2
    ),
    'utf-8'
  )
  console.log(`\n  → ${CACHE} guardado (lo usa \`activas\` para puntuar recurrencia)`)

  const csv = opcion('csv')
  if (csv) aCsv(leads, columnas, csv)
  console.log(`  Peticiones usadas: ${mp.llamadas}`)
}

// ─── detalle / inspeccionar ──────────────────────────────────────────────────

const detalle = async mp => {
  const codigo = argv.filter(a => !a.startsWith('-'))[1]
  if (!codigo) throw new Error('Falta el código. Uso: detalle 1234-56-LE25')
  const resp = await mp.licitacion(codigo)
  const lic = resp.Listado?.[0]
  if (!lic) return console.log('  Sin resultados para ese código.')

  console.log(`\n${lic.CodigoExterno} — ${lic.Nombre}\n`)
  console.log(`  Comprador : ${campo(lic, 'Comprador.NombreOrganismo') ?? '—'}`)
  console.log(`  Unidad    : ${campo(lic, 'Comprador.NombreUnidad') ?? '—'}`)
  console.log(`  Contacto  : ${campo(lic, 'Comprador.NombreUsuario') ?? '—'} ${
    campo(lic, 'Comprador.MailUsuario') ?? ''
  }`)
  console.log(`  Región    : ${campo(lic, 'Comprador.RegionUnidad') ?? '—'}`)
  console.log(`  Estado    : ${campo(lic, 'Estado') ?? '—'}  Tipo: ${campo(lic, 'Tipo') ?? '—'}`)
  console.log(`  Monto est.: ${fmt(campo(lic, 'MontoEstimado'))} ${campo(lic, 'Moneda') ?? ''}`)
  console.log(`  Cierre    : ${fecha(campo(lic, 'FechaCierre', 'Fechas.FechaCierre'))}`)
  console.log(`\n  Descripción:\n    ${(campo(lic, 'Descripcion') ?? '—').slice(0, 1200)}`)

  const items = campo(lic, 'Items.Listado') ?? []
  if (items.length) {
    console.log(`\n  Items (${items.length}):`)
    tabla(items.slice(0, 20), [
      { titulo: 'UNSPSC', valor: i => campo(i, 'CodigoCategoria'), max: 12 },
      { titulo: 'Categoría', valor: i => campo(i, 'Categoria'), max: 34 },
      { titulo: 'Descripción', valor: i => campo(i, 'NombreProducto', 'Descripcion'), max: 50 },
      { titulo: 'Cant.', valor: i => fmt(campo(i, 'Cantidad')), max: 8 },
    ])
  }

  const op = puntuarLicitacion(lic)
  if (op) {
    console.log(`\n  Score: ${nivel(op.puntaje)} (${op.puntaje}) — ${op.razones.join(' · ')}`)
    console.log(`  Acción: ${accionRecomendada(op)}`)
  } else {
    console.log('\n  No pega con el perfil de scripts/lib/perfilProveedor.mjs.')
  }
}

/** Vuelca el JSON crudo, para confirmar nombres de campos contra la API real. */
const inspeccionar = async mp => {
  const codigo = argv.filter(a => !a.startsWith('-'))[1]
  if (!codigo) throw new Error('Falta el código. Uso: inspeccionar 1234-56-LE25')
  const esOrden = /^\d+-\d+-(SE|AG|CM)/i.test(codigo)
  const resp = esOrden ? await mp.orden(codigo) : await mp.licitacion(codigo)
  console.log(JSON.stringify(resp, null, 2).slice(0, 20_000))
}

// ─── main ────────────────────────────────────────────────────────────────────

const comandos = { verificar, activas, historico, detalle, inspeccionar }

if (!comandos[comando]) {
  console.error(`Comando desconocido: ${comando}`)
  console.error(`Disponibles: ${Object.keys(comandos).join(', ')}`)
  process.exit(1)
}

try {
  const mp = crearCliente()
  await comandos[comando](mp)
} catch (e) {
  if (e instanceof ErrorMercadoPublico) {
    console.error(`\n✗ ${e.message}`)
    if (e.cuerpo) console.error(`  respuesta: ${e.cuerpo}`)
  } else {
    console.error(`\n✗ ${e.message}`)
  }
  process.exit(1)
}
