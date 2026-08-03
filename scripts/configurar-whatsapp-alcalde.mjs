// Configura a qué celular le llegan las alertas de emergencia (gravedad Alta).
// Ver §32 en ESTADO_PROYECTO.md.
//
// Uso:
//   node scripts/configurar-whatsapp-alcalde.mjs <municipio> <numero>
//   node scripts/configurar-whatsapp-alcalde.mjs licanten +56912345678
//
// Para desactivar las alertas:
//   node scripts/configurar-whatsapp-alcalde.mjs licanten quitar
//
// Requiere serviceAccountKey.json en la raíz del proyecto.

import { readFileSync } from 'fs'
import admin from 'firebase-admin'

const [municipioId, numeroCrudo] = process.argv.slice(2)

if (!municipioId || !numeroCrudo) {
  console.error('Uso: node scripts/configurar-whatsapp-alcalde.mjs <municipio> <numero|quitar>')
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

if (numeroCrudo.toLowerCase() === 'quitar') {
  await ref.update({ whatsapp_alcalde: admin.firestore.FieldValue.delete() })
  console.log(`Listo: ${municipioId} ya no recibe alertas de emergencia.`)
  process.exit(0)
}

// Normaliza a +56XXXXXXXXX, igual que los contactos de los vecinos.
const digitos = numeroCrudo.replace(/\D/g, '')
const normalizado = digitos.startsWith('56') ? `+${digitos}` : `+56${digitos}`

if (normalizado.length !== 12) {
  console.error(`"${numeroCrudo}" no parece un celular chileno válido (quedó como ${normalizado}).`)
  console.error('Formato esperado: 9 1234 5678 o +56912345678')
  process.exit(1)
}

await ref.update({ whatsapp_alcalde: normalizado })
console.log(`Listo: las emergencias de "${snap.data().nombre}" se avisarán a ${normalizado}.`)
console.log('Reinicia el bot (whatsapp-bot) para que tome el cambio.')
process.exit(0)
