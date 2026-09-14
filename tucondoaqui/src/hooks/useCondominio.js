import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db, COLECCIONES } from '../firebase/firebase'
import { aplicarTema, restaurarTemaPorDefecto } from '../utils/tema'

// Carga la configuración (tenant) de un condominio y aplica su tema automáticamente.
// Distingue "no encontrado" (slug inválido) de "error" (falla de red) para no decirle a
// un residente con mala conexión que su condominio no existe.
export function useCondominio(condominioId) {
  const [condominio, setCondominio] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [noEncontrado, setNoEncontrado] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelado = false

    if (!condominioId) {
      setCargando(false)
      setNoEncontrado(true)
      return
    }

    setCargando(true)
    setNoEncontrado(false)
    setError(null)

    getDoc(doc(db, COLECCIONES.CONDOMINIOS, condominioId))
      .then((snap) => {
        if (cancelado) return
        if (!snap.exists()) {
          setNoEncontrado(true)
          setCondominio(null)
          restaurarTemaPorDefecto()
        } else {
          const datos = { id: snap.id, ...snap.data() }
          setCondominio(datos)
          aplicarTema(datos)
        }
      })
      .catch((err) => {
        if (cancelado) return
        console.error('[useCondominio] Error al cargar condominio:', err)
        setError('No se pudo verificar el condominio. Revisa tu conexión e intenta nuevamente.')
      })
      .finally(() => {
        if (!cancelado) setCargando(false)
      })

    return () => {
      cancelado = true
    }
  }, [condominioId])

  return { condominio, cargando, noEncontrado, error }
}
