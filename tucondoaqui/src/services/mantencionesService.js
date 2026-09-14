import { arrayUnion, collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db, COLECCIONES } from '../firebase/firebase'

// Registro de cumplimiento de las obligaciones de la Ley 21.442
// (vertical de condominios — ver src/utils/mantenciones.js para el catálogo).
//
// Vive como subcolección del tenant, `condominios/{id}/mantenciones/{obligacionId}`,
// y no como colección propia, por dos razones:
//   - el ID del documento ES el id de la obligación del catálogo, así que no hay
//     forma de duplicar el registro de la misma obligación por accidente;
//   - la ruta ya lleva el tenant, así que la regla de Firestore no necesita leer
//     el documento para saber de quién es (se acota por `condominioId` de la ruta).
//
// Cada documento guarda SOLO el último cumplimiento, más el `historial` de los
// anteriores. El historial importa tanto como el estado actual: ante el comité o
// una fiscalización, lo que se pide no es "¿está al día?" sino "muéstrame los
// certificados de los últimos años".

function refMantencion(condominioId, obligacionId) {
  return doc(db, COLECCIONES.CONDOMINIOS, condominioId, 'mantenciones', obligacionId)
}

// Escucha en tiempo real y devuelve el mapa { [obligacionId]: registro } que
// espera planMantenciones(). Devuelve el mapa completo en cada cambio —son 14
// documentos como máximo, no vale la pena nada más fino.
export function suscribirMantenciones(condominioId, callback) {
  if (!condominioId) return () => {}

  const ref = collection(db, COLECCIONES.CONDOMINIOS, condominioId, 'mantenciones')

  return onSnapshot(
    ref,
    (snap) => {
      const registros = {}
      snap.forEach((documento) => {
        registros[documento.id] = documento.data()
      })
      callback(registros)
    },
    (error) => {
      console.error('[mantencionesService] Error al escuchar mantenciones:', error)
      // Mapa vacío y no un throw: sin registros el panel muestra todo como "sin
      // registro", que es incómodo pero honesto. Dejarlo cargando para siempre
      // sería peor.
      callback({})
    },
 )
}

// Registra un cumplimiento. `registroAnterior` es el que estaba guardado antes
// (si lo hay): se empuja al historial dentro de la MISMA escritura, para que no
// exista un instante en que el certificado viejo ya se perdió y el nuevo todavía
// no se guardó.
export async function registrarMantencion({
  condominioId,
  obligacionId,
  ultimaFecha,
  proveedor,
  documentoUrl,
  periodicidadMeses,
  registroAnterior,
  registradoPor,
}) {
  if (!condominioId || !obligacionId) {
    throw new Error('Falta identificar el condominio o la obligación.')
  }
  if (!ultimaFecha) {
    throw new Error('La fecha de ejecución es obligatoria.')
  }

  const datos = {
    ultima_fecha: ultimaFecha,
    proveedor: proveedor || '',
    documento_url: documentoUrl || '',
    registrado_por: registradoPor || '',
    registrado_en: serverTimestamp(),
  }

  // Solo se guarda si de verdad se personalizó: escribir el default del catálogo
  // lo congelaría, y entonces corregir la periodicidad en el código ya no se
  // reflejaría en los condominios que nunca la tocaron.
  if (periodicidadMeses) {
    datos.periodicidad_meses = Number(periodicidadMeses)
  }

  if (registroAnterior?.ultima_fecha) {
    datos.historial = arrayUnion({
      ultima_fecha: registroAnterior.ultima_fecha,
      proveedor: registroAnterior.proveedor || '',
      documento_url: registroAnterior.documento_url || '',
    })
  }

  await setDoc(refMantencion(condominioId, obligacionId), datos, { merge: true })
}
