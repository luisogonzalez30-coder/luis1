// Solo lectura: formato del campo `coordenadas` y últimos reportes entrados.
import admin from 'firebase-admin'
import { readFileSync } from 'fs'
const c = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf-8'))
admin.initializeApp({ credential: admin.credential.cert(c) })
const db = admin.firestore()

for (const muni of ['demo', 'licanten']) {
  const snap = await db.collection('incidencias').where('municipio_id', '==', muni).get()
  const formatos = {}
  snap.forEach(d => {
    const co = d.data().coordenadas
    formatos[Object.keys(co ?? {}).sort().join('+') || '(vacío)'] =
      (formatos[Object.keys(co ?? {}).sort().join('+') || '(vacío)'] ?? 0) + 1
  })
  console.log(`\n${muni}: ${JSON.stringify(formatos)}`)

  const recientes = snap.docs
    .sort((a, b) => (b.data().fecha_creacion?._seconds ?? 0) - (a.data().fecha_creacion?._seconds ?? 0))
    .slice(0, 3)
  console.log('  últimos 3:')
  recientes.forEach(d => {
    const x = d.data()
    const f = x.fecha_creacion?.toDate?.()
    console.log(`   ${f ? f.toISOString().slice(0, 16).replace('T', ' ') : '?'} | ${x.numero_ticket} | ${x.categoria} | "${x.direccion_texto ?? ''}" | tel:${x.contacto_ciudadano ?? '—'} | ${x.nombre_ciudadano ?? '—'}`)
  })
}
process.exit(0)
