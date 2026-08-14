// Crea la cuenta de Auth + perfil en usuarios_municipales para los Jefes de
// Departamento que le faltan al tenant "demo", así el panel del Alcalde de
// demostración se puede probar con los 7 departamentos activos, no solo 2.
//
// Usa el Admin SDK directo (no el flujo de GestionFuncionariosPage.jsx, que
// depende de una sesión de navegador) — mismo resultado: crea el usuario en el
// mismo pool de Firebase Auth del proyecto, así que el login funciona igual.
//
// Uso:
//   node scripts/crear-jefes-demo.mjs              (solo informa, NO escribe)
//   node scripts/crear-jefes-demo.mjs --aplicar    (escribe de verdad)

import { readFileSync } from 'fs'
import admin from 'firebase-admin'

const APLICAR = process.argv.includes('--aplicar')

const credencial = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf-8'))
admin.initializeApp({ credential: admin.credential.cert(credencial) })
const db = admin.firestore()
const auth = admin.auth()

const MUNICIPIO_ID = 'demo'
const CONTRASENA = 'TuMuniDemo2026!'

const NUEVOS = [
  { nombre: 'Ana Riquelme', correo: 'jefeobras.demo@tumuniaqui.cl', departamento: 'Dirección de Obras (DOM)' },
  { nombre: 'Cristián Bustos', correo: 'jefetransito.demo@tumuniaqui.cl', departamento: 'Tránsito' },
  { nombre: 'Paola Sepúlveda', correo: 'jefeoperaciones.demo@tumuniaqui.cl', departamento: 'Operaciones' },
  { nombre: 'Héctor Alarcón', correo: 'jefeseguridad.demo@tumuniaqui.cl', departamento: 'Seguridad Ciudadana' },
  { nombre: 'Carolina Mora', correo: 'jefepartes.demo@tumuniaqui.cl', departamento: 'Oficina de Partes' },
]

console.log(`Tenant: ${MUNICIPIO_ID}  |  Contraseña compartida: ${CONTRASENA}\n`)

for (const jefe of NUEVOS) {
  const yaExiste = await db
    .collection('usuarios_municipales')
    .where('municipio_id', '==', MUNICIPIO_ID)
    .where('departamento', '==', jefe.departamento)
    .where('rol', '==', 'JEFE_DEPARTAMENTO')
    .get()

  if (!yaExiste.empty) {
    console.log(`YA EXISTE  ${jefe.departamento} -> ${yaExiste.docs[0].data().correo}, se omite.`)
    continue
  }

  if (!APLICAR) {
    console.log(`CREARÍA    ${jefe.departamento.padEnd(28)} ${jefe.correo}`)
    continue
  }

  const usuario = await auth.createUser({
    email: jefe.correo,
    password: CONTRASENA,
    displayName: jefe.nombre,
  })

  await db.collection('usuarios_municipales').doc(usuario.uid).set({
    nombre: jefe.nombre,
    correo: jefe.correo,
    rol: 'JEFE_DEPARTAMENTO',
    departamento: jefe.departamento,
    telefono: '',
    municipio_id: MUNICIPIO_ID,
    fecha_creacion: admin.firestore.FieldValue.serverTimestamp(),
  })

  console.log(`CREADO     ${jefe.departamento.padEnd(28)} ${jefe.correo}  (uid ${usuario.uid})`)
}

if (!APLICAR) {
  console.log('\nEsto fue solo un informe, no se escribió nada.')
  console.log('Para aplicarlo: node scripts/crear-jefes-demo.mjs --aplicar\n')
}

process.exit(0)
