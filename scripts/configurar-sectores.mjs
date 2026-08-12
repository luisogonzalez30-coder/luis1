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
    lat: -34.9802,
    lng: -71.9873,
    radio_metros: 850,
    confirmado: true,
    fuente:
      'Corregida el 11-ago-2026. Estaba en -34.9743,-72.0604: 6,5 km al oeste ' +
      'del pueblo, en pleno campo, y ni siquiera coincidía con los 34°59′S ' +
      '72°00′W que citaba. Ningún reporte real le caía dentro. El valor de ' +
      'ahora es el centroide de los tres reportes del casco urbano ' +
      '(941158, 992675, 021048) y quedó confirmado a ojo sobre el mapa del ' +
      'panel. Es el caso exacto que advierte el encabezado: el sector no ' +
      'falla, simplemente nunca le llegan incidencias.',
  },
  {
    nombre: 'Iloca',
    lat: -34.9167,
    lng: -72.1833,
    radio_metros: 1050,
    confirmado: true,
    fuente: 'Coordenadas de Iloca (34°55′S 72°11′W).',
  },
  {
    nombre: 'Lora',
    lat: -35.017,
    lng: -72.067,
    radio_metros: 800,
    confirmado: true,
    fuente: 'Coordenadas de Lora (35°01′S 72°04′W). Iglesia de adobe, Monumento Nacional 2004.',
  },

  {
    nombre: 'La Pesca',
    lat: -34.977,
    lng: -72.1811,
    radio_metros: 1150,
    confirmado: true,
    fuente:
      'Confirmada el 12-ago-2026 por doble fuente: la lista del municipio y el ' +
      'nodo de OpenStreetMap coinciden en 178 m. Desembocadura del Mataquito.',
  },
  {
    nombre: 'Duao',
    lat: -34.8954,
    lng: -72.1789,
    radio_metros: 600,
    confirmado: true,
    fuente:
      'Confirmada el 12-ago-2026 por doble fuente: la lista del municipio y el ' +
      'nodo de OpenStreetMap coinciden en 18 m. Caleta de pescadores.',
  },

  // --- APROXIMADOS: cargados el 12-ago-2026 por decisión del usuario ---------
  //
  // Vienen de una lista de las 23 localidades que entregó el usuario. Se
  // cargaron a pedido expreso suyo, y se dejan marcados `confirmado: false`
  // porque NO están verificados: para escribirlos hay que pasar
  // `--incluir-aproximados`, así nunca llegan a producción por descuido.
  //
  // Qué se verificó antes de cargarlos, y por qué siguen sin confirmar:
  //  - Los 23 puntos caen dentro de la comuna (ninguno a más de 25 km del
  //    centro) y 21 de 23 devuelven "Licantén · Provincia de Curicó" al
  //    consultar OpenStreetMap por esa coordenada. Hasta ahí, plausibles.
  //  - PERO al buscar cada localidad por su NOMBRE en OpenStreetMap, las
  //    coordenadas no coinciden: La Higuera queda a 22 km, Quelmén a 15 km,
  //    Los Junquillos a 11,8 km, Idahue a 6,1 km. Y los nombres aparecen
  //    corridos entre sí: el punto de "Naicura" cae en Huapi, el de "Coquimbo"
  //    en Naicura, el de "El Huapi" en Lora Sur. Es un desplazamiento
  //    sistemático, no errores sueltos: la lista parece interpolada a lo largo
  //    del valle más que consultada en un mapa.
  //  - `Villa Angosta` cae en **Curepto, Provincia de Talca** según OSM, o sea
  //    en otra comuna. Se carga igual porque su círculo alcanza territorio de
  //    Licantén, pero es el candidato número uno a estar mal.
  //
  // El riesgo concreto de esto es el de §43.1: un sector con la coordenada
  // corrida no falla, simplemente agrupa los reportes del vecino equivocado, y
  // el Alcalde saca conclusiones de un sector con datos de otro. **Pendiente:
  // que el Director de Obras las valide contra el Plan Regulador** (para él son
  // 15 minutos con `--revisar`, que imprime un link de Google Maps por sector).
  //
  // Los radios NO son los 2000 m de antes: con 23 sectores en una comuna de
  // este tamaño los vecinos más cercanos quedan a 1,3-2,5 km, así que se usó
  // 45% de la distancia al vecino más próximo. Con 2000 m los círculos se
  // solapaban y la agrupación quedaba a merced de cuál centro estaba más cerca.
  // --- Valle: corregidos el 12-ago-2026 pegándolos a la Ruta J-60 ------------
  // El usuario los vio en el mapa del panel y avisó: "las ubicaciones están
  // erróneas, tienen que ir por la ruta J-60". Tenía razón — estaban entre 2,8 y
  // 3,7 km al NORTE de la ruta, sobre los cerros, cuando esas localidades son
  // caseríos a la orilla del camino.
  //
  // Cómo se corrigieron: se bajó la geometría real de la J-60 desde
  // OpenStreetMap (49 tramos, 2.059 vértices) y se movió cada punto **hacia el
  // sur hasta la ruta, manteniendo su longitud**. Se probó primero con "el punto
  // más cercano de la ruta" y NO sirve: donde el camino se curva, Placilla y La
  // Leonera terminaban a 400 m del centro de Licantén, encimadas al pueblo. Al
  // proyectar por longitud se conserva el orden este-oeste de la lista original,
  // que es el dato que sí venía bien.
  { nombre: 'Quelmén', lat: -34.98483, lng: -71.88552, radio_metros: 750, confirmado: false },
  { nombre: 'La Higuera', lat: -34.98959, lng: -71.90411, radio_metros: 750, confirmado: false },
  { nombre: 'Los Cristales', lat: -34.99292, lng: -71.92227, radio_metros: 450, confirmado: false },
  // El PRC lista Idahue e Idahue Chico por separado; la lista del municipio los
  // trae como uno solo. Queda uno hasta que alguien defina si se separan.
  { nombre: 'Idahue', lat: -34.99465, lng: -71.93349, radio_metros: 450, confirmado: false },
  { nombre: 'Placilla', lat: -34.99847, lng: -71.96108, radio_metros: 600, confirmado: false },
  { nombre: 'La Leonera', lat: -34.99414, lng: -71.9749, radio_metros: 600, confirmado: false },
  { nombre: 'Villa Angosta', lat: -34.99167, lng: -72.02083, radio_metros: 900, confirmado: false },
  { nombre: 'La Empalizada', lat: -35.00278, lng: -72.03889, radio_metros: 900, confirmado: false },
  { nombre: 'El Huapi', lat: -35.02083, lng: -72.08611, radio_metros: 800, confirmado: false },
  { nombre: 'Naicura', lat: -35.025, lng: -72.10833, radio_metros: 900, confirmado: false },
  { nombre: 'Los Cuervos', lat: -35.0125, lng: -72.12917, radio_metros: 850, confirmado: false },
  { nombre: 'Los Junquillos', lat: -34.96944, lng: -72.09167, radio_metros: 1100, confirmado: false },
  { nombre: 'Las Puertas', lat: -34.95556, lng: -72.11389, radio_metros: 1100, confirmado: false },
  { nombre: 'Coquimbo', lat: -35.02778, lng: -72.13889, radio_metros: 850, confirmado: false },
  { nombre: 'El Médano', lat: -34.99722, lng: -72.15417, radio_metros: 1250, confirmado: false },
  { nombre: 'Rancura', lat: -34.95417, lng: -72.18472, radio_metros: 750, confirmado: false },
  { nombre: 'La Capilla', lat: -34.93889, lng: -72.18333, radio_metros: 750, confirmado: false },
  { nombre: 'Pichibudi', lat: -34.88611, lng: -72.17083, radio_metros: 600, confirmado: false },

  // OJO: Lipimávida NO va acá. Estaba en la versión anterior de este archivo,
  // pero pertenece a la comuna de Vichuquén, no a Licantén. Si le cayeran
  // incidencias, el Alcalde estaría midiendo territorio ajeno.
]
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
const municipioId = args.find((a) => !a.startsWith('--'))
const soloConfirmados = args.includes('--solo-confirmados')
const soloRevisar = args.includes('--revisar')
// Carga también los sectores con coordenada aproximada sin confirmar. Existe
// porque el usuario pidió expresamente cargar las 23 localidades el 12-ago-2026
// sabiendo que 18 no están verificadas: es mejor tener el territorio completo
// aunque algunos centros estén corridos, que tener 5 sectores y el resto de la
// comuna cayendo en "Fuera de los sectores definidos". Es una decisión suya, y
// por eso hay que pedirla en cada corrida en vez de que sea el comportamiento
// por omisión.
const incluirAproximados = args.includes('--incluir-aproximados')

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
// Un pendiente CON coordenadas (aproximada, sin confirmar) es distinto de uno
// sin coordenadas: el primero se puede cargar bajo protesta, el segundo no se
// puede cargar de ninguna forma.
const sinCoordenadas = pendientes.filter((s) => typeof s.lat !== 'number' || typeof s.lng !== 'number')

if (incluirAproximados && sinCoordenadas.length > 0) {
  console.error(`\nHay ${sinCoordenadas.length} sectores sin coordenada, y --incluir-aproximados no los inventa:\n`)
  for (const s of sinCoordenadas) console.error(`  · ${s.nombre}`)
  console.error('\nCompleta lat/lng o quítalos de la lista.\n')
  process.exit(1)
}

if (!soloConfirmados && !incluirAproximados && pendientes.length > 0) {
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
