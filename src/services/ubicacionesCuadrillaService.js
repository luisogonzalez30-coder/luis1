import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { db, COLECCIONES } from '../firebase/firebase'

const ubicacionesRef = collection(db, COLECCIONES.UBICACIONES_CUADRILLA)

// ID determinístico (municipio + cuadrilla): actualizar la ubicación de una
// cuadrilla sobrescribe el mismo documento en vez de acumular históricos —
// solo interesa dónde está AHORA, no un registro de recorrido.
function idUbicacion(municipioId, cuadrilla) {
  return `${municipioId}__${cuadrilla.replace(/\s+/g, '_')}`
}

// Ubicación manual de cada cuadrilla (ver "Órdenes de Trabajo y Costeo" en
// ESTADO_PROYECTO.md — no es GPS real, el Jefe de Departamento la actualiza a
// mano desde PanelGestionDepartamento.jsx). Se suscribe a TODAS las de la
// municipalidad (son pocas, una por cuadrilla) y se busca por nombre en memoria.
export function suscribirUbicacionesCuadrilla(callback, municipioId) {
  if (!municipioId) return () => {}

  const q = query(ubicacionesRef, where('municipio_id', '==', municipioId))

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

export async function actualizarUbicacionCuadrilla({ municipioId, cuadrilla, coordenadas }) {
  await setDoc(doc(db, COLECCIONES.UBICACIONES_CUADRILLA, idUbicacion(municipioId, cuadrilla)), {
    municipio_id: municipioId,
    cuadrilla,
    coordenadas,
    actualizado_en: serverTimestamp(),
  })
}
