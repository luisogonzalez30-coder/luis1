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

const lote = db.batch()
snap.forEach(d => {
  const x = d.data()
  console.log(`  ${x.municipio_id} | ${x.numero_ticket} | ${x.contacto_ciudadano || '(sin teléfono)'} | "${(x.direccion_texto ?? '').slice(0, 34)}"`)
  if (APLICAR) lote.update(d.ref, { notificado_whatsapp_asignacion: true })
})

if (APLICAR) await lote.commit()

console.log(`\n${APLICAR ? 'Marcados como notificados' : 'Se marcarían'}: ${snap.size}`)
console.log('Ninguno recibe mensaje. Los avisos empiezan con la próxima asignación real.')
process.exit(0)
