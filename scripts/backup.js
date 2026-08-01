// Respaldo manual/periódico de Firestore a un archivo JSON local. Usa el Admin
// SDK (bypassa firestore.rules, tiene acceso total) con una cuenta de servicio
// — por eso NUNCA corre contra el emulador, y la llave (serviceAccountKey.json,
// en la raíz del proyecto, gitignored) nunca debe subirse a git ni compartirse.
//
// Uso:
//   1) Descargar la llave desde Firebase Console (Configuración del proyecto >
//      Cuentas de servicio > Generar nueva clave privada) y guardarla como
//      "serviceAccountKey.json" en la raíz de reporte-incidencias/.
//   2) node scripts/backup.js  (o: npm run backup)
//
// Cada corrida escribe backups/backup-YYYY-MM-DD_HHmm.json con todas las
// colecciones. Se conservan como máximo los últimos 14 respaldos — los más
// viejos se borran solos para no llenar el disco.

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import admin from 'firebase-admin'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(__dirname, '..')
const RUTA_LLAVE = join(RAIZ, 'serviceAccountKey.json')
const CARPETA_BACKUPS = join(RAIZ, 'backups')
const MAX_BACKUPS_A_CONSERVAR = 14

const COLECCIONES = [
  'incidencias',
  'usuarios_municipales',
  'municipalidades',
  'tickets_publicos',
  'trabajadores',
  'ubicaciones_cuadrilla',
]

if (!existsSync(RUTA_LLAVE)) {
  console.error(
    `[backup] No encontré "serviceAccountKey.json" en la raíz del proyecto (${RUTA_LLAVE}).\n` +
    '[backup] Descárgala desde Firebase Console > Configuración del proyecto > Cuentas de servicio > Generar nueva clave privada.'
  )
  process.exit(1)
}

const credencial = JSON.parse(readFileSync(RUTA_LLAVE, 'utf-8'))
admin.initializeApp({ credential: admin.credential.cert(credencial) })
const db = admin.firestore()

// Convierte Timestamps de Firestore a texto ISO legible (en vez del objeto
// interno {_seconds, _nanoseconds}) para que el JSON resultante sea legible
// y portable sin depender del SDK de Firebase para interpretarlo.
function normalizar(valor) {
  if (valor?.toDate) return valor.toDate().toISOString()
  if (Array.isArray(valor)) return valor.map(normalizar)
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, normalizar(v)]))
  }
  return valor
}

async function respaldarColeccion(nombre) {
  const snap = await db.collection(nombre).get()
  return snap.docs.map((d) => ({ id: d.id, ...normalizar(d.data()) }))
}

async function respaldarSeguimientos() {
  // Subcolección incidencias/{id}/seguimientos — collectionGroup trae TODAS
  // de una sola consulta, sin iterar incidencia por incidencia.
  const snap = await db.collectionGroup('seguimientos').get()
  return snap.docs.map((d) => ({ id: d.id, incidencia_id: d.ref.parent.parent.id, ...normalizar(d.data()) }))
}

function limpiarBackupsAntiguos() {
  const archivos = readdirSync(CARPETA_BACKUPS)
    .filter((f) => f.startsWith('backup-') && f.endsWith('.json'))
    .map((f) => ({ nombre: f, ruta: join(CARPETA_BACKUPS, f), mtime: statSync(join(CARPETA_BACKUPS, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)

  archivos.slice(MAX_BACKUPS_A_CONSERVAR).forEach((f) => {
    unlinkSync(f.ruta)
    console.log(`[backup] Borrado respaldo antiguo: ${f.nombre}`)
  })
}

async function main() {
  if (!existsSync(CARPETA_BACKUPS)) mkdirSync(CARPETA_BACKUPS)

  console.log('[backup] Exportando colecciones...')
  const datos = { fecha_respaldo: new Date().toISOString() }
  for (const nombre of COLECCIONES) {
    datos[nombre] = await respaldarColeccion(nombre)
    console.log(`[backup]   ${nombre}: ${datos[nombre].length} documentos`)
  }
  datos.seguimientos = await respaldarSeguimientos()
  console.log(`[backup]   seguimientos: ${datos.seguimientos.length} documentos`)

  const marcaTiempo = new Date().toISOString().replace(/:/g, '').slice(0, 15).replace('T', '_')
  const rutaArchivo = join(CARPETA_BACKUPS, `backup-${marcaTiempo}.json`)
  writeFileSync(rutaArchivo, JSON.stringify(datos, null, 2), 'utf-8')

  console.log(`[backup] Listo: ${rutaArchivo}`)
  limpiarBackupsAntiguos()
  process.exit(0)
}

main().catch((error) => {
  console.error('[backup] Error durante el respaldo:', error)
  process.exit(1)
})
