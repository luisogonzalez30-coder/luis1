import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db, COLECCIONES } from '../firebase/firebase'
import { aplicarTema, restaurarTemaPorDefecto } from '../utils/tema'

// Carga la configuración (tenant) de una municipalidad y aplica su tema automáticamente.
// Distingue "no encontrado" (slug inválido) de "error" (falla de red) para no decirle a
// un ciudadano con mala conexión que su municipalidad no existe.
export function useMunicipio(municipioId) {
  const [municipio, setMunicipio] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [noEncontrado, setNoEncontrado] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelado = false

    if (!municipioId) {
      setCargando(false)
      setNoEncontrado(true)
      return
    }

    setCargando(true)
    setNoEncontrado(false)
    setError(null)

    getDoc(doc(db, COLECCIONES.MUNICIPALIDADES, municipioId))
      .then((snap) => {
        if (cancelado) return
        if (!snap.exists()) {
          setNoEncontrado(true)
          setMunicipio(null)
          restaurarTemaPorDefecto()
        } else {
          const datos = { id: snap.id, ...snap.data() }
          setMunicipio(datos)
          aplicarTema(datos)
        }
      })
      .catch((err) => {
        if (cancelado) return
        console.error('[useMunicipio] Error al cargar municipio:', err)
        setError('No se pudo verificar la municipalidad. Revisa tu conexión e intenta nuevamente.')
      })
      .finally(() => {
        if (!cancelado) setCargando(false)
      })

    return () => {
      cancelado = true
    }
  }, [municipioId])

  return { municipio, cargando, noEncontrado, error }
}
