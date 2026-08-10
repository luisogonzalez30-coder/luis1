// Borra los "tickets públicos huérfanos": documentos en tickets_publicos cuya
// incidencia no existe.
//
// De dónde salieron (ver §40 de ESTADO_PROYECTO.md): hasta el 10-ago-2026,
// crearIncidencia escribía el ticket público ANTES de la incidencia y en una
// operación separada. Cuando la incidencia era rechazada —el caso real es el
// enfriamiento anti-spam de 60 s, que responde permission-denied— el ticket
// quedaba solo. Un huérfano hace daño de tres formas:
//   1. aparece en el mapa del vecino y en "Últimos reportes de la comuna",
//      como si el municipio tuviera un reporte que en realidad no recibió;
//   2. hace saltar el aviso de "posible duplicado" al vecino siguiente, que
//      termina sumándose (+1) a un reporte que no existe;
//   3. ocupa un número de ticket que ya no se puede volver a usar.
//
// El bug está arreglado, así que esto es una limpieza de una sola vez. Se deja
// en el repo porque el chequeo sirve igual como auditoría.
//
// Uso:
//   node scripts/limpiar-tickets-huerfanos.mjs                 (solo informa, NO borra)
//   node scripts/limpiar-tickets-huerfanos.mjs --borrar        (borra de verdad)
//   node scripts/limpiar-tickets-huerfanos.mjs --municipio licanten
//
// Requiere serviceAccountKey.json en la raíz del proyecto.

import { readFileSync } from 'fs'
import admin from 'firebase-admin'

const argumentos = process.argv.slice(2)
const borrarDeVerdad = argumentos.includes('--borrar')
const indiceMunicipio = argumentos.indexOf('--municipio')
const municipioFiltro = indiceMunicipio >= 0 ? argumentos[indiceMunicipio + 1] : null

const credencial = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf-8'))
admin.initializeApp({ credential: admin.credential.cert(credencial) })
const db = admin.firestore()

const consulta = municipioFiltro
  ? db.collection('tickets_publicos').where('municipio_id', '==', municipioFiltro)
  : db.collection('tickets_publicos')

const tickets = await consulta.get()

const huerfanos = []
for (const doc of tickets.docs) {
  const datos = doc.data()

  // Sin incidencia_id no se puede verificar nada: se informa pero no se toca.
  if (!datos.incidencia_id) {
    console.log(`?  ${doc.id} no tiene incidencia_id — se deja como está, revísalo a mano.`)
    continue
  }

  const incidencia = await db.collection('incidencias').doc(datos.incidencia_id).get()
  if (!incidencia.exists) {
    huerfanos.push({
      numeroTicket: doc.id,
      municipio: datos.municipio_id,
      categoria: datos.categoria,
      creado: datos.fecha_creacion?.toDate().toISOString().slice(0, 19).replace('T', ' '),
      upvotes: datos.upvotes || 1,
    })
  }
}

console.log(`\nRevisados ${tickets.size} tickets públicos${municipioFiltro ? ` de "${municipioFiltro}"` : ''}.`)

if (huerfanos.length === 0) {
  console.log('No hay huérfanos. Nada que limpiar.')
  process.exit(0)
}

console.log(`\n${huerfanos.length} huérfano(s) — el municipio nunca recibió estos reportes:\n`)
for (const h of huerfanos) {
  const votos = h.upvotes > 1 ? `  ⚠ tiene ${h.upvotes} votos de vecinos` : ''
  console.log(`  ${h.numeroTicket}  ${h.creado}  ${String(h.municipio).padEnd(10)} ${String(h.categoria).padEnd(24)}${votos}`)
}

if (!borrarDeVerdad) {
  console.log('\nEsto fue solo un informe, no se borró nada.')
  console.log('Para borrarlos: node scripts/limpiar-tickets-huerfanos.mjs --borrar')
  process.exit(0)
}

// Se borran de a uno y no en lote, para que un fallo puntual no deje la
// operación a medias sin saber qué alcanzó a pasar.
let borrados = 0
for (const h of huerfanos) {
  try {
    await db.collection('tickets_publicos').doc(h.numeroTicket).delete()
    borrados++
    console.log(`Borrado ${h.numeroTicket}`)
  } catch (error) {
    console.error(`NO se pudo borrar ${h.numeroTicket}: ${error.message}`)
  }
}

console.log(`\nListo: ${borrados} de ${huerfanos.length} huérfanos borrados.`)
process.exit(0)
