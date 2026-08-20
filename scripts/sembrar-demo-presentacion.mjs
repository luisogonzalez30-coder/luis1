// Siembra 30 incidencias nuevas en el tenant "demo" para una presentación en
// vivo, dejando la mayoría SIN cuadrilla asignada para poder mostrar el flujo de
// asignación delante del cliente.
//
// **Solo escribe en el tenant "demo"**, cuyo nombre en pantalla dice
// "(demostración)". Nunca en "licanten": esa comuna es un cliente real con
// página pública de transparencia, y sembrarle datos inventados le contamina
// para siempre las estadísticas, la Cuenta Pública y el costeo.
//
// La derivación por departamento y la gravedad NO se copian acá: se importan de
// src/utils, que es lo que corre en producción. Una copia desincronizada de la
// lista de sectores ya costó 48 reportes sembrados sobre potreros (§43.1).
//
// Uso:
//   node scripts/sembrar-demo-presentacion.mjs              (informa, NO escribe)
//   node scripts/sembrar-demo-presentacion.mjs --aplicar    (escribe de verdad)

import { readFileSync } from 'fs'
import admin from 'firebase-admin'
import { calcularDepartamento } from '../src/utils/departamento.js'
import { calcularGravedad } from '../src/utils/gravedad.js'

const APLICAR = process.argv.includes('--aplicar')
const MUNICIPIO_ID = 'demo'

const credencial = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf-8'))
admin.initializeApp({ credential: admin.credential.cert(credencial) })
const db = admin.firestore()

// Los 3 sectores con coordenadas verificadas del tenant demo.
const SECTORES = {
  centro: { lat: -34.9802, lng: -71.9873, radio: 1500 },
  iloca: { lat: -34.9167, lng: -72.1833, radio: 1600 },
  lora: { lat: -35.017, lng: -72.067, radio: 1600 },
}

const CUADRILLAS = ['Cuadrilla Centro', 'Cuadrilla Norte', 'Cuadrilla Sur', 'Cuadrilla Municipal']

// Teléfonos deliberadamente NO enrutables: en Chile ningún móvil empieza con 0
// después del 9. Así el panel muestra un contacto con forma de teléfono sin que
// nadie pueda terminar escribiéndole por WhatsApp a una persona real.
const tel = (n) => `+56 9 0000 ${String(1000 + n).slice(-4)}`

// categoria, dirección, sector, y qué se hace con ella.
//  P = Pendiente sin cuadrilla (lo que se va a asignar en vivo)
//  E = En Proceso con cuadrilla
//  R = Resuelto con gasto real
const SEMILLAS = [
  // --- Pendientes sin cuadrilla: el material para asignar en la demo ---
  ['Fuga_gas', 'Av. Arturo Prat 412, frente al supermercado', 'centro', 'P', 0.2, 'Olor fuerte a gas desde la vereda, se siente a media cuadra'],
  ['Cableado_expuesto', 'Calle Yungay esquina Carrera', 'centro', 'P', 0.4, 'Cables sueltos colgando a la altura de la cabeza'],
  ['Arbol_caido', 'Camino a Iloca, km 3', 'centro', 'P', 0.5, 'Árbol cayó sobre la berma, tapa media pista'],
  ['Socavon', 'Calle Balmaceda 233', 'centro', 'P', 0.8, 'Hundimiento de la calzada, ya se hundió una rueda'],
  ['Poste_danado', 'Población Villa Esperanza, pasaje 4', 'centro', 'P', 1.2, 'Poste inclinado tras el temporal'],
  ['Alcantarillado', 'Calle Independencia 87', 'centro', 'P', 1.5, 'Rebalse de aguas servidas en la vereda'],
  ['Luminaria', 'Av. Alessandri, entre Prat y O’Higgins', 'centro', 'P', 2.1, 'Tres luminarias apagadas en la misma cuadra'],
  ['Bache', 'Calle 21 de Mayo 145', 'centro', 'P', 2.4, 'Bache profundo, los autos lo esquivan por la vereda'],
  ['Basural', 'Sitio eriazo de calle Errázuriz', 'centro', 'P', 3.0, 'Microbasural creciendo hace semanas'],
  ['Semaforo', 'Cruce Alessandri con Manuel Rodríguez', 'centro', 'P', 3.3, 'Semáforo intermitente todo el día'],
  ['Vereda_danada', 'Calle O’Higgins 302, frente a la escuela', 'centro', 'P', 4.0, 'Vereda levantada, peligrosa para los niños'],
  ['Animal_abandonado', 'Plaza de Armas', 'centro', 'P', 4.2, 'Perro herido lleva dos días en la plaza'],
  ['Anegamiento', 'Caleta La Pesca, camino de acceso', 'iloca', 'P', 1.1, 'El camino se inunda con cada marea alta'],
  ['Contenedor_danado', 'Iloca, costanera frente a la caleta', 'iloca', 'P', 2.2, 'Contenedor volcado y roto'],
  ['Paradero_danado', 'Iloca, paradero de la costanera', 'iloca', 'P', 3.4, 'Techo del paradero volado'],
  ['Falta_recoleccion', 'Iloca, sector alto', 'iloca', 'P', 5.0, 'Llevan 8 días sin pasar por el sector'],
  ['Muro_riesgo', 'Lora, calle principal 56', 'lora', 'P', 0.9, 'Muro de adobe con grieta grande, da a la vereda'],
  ['Quema_ilegal', 'Lora, sector norte', 'lora', 'P', 2.7, 'Queman basura y pastizales al atardecer'],
  ['Juegos_infantiles', 'Plaza de Lora', 'lora', 'P', 4.6, 'Resbalín roto y con fierros expuestos'],
  ['Grafiti', 'Lora, muro de la sede vecinal', 'lora', 'P', 6.0, ''],
  ['Robo_hurto_frecuente', 'Calle Errázuriz, entre Prat y Yungay', 'centro', 'P', 1.8, 'Tres robos a vehículos en dos semanas en la misma cuadra'],
  ['Falta_vigilancia', 'Plaza de Armas, cámara del costado sur', 'centro', 'P', 3.7, 'Cámara lleva más de un mes sin funcionar'],
  ['Otro', 'Calle Prat 88', 'centro', 'P', 2.9, 'Vecinos piden un lomo de toro frente al jardín infantil'],
  ['Comercio_ambulante', 'Iloca, costanera en temporada', 'iloca', 'E', 9.6, 'Puestos sin permiso bloqueando el paso peatonal'],

  // --- En Proceso: cuadrilla ya en terreno ---
  ['Pavimento_deteriorado', 'Av. Alessandri 780', 'centro', 'E', 7.0, 'Pavimento agrietado en toda la cuadra'],
  ['Filtracion_agua', 'Calle Carrera 190', 'centro', 'E', 8.2, 'Filtración constante, la calle está siempre mojada'],
  ['Plaga', 'Feria libre de calle Prat', 'centro', 'E', 9.1, 'Roedores en el sector de la feria'],
  ['Senaletica_vial', 'Ruta J-60, entrada a Licantén', 'centro', 'E', 10.3, 'Señal de PARE doblada'],
  ['Escombros', 'Iloca, terreno junto al camping', 'iloca', 'E', 11.0, 'Escombros de construcción abandonados'],
  ['Poda_necesaria', 'Lora, calle principal', 'lora', 'E', 12.4, 'Ramas tocando el cableado'],

  // --- Resueltos recientes: alimentan costos y la comparación mes a mes ---
  ['Luminaria_parpadea', 'Calle Manuel Rodríguez 45', 'centro', 'R', 14.0, ''],
  ['Mobiliario_danado', 'Plaza de Armas, banca norte', 'centro', 'R', 16.5, ''],
  ['Bache', 'Calle Comercio 22', 'centro', 'R', 19.0, ''],
  ['Falta_basureros', 'Iloca, costanera', 'iloca', 'R', 21.0, ''],
]

const NOMBRES = [
  'María Contreras', 'Juan Pérez', 'Rosa Muñoz', 'Pedro Salinas', 'Carmen Díaz',
  'Luis Farías', 'Ana Vergara', 'Jorge Riquelme', 'Elena Pino', 'Raúl Cáceres',
  'Sofía Navarro', 'Marcos Lagos', 'Teresa Ulloa', 'Óscar Bravo', 'Patricia Rojas',
  'Hernán Soto', 'Gloria Maldonado', 'Álvaro Cid', 'Ruth Peña', 'Mario Godoy',
  'Isabel Cortés', 'Nelson Ibarra', 'Paula Henríquez', 'Sergio Valdés', 'Marta Lillo',
  'Iván Zúñiga', 'Cecilia Bustamante', 'Rodrigo Paredes', 'Lorena Aguirre', 'Félix Barra',
]

// Azar determinista: correr el script dos veces produce lo mismo, así que el
// ensayo coincide con lo que se escribe.
function azarDe(semilla) {
  let h = 2166136261
  for (const c of String(semilla)) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  let estado = h >>> 0
  return () => {
    estado = (Math.imul(estado, 1664525) + 1013904223) >>> 0
    return estado / 4294967296
  }
}

// Punto dentro del sector, al 80% del radio para que no caiga en el borde y
// quede fuera de la agrupación por sector de utils/sectores.js.
function puntoEn(sector, azar) {
  const s = SECTORES[sector]
  const ang = azar() * 2 * Math.PI
  const dist = Math.sqrt(azar()) * s.radio * 0.8
  return {
    lat: s.lat + (dist * Math.cos(ang)) / 111320,
    lng: s.lng + (dist * Math.sin(ang)) / (111320 * Math.cos((s.lat * Math.PI) / 180)),
  }
}

const AHORA = Date.now()
const HORA = 3600 * 1000
const elegir = (arr, azar) => arr[Math.floor(azar() * arr.length) % arr.length]

// Trabajadores del departamento, para armar el equipo de las que van En Proceso.
const trabajadoresSnap = await db.collection('trabajadores').where('municipio_id', '==', MUNICIPIO_ID).get()
const trabajadoresPorDepto = {}
for (const d of trabajadoresSnap.docs) {
  const t = { id: d.id, ...d.data() }
  ;(trabajadoresPorDepto[t.departamento] ||= []).push(t)
}

// Tickets ya usados, para no repetir número.
const existentes = await db.collection('incidencias').where('municipio_id', '==', MUNICIPIO_ID).get()
const ticketsUsados = new Set(existentes.docs.map((d) => d.data().numero_ticket).filter(Boolean))
console.log(`Tenant "${MUNICIPIO_ID}" tiene hoy ${existentes.size} incidencias y ${trabajadoresSnap.size} trabajadores.\n`)

const resumen = { P: 0, E: 0, R: 0 }
const porDepto = {}
const lote = db.batch()

SEMILLAS.forEach(([categoria, direccion, sector, modo, diasAtras, detalle], i) => {
  const azar = azarDe(`${categoria}|${direccion}|${i}`)
  const departamento = calcularDepartamento(categoria)
  const { nivel_gravedad, color_pin } = calcularGravedad(categoria)
  const creada = new Date(AHORA - diasAtras * 24 * HORA)

  let ticket
  do {
    ticket = String(100000 + Math.floor(azar() * 900000))
  } while (ticketsUsados.has(ticket))
  ticketsUsados.add(ticket)

  const doc = {
    municipio_id: MUNICIPIO_ID,
    categoria,
    departamento,
    nivel_gravedad,
    color_pin,
    direccion_texto: direccion,
    detalles_adicionales: detalle,
    coordenadas: puntoEn(sector, azar),
    numero_ticket: ticket,
    estado: modo === 'P' ? 'Pendiente' : modo === 'E' ? 'En Proceso' : 'Resuelto',
    nombre_ciudadano: NOMBRES[i % NOMBRES.length],
    contacto_ciudadano: tel(i),
    es_anonimo: false,
    dispositivo_id: `demo-presentacion-${i}`,
    fecha_creacion: admin.firestore.Timestamp.fromDate(creada),
    fecha_asignacion: null,
    fecha_cierre: null,
    cuadrilla_asignada: null,
    presupuesto_estimado: null,
    gasto_real: null,
    fotos_antes_urls: [],
    foto_despues_url: '',
    calificacion_ciudadano: null,
    upvotes: Math.floor(azar() * 6),
    usuarios_afectados: [],
    alertado_alcalde: nivel_gravedad === 'Alta',
    notificado_whatsapp: false,
    notificado_whatsapp_creacion: false,
    notificado_whatsapp_asignacion: false,
    origen_demo: true, // marca para poder revertir esto de un solo golpe
  }

  if (modo !== 'P') {
    const equipo = (trabajadoresPorDepto[departamento] || []).slice(0, 2 + Math.floor(azar() * 2))
    const horas = 4 + Math.floor(azar() * 12)
    doc.cuadrilla_asignada = elegir(CUADRILLAS, azar)
    doc.fecha_asignacion = admin.firestore.Timestamp.fromDate(new Date(creada.getTime() + 6 * HORA))
    doc.presupuesto_estimado = {
      horas_estimadas: horas,
      personal_requerido: equipo.length,
      trabajadores_asignados: equipo.map((t) => ({ id: t.id, nombre: t.nombre, tarifa_hora: t.tarifa_hora })),
      materiales_estimados: 20000 + Math.floor(azar() * 120000),
    }
  }

  if (modo === 'R') {
    const horasReales = doc.presupuesto_estimado.horas_estimadas + Math.floor(azar() * 5) - 2
    doc.fecha_cierre = admin.firestore.Timestamp.fromDate(new Date(creada.getTime() + (18 + azar() * 40) * HORA))
    doc.gasto_real = {
      horas_reales: Math.max(1, horasReales),
      materiales_reales: Math.round(doc.presupuesto_estimado.materiales_estimados * (0.8 + azar() * 0.5)),
    }
    doc.calificacion_ciudadano = 3 + Math.floor(azar() * 3)
    doc.foto_despues_url = ''
  }

  resumen[modo] += 1
  porDepto[departamento] = (porDepto[departamento] || 0) + 1

  if (APLICAR) lote.set(db.collection('incidencias').doc(), doc)

  const etiqueta = modo === 'P' ? 'PENDIENTE sin cuadrilla' : modo === 'E' ? 'EN PROCESO' : 'RESUELTO  '
  console.log(
    `  ${etiqueta}  ${nivel_gravedad.padEnd(5)} ${departamento.padEnd(26)} ${categoria.padEnd(24)} ${direccion}`
  )
})

console.log(`\n  Pendientes SIN cuadrilla (para asignar en vivo): ${resumen.P}`)
console.log(`  En Proceso con cuadrilla:                       ${resumen.E}`)
console.log(`  Resueltas con gasto real:                       ${resumen.R}`)
console.log('\n  por departamento:')
for (const [d, n] of Object.entries(porDepto).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${d.padEnd(28)} ${n}`)
}

if (!APLICAR) {
  console.log('\nEsto fue solo un informe, no se escribió nada.')
  console.log('Para aplicarlo: node scripts/sembrar-demo-presentacion.mjs --aplicar\n')
  process.exit(0)
}

await lote.commit()
const despues = await db.collection('incidencias').where('municipio_id', '==', MUNICIPIO_ID).get()
console.log(`\nEscrito. El tenant "${MUNICIPIO_ID}" pasó de ${existentes.size} a ${despues.size} incidencias.`)
process.exit(0)
