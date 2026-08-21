// Refresca el tenant "demo" para que el panel del Alcalde se vea vivo:
// fechas repartidas en los ultimos 12 meses con actividad del mes en curso, y
// fotos asignadas por categoria.
//
// El tenant "demo" existe para mostrar volumen y sale rotulado "(demostracion)"
// en el titulo. NO toca "licanten" ni ningun municipio real.
//
// Respalda antes de escribir, en backups/demo-antes-de-refrescar-<fecha>.json.
//
// Uso:
//   node scripts/refrescar-demo.mjs             -> muestra que haria
//   node scripts/refrescar-demo.mjs --aplicar   -> escribe de verdad

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import admin from 'firebase-admin'

const APLICAR = process.argv.includes('--aplicar')
const TENANT = 'demo'

const cred = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf-8'))
admin.initializeApp({ credential: admin.credential.cert(cred) })
const db = admin.firestore()
const { Timestamp } = admin.firestore

const AHORA = new Date()
const fechaHoy = AHORA.toISOString().slice(0, 10)

// Generador con semilla: dos corridas dan el mismo resultado, asi el dry-run
// muestra exactamente lo que despues se escribe.
let semilla = 20260818
const azar = () => {
  semilla = (semilla * 1103515245 + 12345) & 0x7fffffff
  return semilla / 0x7fffffff
}
const entre = (a, b) => a + Math.floor(azar() * (b - a + 1))
const elegir = (xs) => xs[Math.floor(azar() * xs.length)]

// Fotos reales que ya viven en el sistema, por categoria.
const FOTOS = {
  Escombros: ['https://res.cloudinary.com/ugiblcuk/image/upload/v1785540554/incidencias/1xXVjGfjVzoOZkNR0FlN/antes/vwtiayfeusl2ni25waak.jpg'],
  Falta_recoleccion: ['https://res.cloudinary.com/ugiblcuk/image/upload/v1785540094/incidencias/4F2fT3LvMURwpASh7FCJ/antes/sqkgmqxel6engkvflnfk.jpg'],
  Semaforo_peatonal: ['https://res.cloudinary.com/ugiblcuk/image/upload/v1786452209/incidencias/F2vk7k2aBtYnmHTfJ4jc/antes/dkaplmtdm3y1tjur0ihy.jpg'],
  Basural: ['https://res.cloudinary.com/ugiblcuk/image/upload/v1785539650/incidencias/JecouDfxnSFbuNoU8iZw/antes/wbiv64lype7siqkc0syv.jpg'],
  Cableado_expuesto: ['https://res.cloudinary.com/ugiblcuk/image/upload/v1785532019/incidencias/KRpyQSq7XbdP4SkWvY8N/antes/dnotnpxpgcnwvjhzuhd4.webp'],
  Grafiti: ['https://res.cloudinary.com/ugiblcuk/image/upload/v1785538937/incidencias/Ob4tcl7m0DYslsgb44Rq/antes/xet8gbyucwbdjlp9vcd7.jpg'],
  Corte_agua: ['https://res.cloudinary.com/ugiblcuk/image/upload/v1785535213/incidencias/RWj7qhjx6depNGPioSCA/antes/mgppjsxwjhxd4fra7eca.jpg'],
  Consumo_via_publica: ['https://res.cloudinary.com/ugiblcuk/image/upload/v1786900714/incidencias/vK9pBcSaUoZlckkKGX6x/antes/x5ph07vgguz2vcyxds5u.jpg'],
}

// Fotos que quedaron del tenant licanten al limpiarlo: son fotos reales de vía
// publica y sirven para las categorias equivalentes del demo.
function sumarFotosDelRespaldo() {
  const ruta = `./backups/licanten-antes-de-limpiar-${fechaHoy}.json`
  if (!existsSync(ruta)) return
  const r = JSON.parse(readFileSync(ruta, 'utf-8'))
  // Solo las que son fotografias de verdad: las .png de ese respaldo eran
  // capturas y un logo de cafeteria, no sirven para mostrar.
  for (const inc of r.incidencias || []) {
    const url = (inc.datos.fotos_antes_urls || [])[0]
    if (!url || url.endsWith('.png')) continue
    const cat = inc.datos.categoria
    if (!FOTOS[cat]) FOTOS[cat] = []
    if (!FOTOS[cat].includes(url)) FOTOS[cat].push(url)
  }
}

function repartirFecha(i, total) {
  // Mas denso hacia el presente: un municipio que arranco hace un año y hoy
  // recibe mas reportes que al principio.
  const t = i / total
  const diasAtras = Math.round(360 * Math.pow(1 - t, 1.6))
  const d = new Date(AHORA)
  d.setDate(d.getDate() - diasAtras)
  d.setHours(entre(8, 19), entre(0, 59), entre(0, 59), 0)
  return d
}

function horasDeCierre(fechaCreacion) {
  // El tiempo de respuesta mejora con los meses: es lo que hace que la
  // comparacion mes contra mes muestre una curva y no ruido.
  const meses = (AHORA - fechaCreacion) / (1000 * 60 * 60 * 24 * 30)
  const base = 24 + meses * 12
  return Math.max(3, Math.round(base * (0.5 + azar())))
}

async function main() {
  const snap = await db.collection('incidencias').where('municipio_id', '==', TENANT).get()
  if (snap.empty) { console.log('El tenant demo esta vacio.'); return }
  sumarFotosDelRespaldo()

  const docs = [...snap.docs].sort((a, b) => a.id.localeCompare(b.id))
  const total = docs.length
  const plan = []
  let conFoto = 0, resueltosMes = 0, creadosMes = 0, emergencias = 0, yaTenianFoto = 0

  docs.forEach((doc, i) => {
    const x = doc.data()
    const creacion = repartirFecha(i, total)
    const cambios = { fecha_creacion: Timestamp.fromDate(creacion) }

    if (x.estado === 'Resuelto') {
      const cierre = new Date(creacion.getTime() + horasDeCierre(creacion) * 3600 * 1000)
      if (cierre < AHORA) {
        cambios.fecha_cierre = Timestamp.fromDate(cierre)
        if (cierre.getMonth() === AHORA.getMonth() &&
            cierre.getFullYear() === AHORA.getFullYear()) resueltosMes++
      }
    }
    if (creacion.getMonth() === AHORA.getMonth() &&
        creacion.getFullYear() === AHORA.getFullYear()) creadosMes++
    if (x.nivel_gravedad === 'Alta' && x.estado !== 'Resuelto') emergencias++

    const fotos = FOTOS[x.categoria]
    const yaTiene = (x.fotos_antes_urls || []).length > 0
    if (yaTiene) yaTenianFoto++
    if (fotos && !yaTiene) { cambios.fotos_antes_urls = [elegir(fotos)]; conFoto++ }

    plan.push({ id: doc.id, ticket: x.numero_ticket, cat: x.categoria,
                estado: x.estado, creacion, cambios })
  })

  console.log(`\nTenant "${TENANT}" — ${total} incidencias`)
  console.log(`  fechas repartidas sobre los ultimos 12 meses`)
  console.log(`  creados en el mes en curso : ${creadosMes}`)
  console.log(`  resueltos en el mes en curso: ${resueltosMes}`)
  console.log(`  emergencias activas (Alta sin resolver): ${emergencias}`)
  console.log(`  fotos que se agregan: ${conFoto} (ya tenian: ${yaTenianFoto}, quedan con foto: ${conFoto + yaTenianFoto} de ${total})`)
  console.log(`  categorias con foto disponible: ${Object.keys(FOTOS).length}\n`)
  console.log('  primeros 8 del plan:')
  for (const p of plan.slice(0, 8)) {
    console.log(`    ${p.cat.padEnd(24)} ${p.estado.padEnd(11)} ${p.creacion.toISOString().slice(0, 10)}`
      + (p.cambios.fotos_antes_urls ? '  +foto' : ''))
  }

  if (!APLICAR) {
    console.log('\nSimulacion. Nada se escribio.')
    console.log('Para aplicar: node scripts/refrescar-demo.mjs --aplicar')
    return
  }

  if (!existsSync('./backups')) mkdirSync('./backups')
  const respaldo = docs.map((d) => ({ id: d.id, datos: d.data() }))
  const ruta = `./backups/demo-antes-de-refrescar-${fechaHoy}.json`
  writeFileSync(ruta, JSON.stringify(respaldo, null, 2), 'utf-8')
  console.log(`\nRespaldo escrito en ${ruta}`)

  // tickets_publicos refleja a incidencias: hay que mover los dos o la pagina
  // publica y la consulta de ticket quedan contando otra cosa que el panel.
  const tickets = await db.collection('tickets_publicos')
    .where('municipio_id', '==', TENANT).get()
  const porIncidencia = new Map()
  for (const t of tickets.docs) porIncidencia.set(t.data().incidencia_id, t.ref)

  let lote = db.batch(), enLote = 0, escritos = 0
  for (const p of plan) {
    lote.update(db.collection('incidencias').doc(p.id), p.cambios); enLote++; escritos++
    const ref = porIncidencia.get(p.id)
    if (ref) {
      const espejo = { fecha_creacion: p.cambios.fecha_creacion }
      if (p.cambios.fecha_cierre) espejo.fecha_cierre = p.cambios.fecha_cierre
      if (p.cambios.fotos_antes_urls) espejo.fotos_antes_urls = p.cambios.fotos_antes_urls
      lote.update(ref, espejo); enLote++; escritos++
    }
    if (enLote >= 400) { await lote.commit(); lote = db.batch(); enLote = 0 }
  }
  if (enLote) await lote.commit()

  console.log(`Actualizados ${escritos} documentos (incidencias + tickets_publicos).`)
}

main().then(() => process.exit(0)).catch((e) => {
  console.error('Error:', e.message)
  process.exit(1)
})
