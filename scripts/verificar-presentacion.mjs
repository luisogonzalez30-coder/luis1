// Chequeo de solo lectura para correr antes de una presentación. No escribe
// nada. Revisa lo que se ve en pantalla y suele estar mal sin avisar:
// sectores cargados, dónde abre el mapa, reportes que caen fuera de todo
// sector, y datos personales expuestos en el tenant de demostración.
//
// Uso:
//   node scripts/verificar-presentacion.mjs

import admin from 'firebase-admin'
import { readFileSync } from 'fs'

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

// Lee EXACTAMENTE por donde lee el frontend: `coordenadas.lat` / `.lng`
// (ver src/components/dashboard/MapaIncidencias.jsx). No agregar aquí un
// `?? latitude` de cortesía: el 11-ago-2026 este chequeo dio todo en verde
// mientras el mapa seguía mal, justamente porque leía una clave que la
// aplicación ignora. Un verificador que acepta más formatos que el programa
// que verifica no verifica nada.
const leerCoords = co =>
  co && typeof co.lat === 'number' && typeof co.lng === 'number'
    ? { lat: co.lat, lng: co.lng }
    : null

const todas = await db.collection('incidencias').get()

for (const muni of ['licanten', 'demo']) {
  const cfg = (await db.collection('municipalidades').doc(muni).get()).data()
  const sectores = cfg.sectores ?? []
  const docs = todas.docs.filter(d => d.data().municipio_id === muni)

  console.log(`\n=== ${cfg.nombre ?? muni} ===`)
  console.log(`  reportes: ${docs.length}`)
  console.log(`  sectores cargados: ${sectores.length}`)
  console.log(`  centro_mapa: ${JSON.stringify(cfg.centro_mapa ?? '(sin definir)')}`)

  const conteo = {}
  const fuera = []
  for (const d of docs) {
    const p = leerCoords(d.data().coordenadas)
    if (!p) { fuera.push(`${d.data().numero_ticket} (sin coordenadas)`); continue }
    let mejor = null
    for (const s of sectores) {
      const dd = distancia(p.lat, p.lng, s.lat, s.lng)
      if (dd <= (s.radio_metros ?? 1000) && (!mejor || dd < mejor.d)) mejor = { n: s.nombre, d: dd }
    }
    if (mejor) conteo[mejor.n] = (conteo[mejor.n] ?? 0) + 1
    else fuera.push(`${d.data().numero_ticket} — ${d.data().direccion_texto ?? '?'}`)
  }

  for (const [n, v] of Object.entries(conteo)) console.log(`    ${n.padEnd(22)} ${v}`)
  console.log(`    ${'FUERA DE SECTORES'.padEnd(22)} ${fuera.length}`)
  fuera.slice(0, 8).forEach(f => console.log(`       · ${f}`))

  const ruts = docs.filter(d => d.data().rut_ciudadano).length
  const tels = docs.filter(d => d.data().contacto_ciudadano).length
  const marca = n => (n > 0 ? '  <-- REVISAR' : '')
  if (muni === 'demo') {
    console.log(`  RUT expuestos: ${ruts}${marca(ruts)}`)
    console.log(`  teléfonos expuestos: ${tels}${marca(tels)}`)
  } else {
    console.log(`  (en el tenant real los datos del vecino son legítimos: ${ruts} RUT, ${tels} teléfonos)`)
  }

  const sinAviso = docs.filter(d => d.data().contacto_ciudadano && !d.data().notificado_whatsapp_creacion).length
  if (muni === 'licanten') console.log(`  reportes con teléfono y sin aviso de WhatsApp: ${sinAviso}${marca(sinAviso)}`)
}

process.exit(0)
