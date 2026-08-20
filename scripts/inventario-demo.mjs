// Inventario de solo lectura del tenant que se le pase por argumento.
// No escribe nada. Sirve para saber con qué se cuenta antes de una demo.
//
// Uso:  node scripts/inventario-demo.mjs [demo|licanten]

import { readFileSync } from 'fs'
import admin from 'firebase-admin'

const MUNICIPIO_ID = process.argv[2] || 'demo'

const credencial = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf-8'))
admin.initializeApp({ credential: admin.credential.cert(credencial) })
const db = admin.firestore()

const cuenta = (arr, clave) =>
  arr.reduce((acc, d) => {
    const k = clave(d) ?? '(sin dato)'
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {})

const tabla = (obj) =>
  Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `    ${String(k).padEnd(34)} ${v}`)
    .join('\n')

console.log(`\n=== TENANT: ${MUNICIPIO_ID} ===\n`)

const muni = await db.collection('municipalidades').doc(MUNICIPIO_ID).get()
if (!muni.exists) {
  console.log('  El documento de municipalidad NO existe.')
} else {
  const d = muni.data()
  console.log(`  nombre        ${d.nombre}`)
  console.log(`  centro_mapa   ${JSON.stringify(d.centro_mapa)}`)
  console.log(`  sectores      ${(d.sectores || []).length}`)
  for (const s of d.sectores || []) {
    console.log(`      - ${String(s.nombre).padEnd(24)} ${s.lat},${s.lng}  r=${s.radio_metros}m`)
  }
}

const inc = await db.collection('incidencias').where('municipio_id', '==', MUNICIPIO_ID).get()
const docs = inc.docs.map((d) => ({ id: d.id, ...d.data() }))
console.log(`\n  INCIDENCIAS: ${docs.length}`)

if (docs.length) {
  console.log('\n  por estado:')
  console.log(tabla(cuenta(docs, (d) => d.estado)))
  console.log('\n  por departamento:')
  console.log(tabla(cuenta(docs, (d) => d.departamento)))
  console.log('\n  por gravedad:')
  console.log(tabla(cuenta(docs, (d) => d.gravedad)))
  console.log('\n  con cuadrilla asignada:')
  console.log(tabla(cuenta(docs, (d) => (d.cuadrilla_asignada ? 'sí' : 'no'))))

  const fechas = docs
    .map((d) => d.fecha_creacion?.toDate?.())
    .filter(Boolean)
    .sort((a, b) => a - b)
  if (fechas.length) {
    console.log(`\n  rango de fechas: ${fechas[0].toISOString().slice(0, 10)} -> ${fechas[fechas.length - 1].toISOString().slice(0, 10)}`)
  }

  const conFoto = docs.filter((d) => d.foto_url || (d.fotos || []).length).length
  console.log(`  con foto: ${conFoto} de ${docs.length}`)

  console.log('\n  --- ESQUEMA de un documento de ejemplo ---')
  const ej = docs.find((d) => d.estado !== 'Resuelto') || docs[0]
  for (const [k, v] of Object.entries(ej).sort()) {
    let muestra
    if (v && typeof v.toDate === 'function') muestra = `<Timestamp ${v.toDate().toISOString()}>`
    else if (Array.isArray(v)) muestra = `<Array(${v.length})> ${JSON.stringify(v).slice(0, 90)}`
    else if (v && typeof v === 'object') muestra = JSON.stringify(v).slice(0, 90)
    else muestra = JSON.stringify(v)
    console.log(`    ${k.padEnd(26)} ${String(muestra).slice(0, 100)}`)
  }
}

const us = await db.collection('usuarios_municipales').where('municipio_id', '==', MUNICIPIO_ID).get()
console.log(`\n  USUARIOS MUNICIPALES: ${us.size}`)
for (const d of us.docs) {
  const u = d.data()
  console.log(`    ${String(u.rol).padEnd(20)} ${String(u.departamento || '-').padEnd(28)} ${u.correo}`)
}

const cuad = await db.collection('cuadrillas').where('municipio_id', '==', MUNICIPIO_ID).get().catch(() => null)
if (cuad) {
  console.log(`\n  CUADRILLAS: ${cuad.size}`)
  for (const d of cuad.docs) {
    const c = d.data()
    console.log(`    ${String(c.nombre || d.id).padEnd(30)} ${c.departamento || '-'}`)
  }
}

console.log('')
process.exit(0)
