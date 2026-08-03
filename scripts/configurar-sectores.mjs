// Carga los sectores de una comuna (villas, poblaciones, sectores rurales) para
// que el Alcalde vea qué territorio concentra los problemas. Ver §33 en
// ESTADO_PROYECTO.md.
//
// Cómo obtener las coordenadas de un sector, sin saber nada técnico:
//   1. Abrir Google Maps y buscar el sector.
//   2. Clic derecho en el centro del sector.
//   3. La primera línea del menú son las coordenadas (ej. -34.9928, -72.0044).
//      Al hacerle clic se copian solas.
//
// El radio es en metros: cuánto abarca el sector desde ese centro. Para una
// villa suelen bastar 400-800; para un sector rural, 2000 o más.
//
// Uso:
//   1. Editar la lista SECTORES de abajo.
//   2. node scripts/configurar-sectores.mjs licanten
//
// Requiere serviceAccountKey.json en la raíz del proyecto.

import { readFileSync } from 'fs'
import admin from 'firebase-admin'

// ---------------------------------------------------------------------------
// EDITAR ACÁ: los sectores reales de la comuna.
// ---------------------------------------------------------------------------
const SECTORES = [
  { nombre: 'Centro', lat: -34.9828, lng: -72.0068, radio_metros: 900 },
  { nombre: 'Sector Norte', lat: -34.9740, lng: -72.0050, radio_metros: 1200 },
  { nombre: 'Sector Sur', lat: -34.9930, lng: -72.0060, radio_metros: 1200 },
  { nombre: 'Lipimávida', lat: -34.9560, lng: -72.1650, radio_metros: 2500 },
  { nombre: 'Iloca', lat: -34.9280, lng: -72.1810, radio_metros: 2500 },
]
// ---------------------------------------------------------------------------

const municipioId = process.argv[2]
if (!municipioId) {
  console.error('Uso: node scripts/configurar-sectores.mjs <municipio>')
  console.error('Ejemplo: node scripts/configurar-sectores.mjs licanten')
  process.exit(1)
}

// Validación temprana: un sector mal escrito no se detecta a simple vista en el
// dashboard (simplemente no le caen incidencias), así que conviene fallar acá.
for (const s of SECTORES) {
  const problema =
    !s.nombre ? 'le falta el nombre'
    : typeof s.lat !== 'number' || typeof s.lng !== 'number' ? 'lat/lng deben ser números (sin comillas)'
    : s.lat < -56 || s.lat > -17 ? `la latitud ${s.lat} queda fuera de Chile`
    : s.lng < -110 || s.lng > -66 ? `la longitud ${s.lng} queda fuera de Chile`
    : !(s.radio_metros > 0) ? 'el radio debe ser mayor que 0'
    : null

  if (problema) {
    console.error(`Sector inválido ("${s.nombre || 'sin nombre'}"): ${problema}`)
    process.exit(1)
  }
}

const credencial = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf-8'))
admin.initializeApp({ credential: admin.credential.cert(credencial) })
const db = admin.firestore()

const ref = db.doc(`municipalidades/${municipioId}`)
const snap = await ref.get()
if (!snap.exists) {
  console.error(`No existe la municipalidad "${municipioId}".`)
  process.exit(1)
}

await ref.update({ sectores: SECTORES })

console.log(`Listo: ${SECTORES.length} sectores cargados en "${snap.data().nombre}".`)
SECTORES.forEach((s) => console.log(`  · ${s.nombre} (radio ${s.radio_metros} m)`))
console.log('\nRecarga el panel del Alcalde para verlos.')
process.exit(0)
