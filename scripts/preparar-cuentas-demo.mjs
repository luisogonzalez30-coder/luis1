// Deja el tenant "demo" listo para presentar: una cuenta administradora por
// departamento con contraseña conocida, el perfil del Alcalde completo, y sin
// datos basura de pruebas anteriores a la vista.
//
// Solo toca el tenant "demo". Nunca "licanten".
//
// No borra ninguna cuenta de Firebase Auth: lo más destructivo que hace es
// reescribir campos de perfil y resetear contraseñas de las cuentas de demo.
//
// Uso:
//   node scripts/preparar-cuentas-demo.mjs              (informa, NO escribe)
//   node scripts/preparar-cuentas-demo.mjs --aplicar    (escribe de verdad)

import { readFileSync } from 'fs'
import admin from 'firebase-admin'
import { DEPARTAMENTOS, calcularDepartamento } from '../src/utils/departamento.js'

const APLICAR = process.argv.includes('--aplicar')
const MUNICIPIO_ID = 'demo'
const CONTRASENA = 'TuMuniDemo2026!'

const credencial = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf-8'))
admin.initializeApp({ credential: admin.credential.cert(credencial) })
const db = admin.firestore()
const auth = admin.auth()

// Correo canónico y nombre de fantasía por departamento.
const JEFES = {
  'Dirección de Obras (DOM)': ['jefeobras.demo@tumuniaqui.cl', 'Ana Riquelme'],
  'Tránsito': ['jefetransito.demo@tumuniaqui.cl', 'Cristián Bustos'],
  'Operaciones': ['jefeoperaciones.demo@tumuniaqui.cl', 'Paola Sepúlveda'],
  'Aseo y Ornato': ['jefeaseo.demo@tumuniaqui.cl', 'Rodrigo Cáceres'],
  'Medio Ambiente': ['jefeambiente.demo@tumuniaqui.cl', 'Valentina Soto'],
  'Seguridad Ciudadana': ['jefeseguridad.demo@tumuniaqui.cl', 'Héctor Alarcón'],
  'Oficina de Partes': ['jefepartes.demo@tumuniaqui.cl', 'Carolina Mora'],
}

const ALCALDE = ['alcalde.demo@tumuniaqui.cl', 'Alcalde (demostración)']

const acciones = []
const credenciales = []

// ---------------------------------------------------------------- 1. jefes
async function asegurarCuenta(correo, nombre, rol, departamento) {
  let uid = null
  try {
    uid = (await auth.getUserByEmail(correo)).uid
  } catch {
    /* no existe */
  }

  if (uid) {
    acciones.push(`RESET  contraseña de ${correo}`)
    if (APLICAR) await auth.updateUser(uid, { password: CONTRASENA, displayName: nombre })
  } else {
    acciones.push(`CREAR  cuenta ${correo} (${rol}${departamento ? ' · ' + departamento : ''})`)
    if (APLICAR) {
      uid = (await auth.createUser({ email: correo, password: CONTRASENA, displayName: nombre })).uid
    }
  }

  if (APLICAR && uid) {
    await db.collection('usuarios_municipales').doc(uid).set(
      {
        nombre,
        correo,
        rol,
        departamento,
        telefono: '',
        municipio_id: MUNICIPIO_ID,
        fecha_creacion: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  }
  credenciales.push([departamento || '(todos los departamentos)', rol, correo])
}

for (const dep of DEPARTAMENTOS) {
  const [correo, nombre] = JEFES[dep]
  await asegurarCuenta(correo, nombre, 'JEFE_DEPARTAMENTO', dep)
}
await asegurarCuenta(ALCALDE[0], ALCALDE[1], 'ALCALDE_ADMIN', 'todos')

// ------------------------------------- 2. completar el perfil propio del dueño
const propios = await db
  .collection('usuarios_municipales')
  .where('municipio_id', '==', MUNICIPIO_ID)
  .where('rol', '==', 'ALCALDE_ADMIN')
  .get()

for (const d of propios.docs) {
  const u = d.data()
  if (u.correo && u.departamento) continue
  let correoAuth = null
  try {
    correoAuth = (await auth.getUser(d.id)).email
  } catch {
    /* sin cuenta Auth */
  }
  if (!correoAuth) continue
  acciones.push(`COMPLETAR perfil de ${correoAuth} (le faltaba ${!u.correo ? 'correo' : ''}${!u.correo && !u.departamento ? ' y ' : ''}${!u.departamento ? 'departamento' : ''})`)
  if (APLICAR) {
    await d.ref.set({ correo: correoAuth, departamento: u.departamento || 'todos' }, { merge: true })
  }
}

// ------------------------------------- 3. incidencias sin departamento y basura
const inc = await db.collection('incidencias').where('municipio_id', '==', MUNICIPIO_ID).get()
let sinDepto = 0
let basura = 0
const lote = db.batch()

for (const d of inc.docs) {
  const i = d.data()
  const parche = {}

  if (!i.departamento && i.categoria) {
    parche.departamento = calcularDepartamento(i.categoria)
    sinDepto += 1
  }

  // Texto de pruebas viejas que se ve en pantalla durante la demo.
  const esBasura = (t) => typeof t === 'string' && /preparaci[oó]n de la prueba|borrar|^test$|^prueba$/i.test(t)
  if (esBasura(i.direccion_texto)) {
    parche.direccion_texto = 'Licantén centro'
    basura += 1
  }
  if (esBasura(i.detalles_adicionales)) {
    parche.detalles_adicionales = ''
  }

  if (Object.keys(parche).length && APLICAR) lote.update(d.ref, parche)
}

if (sinDepto) acciones.push(`DERIVAR ${sinDepto} incidencias que no tenían departamento`)
if (basura) acciones.push(`LIMPIAR ${basura} incidencias con texto de prueba visible`)
if (APLICAR && (sinDepto || basura)) await lote.commit()

// ------------------------------------------------------------------ informe
console.log(`\nTenant: ${MUNICIPIO_ID}\n`)
for (const a of acciones) console.log('  ' + a)

console.log(`\n  ${'DEPARTAMENTO'.padEnd(30)} ${'ROL'.padEnd(19)} CORREO`)
console.log('  ' + '-'.repeat(88))
for (const [dep, rol, correo] of credenciales) {
  console.log(`  ${dep.padEnd(30)} ${rol.padEnd(19)} ${correo}`)
}
console.log(`\n  Contraseña para todas: ${CONTRASENA}`)

if (!APLICAR) {
  console.log('\nEsto fue solo un informe, no se escribió nada.')
  console.log('Para aplicarlo: node scripts/preparar-cuentas-demo.mjs --aplicar\n')
}

process.exit(0)
