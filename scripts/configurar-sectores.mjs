// Carga los sectores de una comuna (villas, poblaciones, sectores rurales) para
// que el Alcalde vea qué territorio concentra los problemas. Ver §33 en
// ESTADO_PROYECTO.md.
//
// Uso:
//   node scripts/configurar-sectores.mjs licanten
//   node scripts/configurar-sectores.mjs licanten --solo-confirmados
//   node scripts/configurar-sectores.mjs licanten --revisar
//
//   --revisar           No escribe nada. Imprime un link de Google Maps por
//                       sector para revisar en pantalla que cada punto cae
//                       donde debe.
//   --solo-confirmados  Carga únicamente los sectores ya confirmados y omite
//                       los que están pendientes. Sirve para tener el panel
//                       funcionando hoy mientras se confirma el resto.
//
// Requiere serviceAccountKey.json en la raíz del proyecto.
//
// ---------------------------------------------------------------------------
// POR QUÉ HAY SECTORES "SIN CONFIRMAR"
// ---------------------------------------------------------------------------
// Un sector con la coordenada equivocada NO se nota en el dashboard: no falla
// nada, simplemente no le caen incidencias, o le caen las del sector vecino. Es
// un error silencioso, y un panel que miente es peor que un panel vacío.
//
// Los NOMBRES de las 19 localidades de abajo son reales: salen del Plan
// Regulador Comunal de Licantén, que las enumera de este a oeste. Las
// COORDENADAS son otra cosa: solo cuatro pudieron verificarse contra una
// fuente. El resto están en null a propósito, en vez de rellenarlas a ojo.
//
// Por eso este script se niega a cargar un sector sin confirmar. Confirmar uno
// toma menos de un minuto:
//   1. Abrir Google Maps y buscar el sector (ej. "Quelmén, Licantén").
//   2. Clic derecho en el centro del sector.
//   3. La primera línea del menú son las coordenadas. Al hacerle clic se copian.
//   4. Pegarlas acá abajo y cambiar `confirmado: false` por `confirmado: true`.
//
// El radio es en metros: cuánto abarca el sector desde ese centro. Para una
// villa suelen bastar 400-800; para una localidad rural, 2000 o más. Los radios
// de abajo son un punto de partida razonable, no una medición.
// ---------------------------------------------------------------------------

import { readFileSync } from 'fs'
import admin from 'firebase-admin'

// ---------------------------------------------------------------------------
// EDITAR ACÁ: los sectores reales de la comuna.
// ---------------------------------------------------------------------------
const SECTORES = [
  // --- Verificados contra una fuente ---------------------------------------
  {
    nombre: 'Licantén (centro)',
    lat: -34.9743,
    lng: -72.0604,
    radio_metros: 1500,
    confirmado: true,
    fuente: 'Coordenadas de la ciudad de Licantén (34°59′S 72°00′W).',
  },
  {
    nombre: 'Iloca',
    lat: -34.9167,
    lng: -72.1833,
    radio_metros: 2000,
    confirmado: true,
    fuente: 'Coordenadas de Iloca (34°55′S 72°11′W).',
  },
  {
    nombre: 'Lora',
    lat: -35.017,
    lng: -72.067,
    radio_metros: 2000,
    confirmado: true,
    fuente: 'Coordenadas de Lora (35°01′S 72°04′W). Iglesia de adobe, Monumento Nacional 2004.',
  },

  // --- Costa: posición aproximada, hay que confirmarla ----------------------
  {
    nombre: 'Duao',
    lat: null,
    lng: null,
    radio_metros: 2000,
    confirmado: false,
    nota: 'Caleta a ~7 km al norte de Iloca por la costa. Las fuentes le repiten las coordenadas de Iloca, así que no sirven.',
  },
  {
    nombre: 'La Pesca',
    lat: null,
    lng: null,
    radio_metros: 2000,
    confirmado: false,
    nota: 'En la desembocadura del río Mataquito, al sur de Iloca, a 22 km de Licantén.',
  },

  // --- Resto de las localidades del Plan Regulador Comunal ------------------
  // De este a oeste, tal como las ordena el PRC.
  { nombre: 'La Higuera', lat: null, lng: null, radio_metros: 2000, confirmado: false },
  { nombre: 'Idahue', lat: null, lng: null, radio_metros: 2000, confirmado: false },
  { nombre: 'Idahue Chico', lat: null, lng: null, radio_metros: 1500, confirmado: false },
  { nombre: 'Placilla', lat: null, lng: null, radio_metros: 2000, confirmado: false },
  { nombre: 'La Leonera', lat: null, lng: null, radio_metros: 2000, confirmado: false },
  { nombre: 'La Empalizada', lat: null, lng: null, radio_metros: 2000, confirmado: false },
  { nombre: 'Los Cristales', lat: null, lng: null, radio_metros: 2000, confirmado: false },
  { nombre: 'Villa Angosta', lat: null, lng: null, radio_metros: 1500, confirmado: false },
  { nombre: 'Quelmén', lat: null, lng: null, radio_metros: 2000, confirmado: false },
  { nombre: 'El Huapi', lat: null, lng: null, radio_metros: 2000, confirmado: false },
  { nombre: 'Naicura', lat: null, lng: null, radio_metros: 2000, confirmado: false },
  { nombre: 'Los Cuervos', lat: null, lng: null, radio_metros: 2000, confirmado: false },
  { nombre: 'Las Puertas', lat: null, lng: null, radio_metros: 2000, confirmado: false },
  { nombre: 'El Médano', lat: null, lng: null, radio_metros: 2000, confirmado: false },

  // OJO: Lipimávida NO va acá. Estaba en la versión anterior de este archivo,
  // pero pertenece a la comuna de Vichuquén, no a Licantén. Si le cayeran
  // incidencias, el Alcalde estaría midiendo territorio ajeno.
]
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
const municipioId = args.find((a) => !a.startsWith('--'))
const soloConfirmados = args.includes('--solo-confirmados')
const soloRevisar = args.includes('--revisar')

if (!municipioId) {
  console.error('Uso: node scripts/configurar-sectores.mjs <municipio> [--solo-confirmados] [--revisar]')
  console.error('Ejemplo: node scripts/configurar-sectores.mjs licanten')
  process.exit(1)
}

const confirmados = SECTORES.filter((s) => s.confirmado)
const pendientes = SECTORES.filter((s) => !s.confirmado)

// --revisar: solo imprime, no toca Firestore ni pide credenciales.
if (soloRevisar) {
  console.log(`Revisión de los ${SECTORES.length} sectores definidos.\n`)
  console.log('Abre cada link y confirma que el punto cae donde debe:\n')
  for (const s of SECTORES) {
    if (s.confirmado) {
      console.log(`  ✓ ${s.nombre}`)
      console.log(`      https://www.google.com/maps?q=${s.lat},${s.lng}`)
    } else {
      console.log(`  ○ ${s.nombre} — SIN COORDENADAS`)
      console.log(`      https://www.google.com/maps/search/${encodeURIComponent(`${s.nombre}, Licantén, Chile`)}`)
      if (s.nota) console.log(`      ${s.nota}`)
    }
  }
  console.log(`\n${confirmados.length} confirmados, ${pendientes.length} pendientes.`)
  process.exit(0)
}

// El candado: nada sin confirmar llega a producción por accidente. Va ANTES de
// la validación de forma, porque un sector pendiente tiene lat/lng en null y si
// no, el error que se ve es "lat/lng deben ser números" — cierto pero inútil,
// esconde lo que realmente hay que hacer.
if (!soloConfirmados && pendientes.length > 0) {
  console.error(`Hay ${pendientes.length} sectores sin coordenadas confirmadas:\n`)
  for (const s of pendientes) {
    console.error(`  · ${s.nombre}${s.nota ? ` — ${s.nota}` : ''}`)
  }
  console.error('\nUn sector con la coordenada equivocada no falla: simplemente no le caen')
  console.error('incidencias, o le caen las del vecino. Por eso no se cargan a ciegas.\n')
  console.error('Opciones:')
  console.error('  1. Completar lat/lng y poner confirmado: true en cada uno.')
  console.error(`     Ayuda: node scripts/configurar-sectores.mjs ${municipioId} --revisar`)
  console.error(`  2. Cargar solo los ${confirmados.length} ya confirmados:`)
  console.error(`     node scripts/configurar-sectores.mjs ${municipioId} --solo-confirmados`)
  process.exit(1)
}

// Validación de los que sí se van a escribir. Un sector mal escrito no se
// detecta a simple vista en el dashboard (simplemente no le caen incidencias),
// así que conviene fallar acá.
const aCargar = soloConfirmados ? confirmados : SECTORES

for (const s of aCargar) {
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

if (aCargar.length === 0) {
  console.error('No hay ningún sector confirmado para cargar.')
  process.exit(1)
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

// A Firestore solo van los 4 campos que la app usa (ver utils/sectores.js).
// `confirmado`, `fuente` y `nota` son notas de este archivo, no datos del panel.
const paraFirestore = aCargar.map(({ nombre, lat, lng, radio_metros }) => ({
  nombre,
  lat,
  lng,
  radio_metros,
}))

await ref.update({ sectores: paraFirestore })

console.log(`Listo: ${paraFirestore.length} sectores cargados en "${snap.data().nombre}".`)
paraFirestore.forEach((s) => console.log(`  · ${s.nombre} (radio ${s.radio_metros} m)`))

if (soloConfirmados && pendientes.length > 0) {
  console.log(`\nQuedan ${pendientes.length} localidades sin cargar, por falta de coordenadas:`)
  console.log(`  ${pendientes.map((s) => s.nombre).join(', ')}`)
  console.log('\nMientras no estén, sus incidencias van a aparecer agrupadas en')
  console.log('"Fuera de los sectores definidos" en el panel del Alcalde.')
}

console.log('\nRecarga el panel del Alcalde para verlos.')
process.exit(0)
