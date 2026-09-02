// Prueba de COMPORTAMIENTO de firestore.rules contra el emulador, como cliente
// ANÓNIMO — que es el caso que importa: el vecino no tiene login y es quien
// escribe en producción.
//
// Uso:  npm run reglas:probar     (levanta el emulador, corre esto, lo apaga)
//
// Por qué existe: que las reglas COMPILEN no dice nada. Un `deploy` acepta sin
// chistar una regla que deja pasar un reporte con un gasto de nueve millones, o
// una que bloquea al vecino entero. Las dos cosas se ven acá y en ningún otro
// lado: el arnés de esta prueba ya atrapó un seed silenciosamente rechazado que
// hacía pasar por "denegado correctamente" a trece casos que en realidad fallaban
// por otro motivo.
//
// Al agregar una regla nueva, agregar acá el caso que debe pasar Y el que debe
// ser rechazado. Un solo lado no prueba nada.
import { initializeApp } from 'firebase/app'
import {
  getFirestore, connectFirestoreEmulator, doc, setDoc, writeBatch, serverTimestamp,
  collection, getDocs, query, where, limit, orderBy,
} from 'firebase/firestore'

const app = initializeApp({ projectId: 'demo-validacion', apiKey: 'x' })
const db = getFirestore(app)
connectFirestoreEmulator(db, '127.0.0.1', 8080)

let ok = 0, fallos = 0
async function caso(nombre, esperado, fn) {
  let resultado = 'permitido'
  try { await fn() } catch (e) { resultado = e.code === 'permission-denied' ? 'denegado' : `error:${e.code||e.message}` }
  const bien = resultado === esperado
  bien ? ok++ : fallos++
  console.log(`${bien ? '  OK  ' : ' FALLA'} ${nombre} -> ${resultado} (esperado ${esperado})`)
}

// Semilla: la municipalidad tiene que existir (lo exige la regla de create).
// Se escribe con la REST API del emulador, que ignora las reglas.
const seed = await fetch('http://127.0.0.1:8080/v1/projects/demo-validacion/databases/(default)/documents/municipalidades?documentId=licanten', {
  method: 'POST',
  // "Bearer owner" es la credencial de administrador del emulador: sin ella el
  // emulador aplica firestore.rules también a la REST API y el seed se rechaza
  // (municipalidades tiene allow write: if false).
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
  body: JSON.stringify({ fields: { nombre: { stringValue: 'Licantén' } } }),
})
if (!seed.ok) { console.error('No se pudo sembrar la municipalidad:', seed.status, await seed.text()); process.exit(2) }

const base = (extra = {}) => ({
  categoria: 'bache', coordenadas: { lat: -34.9802, lng: -71.9873 },
  direccion_texto: 'Los Aromos 320', referencia_ubicacion: 'frente a la posta',
  detalles_adicionales: 'Lleva dos semanas así', nombre_ciudadano: 'Juana',
  contacto_ciudadano: '+56900000000', estado: 'Pendiente', municipio_id: 'licanten',
  nivel_gravedad: 'Media', departamento: 'Operaciones',
  presupuesto_estimado: null, gasto_real: null, cuadrilla_asignada: '',
  fotos_antes_urls: [], foto_despues_url: '', calificacion_ciudadano: null,
  upvotes: 1, fecha_asignacion: null, fecha_cierre: null,
  fecha_creacion: serverTimestamp(), ...extra,
})

let n = 0
function crear(extra) {
  const id = `inc-${++n}`
  const dispositivo = `disp-${n}`   // uno por caso: el enfriamiento es por dispositivo
  const lote = writeBatch(db)
  lote.set(doc(db, 'incidencias', id), base({ dispositivo_id: dispositivo, ...extra }))
  lote.set(doc(db, 'dispositivos', dispositivo), { ultimo_reporte: serverTimestamp() })
  return lote.commit()
}

console.log('\n--- incidencias: creación anónima ---')
await caso('reporte válido del vecino', 'permitido', () => crear({}))
await caso('estado distinto de Pendiente', 'denegado', () => crear({ estado: 'Resuelto' }))
await caso('trae gasto_real con costo', 'denegado', () => crear({ gasto_real: { costo_final: 9000000, horas_reales: 2 } }))
await caso('trae presupuesto_estimado', 'denegado', () => crear({ presupuesto_estimado: { costo_aprox: 500000 } }))
await caso('nace con cuadrilla asignada', 'denegado', () => crear({ cuadrilla_asignada: 'Cuadrilla 1' }))
await caso('nace con 40 upvotes', 'denegado', () => crear({ upvotes: 40 }))
await caso('detalles de 1001 caracteres', 'denegado', () => crear({ detalles_adicionales: 'x'.repeat(1001) }))
await caso('detalles de 1000 caracteres', 'permitido', () => crear({ detalles_adicionales: 'x'.repeat(1000) }))
await caso('coordenadas (0,0)', 'denegado', () => crear({ coordenadas: { lat: 0, lng: 0 } }))
await caso('coordenadas en Madrid', 'denegado', () => crear({ coordenadas: { lat: 40.4, lng: -3.7 } }))
await caso('coordenadas de texto', 'denegado', () => crear({ coordenadas: { lat: '-34.9', lng: '-71.9' } }))
await caso('direccion_texto numérica', 'denegado', () => crear({ direccion_texto: 123 }))
await caso('referencia de 301 caracteres', 'denegado', () => crear({ referencia_ubicacion: 'y'.repeat(301) }))

console.log('\n--- incidencias: lectura anónima (Ley 19.628) ---')
await caso('listar incidencias sin login', 'denegado',
  () => getDocs(query(collection(db, 'incidencias'), limit(5))))

console.log('\n--- tickets_publicos: listado acotado ---')
await caso('list con limit(25) — mapa ciudadano', 'permitido',
  () => getDocs(query(collection(db, 'tickets_publicos'), where('municipio_id', '==', 'licanten'), orderBy('fecha_creacion', 'desc'), limit(25))))
await caso('list con limit(500) — Transparencia', 'permitido',
  () => getDocs(query(collection(db, 'tickets_publicos'), where('municipio_id', '==', 'licanten'), orderBy('fecha_creacion', 'desc'), limit(500))))
await caso('list con limit(501)', 'denegado',
  () => getDocs(query(collection(db, 'tickets_publicos'), limit(501))))
await caso('list SIN limit (raspado)', 'denegado',
  () => getDocs(collection(db, 'tickets_publicos')))

console.log(`\n${ok} correctas, ${fallos} fallidas`)
process.exit(fallos > 0 ? 1 : 0)
