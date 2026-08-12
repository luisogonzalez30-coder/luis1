// Repara el traslado fallido del 11-ago-2026 (§43.1).
//
// Uso:
//   node scripts/reparar-coordenadas.mjs            (simulacro)
//   node scripts/reparar-coordenadas.mjs --aplicar
//
// QUÉ PASÓ
// --------
// `corregir-demo.mjs` movió 48 reportes del demo al centro real de Licantén,
// pero los escribió en las claves `latitude`/`longitude`. El campo
// `coordenadas` de esta base usa **`lat`/`lng`** — es lo que leen
// MapaIncidencias.jsx y el resto del frontend. Resultado: cada uno de esos 48
// documentos quedó con las dos cosas, el `lat`/`lng` viejo (mal, sobre los
// potreros) y un `latitude`/`longitude` nuevo que nadie lee. En el mapa no se
// movió nada.
//
// El chequeo tampoco lo detectó porque leía `latitude ?? lat`, o sea prefería
// justamente el campo recién escrito. Un verificador que comparte el error del
// escritor confirma cualquier cosa: hay que leer por donde lee la aplicación.
//
// QUÉ HACE ESTE SCRIPT
// --------------------
// En los documentos que tengan ambos pares: copia `latitude`/`longitude` a
// `lat`/`lng` y borra el par sobrante. No recalcula el desplazamiento — el
// valor bueno ya está guardado, solo está en la clave equivocada.

import admin from 'firebase-admin'
import { readFileSync } from 'fs'

const APLICAR = process.argv.includes('--aplicar')

const credencial = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf-8'))
admin.initializeApp({ credential: admin.credential.cert(credencial) })
const db = admin.firestore()

const snap = await db.collection('incidencias').get()
if (!APLICAR) console.log('*** SIMULACRO — no se escribe nada. Agrega --aplicar. ***\n')

const lote = db.batch()
let reparados = 0
let sanos = 0

for (const doc of snap.docs) {
  const co = doc.data().coordenadas
  if (!co || typeof co.latitude !== 'number') { sanos++; continue }

  const nuevo = { lat: co.latitude, lng: co.longitude }
  reparados++
  if (reparados <= 3) {
    console.log(`  ${doc.data().numero_ticket}: {lat:${co.lat}, lng:${co.lng}} -> {lat:${nuevo.lat.toFixed(6)}, lng:${nuevo.lng.toFixed(6)}}`)
  }
  if (APLICAR) lote.update(doc.ref, { coordenadas: nuevo })
}

if (APLICAR) await lote.commit()

console.log(`\n${APLICAR ? 'Reparados' : 'Se repararían'}: ${reparados}`)
console.log(`Ya estaban bien: ${sanos}`)
process.exit(0)
