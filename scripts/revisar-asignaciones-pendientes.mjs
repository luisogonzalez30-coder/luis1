// Solo lectura. Qué pasaría al encender WHATSAPP_TEMPLATE_ASIGNACION (§42).
//
// El listener escucha `estado == 'En Proceso' AND notificado_whatsapp_asignacion
// == false` y dispara sobre TODO lo que ya cumple la condición, no solo sobre lo
// que cambie de ahora en adelante. Con la plantilla aprobada y la variable
// puesta en Render, esos avisos salen de golpe al primer arranque.
//
// Uso: node scripts/revisar-asignaciones-pendientes.mjs

import admin from 'firebase-admin'
import { readFileSync } from 'fs'

const credencial = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf-8'))
admin.initializeApp({ credential: admin.credential.cert(credencial) })
const db = admin.firestore()

const snap = await db
  .collection('incidencias')
  .where('estado', '==', 'En Proceso')
  .where('notificado_whatsapp_asignacion', '==', false)
  .get()

console.log(`Dispararían ${snap.size} avisos al encender la plantilla.\n`)

const porMuni = {}
snap.forEach(d => {
  const x = d.data()
  const m = x.municipio_id ?? '?'
  porMuni[m] = porMuni[m] ?? { conTelefono: [], sinTelefono: 0 }
  if (x.contacto_ciudadano) {
    const f = x.fecha_creacion?.toDate?.()
    const dias = f ? Math.round((Date.now() - f.getTime()) / 86400000) : '?'
    porMuni[m].conTelefono.push(
      `${x.numero_ticket} | ${x.contacto_ciudadano} | ${x.cuadrilla_asignada ?? '(sin cuadrilla)'} | hace ${dias}d | "${(x.direccion_texto ?? '').slice(0, 34)}"`
    )
  } else {
    porMuni[m].sinTelefono++
  }
})

for (const [muni, v] of Object.entries(porMuni)) {
  console.log(`=== ${muni} ===`)
  console.log(`  se marcan y NO envían (sin teléfono): ${v.sinTelefono}`)
  console.log(`  ENVÍAN MENSAJE REAL: ${v.conTelefono.length}`)
  v.conTelefono.forEach(l => console.log(`    · ${l}`))
}

process.exit(0)
