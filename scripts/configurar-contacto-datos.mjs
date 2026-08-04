// Configura el correo al que los vecinos escriben para ejercer sus derechos
// sobre sus datos personales (acceso, rectificación, supresión, oposición,
// portabilidad y bloqueo — Ley 21.719).
//
// Ese correo aparece en /:municipio/privacidad y /:municipio/terminos. Tiene
// que ser un correo DE LA MUNICIPALIDAD, no tuyo: bajo la ley, la responsable
// del tratamiento es la municipalidad y es ella la que debe responderle al
// vecino dentro del plazo legal.
//
// Si no se configura, las páginas legales dirigen al vecino a la Oficina de
// Partes en vez de mostrar un correo inventado. Funciona, pero es peor: deja
// al vecino sin un canal escrito y trazable.
//
// Uso:
//   node scripts/configurar-contacto-datos.mjs <municipio> <correo>
//   node scripts/configurar-contacto-datos.mjs licanten transparencia@munilicanten.cl
//
// Para quitarlo:
//   node scripts/configurar-contacto-datos.mjs licanten quitar
//
// Requiere serviceAccountKey.json en la raíz del proyecto.

import { readFileSync } from 'fs'
import admin from 'firebase-admin'

const [municipioId, correoCrudo] = process.argv.slice(2)

if (!municipioId || !correoCrudo) {
  console.error('Uso: node scripts/configurar-contacto-datos.mjs <municipio> <correo|quitar>')
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

if (correoCrudo.toLowerCase() === 'quitar') {
  await ref.update({ contacto_datos: admin.firestore.FieldValue.delete() })
  console.log(`Listo: "${snap.data().nombre}" vuelve a dirigir a la Oficina de Partes.`)
  process.exit(0)
}

const correo = correoCrudo.trim().toLowerCase()

// Validación deliberadamente simple: lo que importa es cazar el dedazo obvio
// (falta la @, falta el dominio), no implementar el RFC. Un correo mal escrito
// acá deja a los vecinos sin poder ejercer sus derechos y nadie se entera.
if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) {
  console.error(`"${correoCrudo}" no parece un correo válido.`)
  process.exit(1)
}

await ref.update({ contacto_datos: correo })

console.log(`Listo: las páginas legales de "${snap.data().nombre}" apuntan a ${correo}.`)
console.log('\nRevísalo en:')
console.log(`  https://app-incidencias-urbanas.web.app/${municipioId}/privacidad`)
console.log('\nImportante: confirma con el municipio que ese buzón lo lee alguien.')
process.exit(0)
