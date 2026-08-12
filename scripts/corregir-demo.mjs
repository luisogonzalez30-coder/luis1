// Dos correcciones al tenant de demostración, hechas el 11-ago-2026 antes de la
// presentación al Alcalde. Ver §43 en ESTADO_PROYECTO.md.
//
// Uso:
//   node scripts/corregir-demo.mjs            (simulacro, no escribe)
//   node scripts/corregir-demo.mjs --aplicar
//
// Requiere serviceAccountKey.json en la raíz.
//
// ---------------------------------------------------------------------------
// 1. BORRAR RUT Y TELÉFONOS
// ---------------------------------------------------------------------------
// 13 de los 100 reportes del demo traían `rut_ciudadano` de personas reales y
// 25 traían `contacto_ciudadano`, junto con su nombre. Los datos entraron al
// demo arrastrados desde reportes verdaderos, no inventados. Mostrarle ese
// panel a un tercero es exponer el RUT y el celular de un vecino que nunca lo
// autorizó, y encima justo cuando se plantea la objeción "¿esto me expone?".
//
// Se borra el campo entero con FieldValue.delete(), no se reemplaza por "" ni
// por un dato falso: un RUT falso se ve igual de real en pantalla.
//
// El nombre de pila (`nombre_ciudadano`) se deja: sin RUT ni teléfono no
// identifica a nadie, y el panel necesita mostrar algo en esa columna.
//
// ---------------------------------------------------------------------------
// 2. REUBICAR EL GRUPO DEL CENTRO
// ---------------------------------------------------------------------------
// El demo se sembró alrededor de los tres sectores confirmados. Iloca y Lora
// quedaron bien, pero "Licantén (centro)" tenía la coordenada equivocada
// (-34.9743,-72.0604: 6,5 km al oeste, en el campo), así que sus 48 reportes
// se dibujaban sobre potreros mientras el pueblo real aparecía vacío.
//
// La coordenada del sector ya se corrigió en configurar-sectores.mjs. Acá se
// mueven esos 48 reportes el mismo delta, en bloque. Se traslada, no se
// reparte al azar: así se conserva la forma del grupo — qué tan disperso está,
// dónde se apelmaza — que es lo que hace que un mapa sembrado parezca real.
// Los reportes de Iloca y Lora no se tocan.
//
// ---------------------------------------------------------------------------
// 3. RECENTRAR EL MAPA
// ---------------------------------------------------------------------------
// `centro_mapa` es donde abre el mapa del panel, y es un campo aparte de los
// sectores: corregir el sector no lo arregla. Los dos tenants lo tenían mal.
// El demo apuntaba al centro equivocado (por eso el mapa abría sobre los
// potreros, con el pueblo asomando al costado) y Licantén estaba 2,1 km al
// suroeste del pueblo.

import admin from 'firebase-admin'
import { readFileSync } from 'fs'

const APLICAR = process.argv.includes('--aplicar')

const CENTRO_VIEJO = { lat: -34.9743, lng: -72.0604 }
const CENTRO_NUEVO = { lat: -34.9802, lng: -71.9873 }
const RADIO_GRUPO = 2500 // metros: qué tan lejos del centro viejo se considera "del grupo"

const D_LAT = CENTRO_NUEVO.lat - CENTRO_VIEJO.lat
const D_LNG = CENTRO_NUEVO.lng - CENTRO_VIEJO.lng

const credencial = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf-8'))
admin.initializeApp({ credential: admin.credential.cert(credencial) })
const db = admin.firestore()

const distancia = (lat1, lng1, lat2, lng2) => {
  const R = 6371000
  const r = Math.PI / 180
  const dLat = (lat2 - lat1) * r
  const dLng = (lng2 - lng1) * r
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// El campo `coordenadas` de esta base es `{ lat, lng }` — no un GeoPoint y no
// `{ latitude, longitude }`. Es lo que lee el frontend
// (src/components/dashboard/MapaIncidencias.jsx). La primera versión de este
// script escribió `latitude`/`longitude` "conservando el formato original", y
// como no borraba nada, los 48 documentos quedaron con las dos cosas y el mapa
// siguió mostrando el par viejo. Reparado por scripts/reparar-coordenadas.mjs.
const leerCoords = co =>
  co && typeof co.lat === 'number' && typeof co.lng === 'number'
    ? { lat: co.lat, lng: co.lng }
    : null

const escribirCoords = (lat, lng) => ({ lat, lng })

const snap = await db.collection('incidencias').where('municipio_id', '==', 'demo').get()
console.log(`Reportes en el tenant demo: ${snap.size}`)
if (!APLICAR) console.log('\n*** SIMULACRO — no se escribe nada. Agrega --aplicar. ***')

let ruts = 0
let telefonos = 0
let movidos = 0
let intactos = 0
const lote = db.batch()

for (const doc of snap.docs) {
  const x = doc.data()
  const cambios = {}

  if (x.rut_ciudadano) {
    cambios.rut_ciudadano = admin.firestore.FieldValue.delete()
    ruts++
  }

  if (x.contacto_ciudadano) {
    cambios.contacto_ciudadano = admin.firestore.FieldValue.delete()
    telefonos++
  }

  const p = leerCoords(x.coordenadas)
  if (p) {
    const d = distancia(p.lat, p.lng, CENTRO_VIEJO.lat, CENTRO_VIEJO.lng)
    if (d <= RADIO_GRUPO) {
      cambios.coordenadas = escribirCoords(p.lat + D_LAT, p.lng + D_LNG)
      movidos++
    } else {
      intactos++
    }
  }

  if (Object.keys(cambios).length && APLICAR) lote.update(doc.ref, cambios)
}

// Los dos tenants abren el mapa en el pueblo. Licantén también: su centro_mapa
// estaba 2,1 km al suroeste.
const mapas = []
for (const muni of ['licanten', 'demo']) {
  const ref = db.collection('municipalidades').doc(muni)
  const antes = (await ref.get()).data()?.centro_mapa
  mapas.push(`${muni}: ${JSON.stringify(antes)} -> ${JSON.stringify(CENTRO_NUEVO)}`)
  if (APLICAR) lote.update(ref, { centro_mapa: { ...CENTRO_NUEVO } })
}

if (APLICAR) {
  await lote.commit()
  console.log('\nListo.')
} else {
  console.log('\nSe habría hecho:')
}

console.log(`  RUT borrados:                 ${ruts}`)
console.log(`  Teléfonos borrados:           ${telefonos}`)
console.log(`  Reportes movidos al pueblo:   ${movidos}`)
console.log(`  Reportes intactos (Iloca/Lora/otros): ${intactos}`)
console.log(`  Desplazamiento aplicado:      ${D_LAT.toFixed(4)} lat, ${D_LNG.toFixed(4)} lng`)
console.log('  centro_mapa:')
mapas.forEach(m => console.log(`    ${m}`))

process.exit(0)
