// Borra reportes de prueba de un municipio real, con respaldo previo.
//
// Por qué hace falta: en Licantén quedaron los reportes de las pruebas y de la
// presentación. Mientras era una demo no importaba; con el municipio operando,
// las estadísticas del primer mes y la primera Cuenta Pública nacen contaminadas
// —y hay basura visible, como un reporte cuya dirección es de otra ciudad—.
//
// **Este script NUNCA decide qué es prueba.** Esa decisión es de una persona que
// conoce la comuna: acá se listan los reportes con todo lo necesario para
// juzgarlos, y el borrado exige que se le pasen los números de ticket uno por
// uno. No hay ningún "borra lo que parezca prueba": un heurístico equivocado
// borraría el reporte real de un vecino, que es un dato que no se puede
// reconstruir.
//
// Antes de borrar deja un respaldo completo en backups/, así que el borrado es
// reversible mientras ese archivo exista.
//
// Uso:
//   node scripts/limpiar-reportes-prueba.mjs licanten
//       lista todos los reportes del municipio, sin tocar nada
//
//   node scripts/limpiar-reportes-prueba.mjs licanten --borrar 955353 992675
//       respalda y borra SOLO esos tickets
//
// Requiere serviceAccountKey.json en la raíz del proyecto.

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import admin from 'firebase-admin'

const argumentos = process.argv.slice(2)
const municipioId = argumentos.find((a) => !a.startsWith('--'))
const indiceBorrar = argumentos.indexOf('--borrar')
const ticketsABorrar =
  indiceBorrar >= 0 ? argumentos.slice(indiceBorrar + 1).filter((a) => !a.startsWith('--')) : []

if (!municipioId) {
  console.error('Uso: node scripts/limpiar-reportes-prueba.mjs <municipio> [--borrar <ticket> <ticket> ...]')
  process.exit(1)
}

const credencial = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf-8'))
admin.initializeApp({ credential: admin.credential.cert(credencial) })
const db = admin.firestore()

const snap = await db
  .collection('incidencias')
  .where('municipio_id', '==', municipioId)
  .orderBy('fecha_creacion', 'desc')
  .get()

if (snap.empty) {
  console.log(`\nNo hay reportes en "${municipioId}".\n`)
  process.exit(0)
}

const reportes = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

// --- Listado para decidir -----------------------------------------------------
if (ticketsABorrar.length === 0) {
  console.log(`\n${reportes.length} reportes en "${municipioId}":\n`)
  console.log('ticket   | fecha      | estado     | categoría              | fotos | wsp | lugar')
  console.log('-'.repeat(110))

  for (const r of reportes) {
    console.log(
      [
        String(r.numero_ticket || r.id).padEnd(8),
        r.fecha_creacion?.toDate().toISOString().slice(0, 10) || '¿?',
        String(r.estado || '').padEnd(10),
        String(r.categoria || '').slice(0, 22).padEnd(22),
        String((r.fotos_antes_urls || []).length).padStart(5),
        (r.contacto_ciudadano ? 'sí ' : 'no ').padStart(4),
        String(r.direccion_texto || '').slice(0, 38),
      ].join(' | ')
    )
    if (r.detalles_adicionales) console.log(' '.repeat(10) + '↳ ' + String(r.detalles_adicionales).slice(0, 92))
  }

  console.log(`
Para borrar, pasa los números de ticket explícitamente:

  node scripts/limpiar-reportes-prueba.mjs ${municipioId} --borrar 111111 222222

Qué mirar para decidir: una dirección de otra ciudad, una categoría que no calza
con lo que dice el detalle, o un texto que dice "prueba". Si dudas de uno, déjalo:
borrar el reporte real de un vecino no se puede deshacer.
`)
  process.exit(0)
}

// --- Borrado ------------------------------------------------------------------
const porTicket = new Map(reportes.map((r) => [String(r.numero_ticket || r.id), r]))
const elegidos = []
const noEncontrados = []

for (const t of ticketsABorrar) {
  const r = porTicket.get(String(t))
  if (r) elegidos.push(r)
  else noEncontrados.push(t)
}

if (noEncontrados.length > 0) {
  console.error(`\nEstos tickets no existen en "${municipioId}": ${noEncontrados.join(', ')}`)
  console.error('No se borró nada: revisa los números y vuelve a intentar.\n')
  process.exit(1)
}

console.log(`\nSe van a borrar ${elegidos.length} reportes de "${municipioId}":\n`)
for (const r of elegidos) {
  console.log(`  ${r.numero_ticket}  ${String(r.categoria).slice(0, 22).padEnd(22)}  ${String(r.direccion_texto || '').slice(0, 40)}`)
}

// Respaldo primero. Incluye los seguimientos, que viven en una subcolección y se
// perderían sin dejar rastro.
const respaldo = []
for (const r of elegidos) {
  const seguimientos = await db.collection('incidencias').doc(r.id).collection('seguimientos').get()
  const ticketPublico = await db.collection('tickets_publicos').doc(String(r.numero_ticket)).get()
  respaldo.push({
    incidencia: r,
    ticket_publico: ticketPublico.exists ? ticketPublico.data() : null,
    seguimientos: seguimientos.docs.map((d) => ({ id: d.id, ...d.data() })),
  })
}

mkdirSync('backups', { recursive: true })
const fecha = new Date().toISOString().slice(0, 10)
const archivo = `backups/reportes-borrados-${municipioId}-${fecha}.json`
writeFileSync(
  archivo,
  JSON.stringify(
    { generado: new Date().toISOString(), municipio: municipioId, motivo: 'limpieza de reportes de prueba', reportes: respaldo },
    null,
    2
  )
)
console.log(`\nRespaldo guardado en ${archivo}`)

// De a uno y en este orden: primero los seguimientos y el ticket público, y la
// incidencia al final. Si algo falla a medias, lo que queda es la incidencia
// —que es donde está toda la información— y no un huérfano invisible.
let borrados = 0
for (const r of elegidos) {
  try {
    const seguimientos = await db.collection('incidencias').doc(r.id).collection('seguimientos').get()
    for (const s of seguimientos.docs) await s.ref.delete()

    if (r.numero_ticket) await db.collection('tickets_publicos').doc(String(r.numero_ticket)).delete()

    await db.collection('incidencias').doc(r.id).delete()
    borrados++
    console.log(`  borrado ${r.numero_ticket}`)
  } catch (error) {
    console.error(`  NO se pudo borrar ${r.numero_ticket}: ${error.message}`)
  }
}

console.log(`\nListo: ${borrados} de ${elegidos.length} borrados.`)
console.log(`Si necesitas revisar qué se eliminó, está todo en ${archivo}\n`)
process.exit(0)
