// Borra los reportes de prueba del tenant "licanten" para dejar la comuna
// presentable antes de mostrarla a la Municipalidad.
//
// Respalda ANTES de borrar: todo lo que elimina queda escrito en
// backups/licanten-antes-de-limpiar-<fecha>.json, para poder reponerlo.
//
// Uso:
//   node scripts/limpiar-demo-licanten.mjs              -> muestra qué haría
//   node scripts/limpiar-demo-licanten.mjs --aplicar    -> borra de verdad
//
// Mismo patrón dry-run / --aplicar del resto de los scripts.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import admin from 'firebase-admin'

const APLICAR = process.argv.includes('--aplicar')
const MUNICIPIO = 'licanten'

const credencial = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf-8'))
admin.initializeApp({ credential: admin.credential.cert(credencial) })
const db = admin.firestore()

const fecha = new Date().toISOString().slice(0, 10)

async function main() {
  const incidencias = await db.collection('incidencias')
    .where('municipio_id', '==', MUNICIPIO).get()
  const tickets = await db.collection('tickets_publicos')
    .where('municipio_id', '==', MUNICIPIO).get()

  console.log(`\nTenant "${MUNICIPIO}"`)
  console.log(`  incidencias      : ${incidencias.size}`)
  console.log(`  tickets_publicos : ${tickets.size}\n`)

  if (incidencias.empty && tickets.empty) {
    console.log('No hay nada que limpiar.')
    return
  }

  // Las subcolecciones no se borran solas al borrar el documento padre.
  const respaldo = { fecha, municipio: MUNICIPIO, incidencias: [], tickets: [], seguimientos: [] }

  for (const doc of incidencias.docs) {
    respaldo.incidencias.push({ id: doc.id, datos: doc.data() })
    const segs = await doc.ref.collection('seguimientos').get()
    for (const s of segs.docs) {
      respaldo.seguimientos.push({ incidencia: doc.id, id: s.id, datos: s.data() })
    }
    const d = doc.data()
    console.log(`  [incidencia] ${doc.id}  ${d.categoria || '?'} · ${d.estado || '?'}`
      + ` · ${segs.size} seguimiento(s)`)
  }
  for (const doc of tickets.docs) {
    respaldo.tickets.push({ id: doc.id, datos: doc.data() })
    console.log(`  [ticket]     ${doc.id}  ${doc.data().categoria || '?'}`)
  }

  if (!APLICAR) {
    console.log('\nSimulación. Nada se borró.')
    console.log('Para aplicar: node scripts/limpiar-demo-licanten.mjs --aplicar')
    return
  }

  if (!existsSync('./backups')) mkdirSync('./backups')
  const ruta = `./backups/licanten-antes-de-limpiar-${fecha}.json`
  writeFileSync(ruta, JSON.stringify(respaldo, null, 2), 'utf-8')
  console.log(`\nRespaldo escrito en ${ruta}`)

  let borrados = 0
  for (const doc of incidencias.docs) {
    const segs = await doc.ref.collection('seguimientos').get()
    for (const s of segs.docs) { await s.ref.delete(); borrados++ }
    await doc.ref.delete(); borrados++
  }
  for (const doc of tickets.docs) { await doc.ref.delete(); borrados++ }

  console.log(`Borrados ${borrados} documentos.`)
  console.log('La comuna queda en cero, lista para el lanzamiento.')
}

main().then(() => process.exit(0)).catch((e) => {
  console.error('Error:', e.message)
  process.exit(1)
})
