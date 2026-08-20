// Quita del tenant "demo" los perfiles de Jefe de Departamento duplicados que
// quedaron de pruebas antiguas, para que cada departamento tenga un solo jefe
// visible durante una presentación.
//
// NO borra la cuenta de Firebase Auth: solo el documento de perfil en
// usuarios_municipales, y previo respaldo a backups/. La cuenta sigue existiendo
// y se puede reponer volviendo a escribir el documento con el mismo uid.
//
// Uso:
//   node scripts/quitar-jefes-duplicados-demo.mjs              (informa, NO escribe)
//   node scripts/quitar-jefes-duplicados-demo.mjs --aplicar    (escribe de verdad)

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import admin from 'firebase-admin'
import { DEPARTAMENTOS } from '../src/utils/departamento.js'

const APLICAR = process.argv.includes('--aplicar')
const MUNICIPIO_ID = 'demo'

// Los correos que SÍ se conservan: los canónicos que creó preparar-cuentas-demo.
const CANONICOS = /^(jefe[a-z]+|alcalde)\.demo@tumuniaqui\.cl$/

const credencial = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf-8'))
admin.initializeApp({ credential: admin.credential.cert(credencial) })
const db = admin.firestore()

// Se filtra por rol en memoria a propósito: la consulta compuesta
// (municipio_id + rol) necesita un índice que este proyecto no tiene y la
// llamada se queda colgada sin devolver error.
const snap = await db.collection('usuarios_municipales').where('municipio_id', '==', MUNICIPIO_ID).get()

const porDepto = {}
for (const d of snap.docs) {
  const u = d.data()
  if (u.rol !== 'JEFE_DEPARTAMENTO') continue
  ;(porDepto[u.departamento] ||= []).push({ ref: d.ref, id: d.id, ...u })
}

const sobrantes = []
for (const dep of DEPARTAMENTOS) {
  const lista = porDepto[dep] || []
  if (lista.length <= 1) {
    console.log(`  OK        ${dep.padEnd(28)} ${lista.length} jefe${lista.length === 1 ? '' : 's'}`)
    continue
  }
  const canonico = lista.find((u) => CANONICOS.test(u.correo || ''))
  if (!canonico) {
    console.log(`  ATENCIÓN  ${dep.padEnd(28)} ${lista.length} jefes y NINGUNO canónico, no toco nada`)
    continue
  }
  console.log(`  DUPLICADO ${dep.padEnd(28)} conservo ${canonico.correo}`)
  for (const u of lista) {
    if (u.id === canonico.id) continue
    console.log(`            quitar -> ${u.correo}  (uid ${u.id})`)
    sobrantes.push(u)
  }
}

if (!sobrantes.length) {
  console.log('\nNo hay duplicados que quitar.')
  process.exit(0)
}

if (!APLICAR) {
  console.log(`\nSe quitarían ${sobrantes.length} perfiles. Las cuentas de Auth quedan intactas.`)
  console.log('Para aplicarlo: node scripts/quitar-jefes-duplicados-demo.mjs --aplicar\n')
  process.exit(0)
}

mkdirSync('backups', { recursive: true })
const archivo = `backups/jefes-duplicados-demo-${new Date().toISOString().slice(0, 10)}.json`
writeFileSync(
  archivo,
  JSON.stringify(
    sobrantes.map(({ ref, ...resto }) => resto),
    null,
    2
  )
)
console.log(`\nRespaldo escrito en ${archivo}`)

const lote = db.batch()
for (const u of sobrantes) lote.delete(u.ref)
await lote.commit()

console.log(`Quitados ${sobrantes.length} perfiles duplicados. Las cuentas de Firebase Auth NO se tocaron.`)
process.exit(0)
