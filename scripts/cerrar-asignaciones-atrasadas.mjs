// Marca como ya notificadas las asignaciones VIEJAS, para que al encender
// WHATSAPP_TEMPLATE_ASIGNACION (§42) no salga una tanda de avisos retroactivos.
//
// Uso:
//   node scripts/cerrar-asignaciones-atrasadas.mjs            (simulacro)
//   node scripts/cerrar-asignaciones-atrasadas.mjs --aplicar
//
// POR QUÉ HACE FALTA
// ------------------
// El listener de EVENTO 3 no escucha "cambios de ahora en adelante": consulta
// `estado == 'En Proceso' AND notificado_whatsapp_asignacion == false` y procesa
// TODO lo que ya cumple la condición, incluido lo asignado hace días. Es el
// mismo comportamiento que hizo salir solos los 4 avisos pendientes cuando Meta
// aprobó las plantillas el 11-ago (§39) — ahí fue lo que se quería; acá no.
//
// Al vecino un "su reporte ya fue asignado" sobre algo asignado la semana pasada
// no le suena a sistema nuevo, le suena a sistema con retraso. Y en el caso del
// reporte de Linares le llegaría a alguien de otra comuna.
//
// Correr ESTO antes de poner la variable en Render. Después de eso, los avisos
// salen solo para asignaciones nuevas, que es el punto.

import admin from 'firebase-admin'
import { readFileSync } from 'fs'

const APLICAR = process.argv.includes('--aplicar')

const credencial = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf-8'))
admin.initializeApp({ credential: admin.credential.cert(credencial) })
const db = admin.firestore()

const snap = await db
  .collection('incidencias')
  .where('estado', '==', 'En Proceso')
  .where('notificado_whatsapp_asignacion', '==', false)
  .get()

if (!APLICAR) console.log('*** SIMULACRO — no se escribe nada. Agrega --aplicar. ***\n')

// Firebase Admin SDK rechaza un WriteBatch con más de 500 operaciones
// ("Transaction too big" / INVALID_ARGUMENT), y un batch rechazado no escribe
// NADA: si esta consulta llegara a devolver 501 documentos, el script fallaría
// entero y quedaría la tanda de avisos retroactivos que justamente viene a
// evitar. Hoy son ~decenas, pero eso depende del histórico del municipio, no
// del script — el límite tiene que estar acá, no en la suerte.
//
// 400 y no 500: deja margen para que una operación futura sobre el mismo
// documento (una segunda update, un set de auditoría) quepa sin volver a
// tropezar con el tope.
const MAX_OPERACIONES_POR_LOTE = 400

const documentos = snap.docs

for (const d of documentos) {
  const x = d.data()
  console.log(`  ${x.municipio_id} | ${x.numero_ticket} | ${x.contacto_ciudadano || '(sin teléfono)'} | "${(x.direccion_texto ?? '').slice(0, 34)}"`)
}

if (APLICAR) {
  // Los lotes se envían de a uno y en orden (no Promise.all): son escrituras
  // contra la cuota de Firestore y el objetivo no es terminar rápido, sino que
  // si algo falla se sepa exactamente hasta dónde se alcanzó a aplicar.
  for (let desde = 0; desde < documentos.length; desde += MAX_OPERACIONES_POR_LOTE) {
    const bloque = documentos.slice(desde, desde + MAX_OPERACIONES_POR_LOTE)
    const lote = db.batch()

    for (const d of bloque) {
      lote.update(d.ref, { notificado_whatsapp_asignacion: true })
    }

    await lote.commit()
    console.log(`  → lote aplicado: ${desde + bloque.length} de ${documentos.length}`)
  }
}

console.log(`\n${APLICAR ? 'Marcados como notificados' : 'Se marcarían'}: ${snap.size}`)
console.log('Ninguno recibe mensaje. Los avisos empiezan con la próxima asignación real.')
process.exit(0)
