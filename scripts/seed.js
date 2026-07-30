// Script de siembra (seed) de datos de prueba para el Firebase Emulator Suite LOCAL.
// NUNCA apuntar este script a un proyecto Firebase real: crea usuarios con
// contraseñas de prueba conocidas públicamente en este repositorio.
//
// Uso:
//   1) En una terminal: npm run emulators
//   2) En otra terminal: npm run seed

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'

import admin from 'firebase-admin'
import { calcularGravedad } from '../src/utils/gravedad.js'

admin.initializeApp({ projectId: 'demo-incidencias-urbanas' })

const auth = admin.auth()
const db = admin.firestore()

const MUNICIPIO_ID = 'demo'

const MUNICIPALIDAD_DEMO = {
  nombre: 'Municipalidad Demo',
  color_primario: '#1D4ED8',
  color_primario_oscuro: '#1E3A8A',
  centro_mapa: { lat: -33.4372, lng: -70.6506 },
  cuadrillas: ['Cuadrilla Norte', 'Cuadrilla Sur', 'Cuadrilla Centro'],
}

const FUNCIONARIOS = [
  { email: 'admin@incidencias.cl', password: 'Admin123!', nombre: 'María Pérez (DOM)', rol: 'ADMIN' },
  { email: 'terreno@incidencias.cl', password: 'Terreno123!', nombre: 'Juan Soto (Cuadrilla Norte)', rol: 'TERRENO' },
]

// hace atrás N meses desde hoy, para poder probar el filtro "este mes" de Estadísticas Rápidas
function hace(mesesAtras) {
  const fecha = new Date()
  fecha.setMonth(fecha.getMonth() - mesesAtras)
  return admin.firestore.Timestamp.fromDate(fecha)
}

const INCIDENCIAS_DEMO = [
  {
    categoria: 'Bache',
    coordenadas: { lat: -33.4372, lng: -70.6506 },
    direccion_texto: 'Av. Libertador Bernardo O\'Higgins 1200',
    estado: 'Pendiente',
    cuadrilla_asignada: '',
    fecha_creacion: hace(0),
  },
  {
    categoria: 'Luminaria',
    coordenadas: { lat: -33.4450, lng: -70.6550 },
    direccion_texto: 'Calle Merced 350',
    estado: 'Pendiente',
    cuadrilla_asignada: '',
    fecha_creacion: hace(0),
  },
  {
    categoria: 'Basural',
    coordenadas: { lat: -33.4300, lng: -70.6420 },
    direccion_texto: 'Parque Forestal, sector oriente',
    estado: 'Asignado',
    cuadrilla_asignada: 'Cuadrilla Norte',
    fecha_creacion: hace(0),
  },
  {
    categoria: 'Arbol_caido',
    coordenadas: { lat: -33.4400, lng: -70.6600 },
    direccion_texto: 'Av. Providencia 2050',
    estado: 'Resuelto',
    cuadrilla_asignada: 'Cuadrilla Centro',
    fecha_creacion: hace(0),
    fecha_cierre: admin.firestore.Timestamp.now(),
  },
  {
    categoria: 'Grafiti',
    coordenadas: { lat: -33.4310, lng: -70.6480 },
    direccion_texto: 'Pasaje Lastarria 45',
    estado: 'Resuelto',
    cuadrilla_asignada: 'Cuadrilla Sur',
    fecha_creacion: hace(1), // mes pasado, para que NO cuente en "este mes"
    fecha_cierre: hace(1),
  },
]

async function crearMunicipalidad() {
  console.log('Creando municipalidad demo...')
  await db.collection('municipalidades').doc(MUNICIPIO_ID).set(MUNICIPALIDAD_DEMO, { merge: true })
}

async function crearFuncionarios() {
  console.log('Creando usuarios municipales de prueba...')

  for (const f of FUNCIONARIOS) {
    let usuario
    try {
      usuario = await auth.getUserByEmail(f.email)
      console.log(`  - ${f.email} ya existía (uid: ${usuario.uid})`)
    } catch {
      usuario = await auth.createUser({ email: f.email, password: f.password, displayName: f.nombre })
      console.log(`  - Creado ${f.email} (uid: ${usuario.uid})`)
    }

    await db.collection('usuarios_municipales').doc(usuario.uid).set({
      nombre: f.nombre,
      rol: f.rol,
      municipio_id: MUNICIPIO_ID,
    })
  }
}

async function crearIncidenciasDemo() {
  console.log('Creando incidencias de prueba...')

  const existentes = await db.collection('incidencias').where('municipio_id', '==', MUNICIPIO_ID).limit(1).get()
  if (!existentes.empty) {
    console.log('  - Ya existen incidencias para este municipio, se omite la siembra para no duplicar.')
    return
  }

  for (const inc of INCIDENCIAS_DEMO) {
    const { nivel_gravedad, color_pin } = calcularGravedad(inc.categoria)
    await db.collection('incidencias').add({
      foto_antes_url: '',
      foto_despues_url: '',
      fecha_cierre: null,
      detalles_adicionales: '',
      nombre_ciudadano: '',
      contacto_ciudadano: '',
      es_anonimo: true,
      numero_ticket: `INC-DEMO-${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
      municipio_id: MUNICIPIO_ID,
      nivel_gravedad,
      color_pin,
      ...inc,
    })
  }
  console.log(`  - ${INCIDENCIAS_DEMO.length} incidencias creadas.`)
}

async function main() {
  await crearMunicipalidad()
  await crearFuncionarios()
  await crearIncidenciasDemo()

  console.log('\nListo. Credenciales de prueba:')
  FUNCIONARIOS.forEach((f) => console.log(`  ${f.rol.padEnd(8)} → ${f.email} / ${f.password}`))
  console.log(`\nCiudadano: http://localhost:5173/${MUNICIPIO_ID}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Error al sembrar datos:', err)
  process.exit(1)
})
