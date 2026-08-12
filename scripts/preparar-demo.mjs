// Deja el tenant "demo" presentable para mostrarle la plataforma a una
// municipalidad, SIN tocar ni un dato real de ninguna comuna.
//
// Por qué existe: el panel del Alcalde con datos reales de Licantén se ve pobre
// (5 reportes al 10-ago-2026), y el mapa de calor, la comparación mes contra mes
// y los indicadores necesitan volumen para contar algo. El tenant "demo" ya
// tiene ~100 reportes sembrados, pero se ve incoherente: la mitad quedó en
// Santiago (del seed original) y la otra mitad en la zona de Licantén (de las
// pruebas), no hay sectores cargados y no hay ninguna calificación.
//
// **Nunca se inventan datos sobre Licantén.** La alternativa —sembrar reportes
// falsos en la comuna real— contamina para siempre las estadísticas del Alcalde,
// la Cuenta Pública y los costos, y obliga a decirle "los inventamos" si
// pregunta de dónde salió uno. Acá todo pasa en el tenant de pruebas, y el
// nombre en pantalla dice "(demostración)" para que no haya malentendido.
//
// Uso:
//   node scripts/preparar-demo.mjs              (solo informa, NO escribe)
//   node scripts/preparar-demo.mjs --aplicar    (escribe de verdad)
//
// Requiere serviceAccountKey.json en la raíz del proyecto.

import { readFileSync } from 'fs'
import admin from 'firebase-admin'

const APLICAR = process.argv.includes('--aplicar')

const credencial = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf-8'))
admin.initializeApp({ credential: admin.credential.cert(credencial) })
const db = admin.firestore()

const TENANT_DEMO = 'demo'
const TENANT_REAL = 'licanten'

// Las 3 localidades de Licantén cuyas coordenadas están verificadas (las mismas
// de scripts/configurar-sectores.mjs). Las otras 16 del Plan Regulador siguen
// sin confirmar, así que no se usan ni acá.
//
// OJO: esta lista es una COPIA de la de configurar-sectores.mjs. Estuvo
// desincronizada y costó caro: el centro tenía -34.9743,-72.0604, 6,5 km al
// oeste del pueblo, así que este script sembró 48 reportes sobre potreros y el
// mapa del demo salía con el pueblo vacío al costado (corregido el 11-ago-2026,
// ver §43.1). Si tocas una lista, toca la otra.
const SECTORES = [
  { nombre: 'Licantén (centro)', lat: -34.9802, lng: -71.9873, radio_metros: 1800, peso: 0.55 },
  { nombre: 'Iloca', lat: -34.9167, lng: -72.1833, radio_metros: 2000, peso: 0.25 },
  { nombre: 'Lora', lat: -35.017, lng: -72.067, radio_metros: 2000, peso: 0.2 },
]

// Un reporte más lejos que esto del centro de la comuna se considera "fuera" y
// se reubica: son los del seed original, que quedaron en Santiago.
const RADIO_COMUNA_METROS = 30000
const CENTRO = { lat: SECTORES[0].lat, lng: SECTORES[0].lng }

// Azar determinista a partir del id del documento: así el informe del ensayo
// coincide exactamente con lo que se escribe después, y volver a correr el
// script no vuelve a mover todo de lugar.
function azarDe(semilla) {
  let h = 2166136261
  for (const c of String(semilla)) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  let estado = h >>> 0
  return () => {
    estado = (Math.imul(estado, 1664525) + 1013904223) >>> 0
    return estado / 4294967296
  }
}

function metrosEntre(a, b) {
  const R = 6371000
  const rad = (g) => (g * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function elegirSector(azar) {
  const r = azar()
  let acumulado = 0
  for (const s of SECTORES) {
    acumulado += s.peso
    if (r <= acumulado) return s
  }
  return SECTORES[0]
}

// Punto al azar DENTRO del sector (85% del radio, para que no caigan justo en el
// borde y queden fuera de la agrupación por sector de utils/sectores.js).
function puntoEnSector(sector, azar) {
  const distancia = Math.sqrt(azar()) * sector.radio_metros * 0.85
  const angulo = azar() * 2 * Math.PI
  const metrosPorGradoLat = 111320
  const metrosPorGradoLng = 111320 * Math.cos((sector.lat * Math.PI) / 180)
  return {
    lat: +(sector.lat + (distancia * Math.cos(angulo)) / metrosPorGradoLat).toFixed(6),
    lng: +(sector.lng + (distancia * Math.sin(angulo)) / metrosPorGradoLng).toFixed(6),
  }
}

// --- 1. Configuración del tenant ---------------------------------------------
const real = (await db.collection('municipalidades').doc(TENANT_REAL).get()).data()
if (!real) {
  console.error(`No existe municipalidades/${TENANT_REAL}: sin eso no se puede copiar el tema.`)
  process.exit(1)
}

const configDemo = {
  // El "(demostración)" es deliberado y no se saca: es lo que evita que alguien
  // confunda esta pantalla con los datos reales de la comuna.
  nombre: `${real.nombre} (demostración)`,
  color_primario: real.color_primario,
  color_primario_oscuro: real.color_primario_oscuro,
  logo_url: real.logo_url || '',
  centro_mapa: { lat: CENTRO.lat, lng: CENTRO.lng },
  cuadrillas: real.cuadrillas?.length ? real.cuadrillas : ['Cuadrilla Municipal'],
  sectores: SECTORES.map(({ nombre, lat, lng, radio_metros }) => ({ nombre, lat, lng, radio_metros })),
}

// --- 2. Recorrer las incidencias del tenant demo -----------------------------
const incidencias = await db.collection('incidencias').where('municipio_id', '==', TENANT_DEMO).get()

const cambios = []
let yaEnLaComuna = 0

for (const doc of incidencias.docs) {
  const i = doc.data()
  const azar = azarDe(doc.id)
  const cambio = { id: doc.id, ticket: i.numero_ticket, datos: {}, ticketPublico: {} }

  // 2a. Reubicar lo que está fuera de la comuna.
  const tieneCoords = typeof i.coordenadas?.lat === 'number' && typeof i.coordenadas?.lng === 'number'
  const lejos = !tieneCoords || metrosEntre(i.coordenadas, CENTRO) > RADIO_COMUNA_METROS

  if (lejos) {
    const sector = elegirSector(azar)
    const punto = puntoEnSector(sector, azar)
    cambio.datos.coordenadas = punto
    cambio.ticketPublico.coordenadas = punto
    cambio.sector = sector.nombre
  } else {
    yaEnLaComuna++
  }

  // 2b. Calificación en la mayoría de los resueltos, para que el indicador de
  // satisfacción del panel muestre algo. Se reparte 5/4/3 con más peso en 5,
  // que es lo que se ve en un municipio que atiende bien pero no perfecto.
  if (i.estado === 'Resuelto' && !i.calificacion_ciudadano && azar() < 0.75) {
    const r = azar()
    const nota = r < 0.55 ? 5 : r < 0.85 ? 4 : 3
    cambio.datos.calificacion_ciudadano = nota
    cambio.ticketPublico.calificacion_ciudadano = nota
  }

  // 2c. Cerrar las notificaciones pendientes. NO es cosmético: entre estos
  // reportes de prueba hay números de WhatsApp reales, y cuando las plantillas
  // queden aprobadas el bot intentaría escribirles. Marcarlos como ya avisados
  // es lo que evita mandarle un mensaje a alguien por un dato de prueba.
  for (const bandera of [
    'notificado_whatsapp_creacion',
    'notificado_whatsapp_asignacion',
    'notificado_whatsapp',
    'alertado_alcalde',
  ]) {
    if (i[bandera] !== true) cambio.datos[bandera] = true
  }

  if (Object.keys(cambio.datos).length > 0) cambios.push(cambio)
}

// --- 3. Informe ---------------------------------------------------------------
const reubicados = cambios.filter((c) => c.datos.coordenadas).length
const calificados = cambios.filter((c) => c.datos.calificacion_ciudadano).length
const notificaciones = cambios.filter((c) => c.datos.notificado_whatsapp_creacion !== undefined).length
const porSector = {}
cambios.filter((c) => c.sector).forEach((c) => (porSector[c.sector] = (porSector[c.sector] || 0) + 1))

console.log(`\nTenant "${TENANT_DEMO}" — ${incidencias.size} reportes revisados\n`)
console.log('Configuración que queda:')
console.log(`  nombre        : ${configDemo.nombre}`)
console.log(`  tema          : ${configDemo.color_primario} / ${configDemo.color_primario_oscuro}${configDemo.logo_url ? ' + logo' : ''}`)
console.log(`  centro y mapa : ${CENTRO.lat}, ${CENTRO.lng}`)
console.log(`  cuadrillas    : ${configDemo.cuadrillas.join(', ')}`)
console.log(`  sectores      : ${configDemo.sectores.map((s) => s.nombre).join(', ')}`)
console.log('\nCambios en los reportes:')
console.log(`  reubicados a la comuna     : ${reubicados}  ${JSON.stringify(porSector)}`)
console.log(`  ya estaban en la comuna    : ${yaEnLaComuna}`)
console.log(`  calificaciones agregadas   : ${calificados}`)
console.log(`  notificaciones cerradas    : ${notificaciones}  (evita mensajes a números de prueba)`)

if (!APLICAR) {
  console.log('\nEsto fue solo un informe, no se escribió nada.')
  console.log('Para aplicarlo: node scripts/preparar-demo.mjs --aplicar\n')
  process.exit(0)
}

// --- 4. Escribir ---------------------------------------------------------------
await db.collection('municipalidades').doc(TENANT_DEMO).set(configDemo, { merge: true })
console.log('\nConfiguración del tenant actualizada.')

// En lotes, que es el límite de Firestore (500 escrituras) y además evita
// quedarse a medias documento por documento.
const TOPE_LOTE = 400
let lote = db.batch()
let enLote = 0
let escritos = 0

for (const cambio of cambios) {
  lote.update(db.collection('incidencias').doc(cambio.id), cambio.datos)
  enLote++

  // El ticket público es la copia que ve el vecino: si no se actualiza, el mapa
  // ciudadano del tenant demo seguiría mostrando los pines en Santiago.
  if (Object.keys(cambio.ticketPublico).length > 0 && cambio.ticket) {
    const ref = db.collection('tickets_publicos').doc(String(cambio.ticket))
    if ((await ref.get()).exists) {
      lote.update(ref, cambio.ticketPublico)
      enLote++
    }
  }

  if (enLote >= TOPE_LOTE) {
    await lote.commit()
    escritos += enLote
    lote = db.batch()
    enLote = 0
  }
}

if (enLote > 0) {
  await lote.commit()
  escritos += enLote
}

console.log(`${escritos} escrituras aplicadas sobre ${cambios.length} reportes.`)
console.log(`\nListo. Entra al panel con la cuenta ALCALDE_ADMIN del tenant "${TENANT_DEMO}".\n`)
process.exit(0)
