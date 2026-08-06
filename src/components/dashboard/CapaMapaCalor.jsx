import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'

// Peso de cada reporte en la densidad. Un socavón no puede pesar lo mismo que
// un grafiti: sin esto, veinte reportes menores en el centro tapan tres
// emergencias reales en un sector rural, que es justo la lectura que el mapa
// de calor debería evitar.
const PESO_POR_GRAVEDAD = { Alta: 1, Media: 0.55, Baja: 0.3 }

// Los reportes ya resueltos siguen contando —el mapa de calor responde "dónde
// se rompen las cosas", no "qué falta hacer"—, pero pesan menos: el problema
// ya se atendió una vez.
const FACTOR_RESUELTO = 0.4

// Degradado semántico (amarillo → naranjo → rojo). Es la excepción declarada a
// la regla de "sequential = una sola tonalidad": un mapa de calor de problemas
// se lee culturalmente así, y va SIEMPRE acompañado de la leyenda de escala
// (ver LeyendaMapaCalor abajo), nunca de color suelto.
const DEGRADADO = {
  0.2: '#fab219',
  0.5: '#ec835a',
  0.8: '#d03b3b',
  1.0: '#a32e2e',
}

// Capa de densidad sobre el mapa del Alcalde. Responde la pregunta territorial
// que el mapa de pines no responde: en qué parte de la comuna se concentran los
// problemas. Con 90 pines sueltos el ojo no distingue un racimo de una fila.
//
// Se monta y desmonta con el toggle: leaflet.heat dibuja sobre un canvas propio
// y dejarlo montado invisible igual consume en cada paneo.
export default function CapaMapaCalor({ incidencias }) {
  const mapa = useMap()

  useEffect(() => {
    const puntos = incidencias
      .filter((inc) => typeof inc.coordenadas?.lat === 'number' && typeof inc.coordenadas?.lng === 'number')
      .map((inc) => {
        const base = PESO_POR_GRAVEDAD[inc.nivel_gravedad] ?? 0.55
        const peso = inc.estado === 'Resuelto' ? base * FACTOR_RESUELTO : base
        return [inc.coordenadas.lat, inc.coordenadas.lng, peso]
      })

    if (puntos.length === 0) return

    const capa = L.heatLayer(puntos, {
      radius: 28,
      blur: 20,
      // maxZoom es el nivel a partir del cual un punto deja de "expandirse".
      // Sin esto, al acercarse mucho la mancha se disuelve y parece que no hay
      // nada donde sí hay reportes.
      maxZoom: 16,
      minOpacity: 0.25,
      gradient: DEGRADADO,
    })

    capa.addTo(mapa)
    return () => {
      mapa.removeLayer(capa)
    }
  }, [mapa, incidencias])

  return null
}

// Escala del degradado. Obligatoria: sin ella el color del mapa de calor no
// significa nada verificable, y un degradado multitono sin leyenda es
// exactamente el patrón que hay que evitar.
export function LeyendaMapaCalor({ total }) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-[400] rounded-xl bg-white/90 px-3 py-2 shadow-tarjeta ring-1 ring-borde backdrop-blur-sm">
      <p className="text-[11px] font-medium text-tinta-fuerte">Concentración de reportes</p>
      <div
        className="mt-1.5 h-1.5 w-36 rounded-full"
        style={{ background: 'linear-gradient(to right, #fab219, #ec835a, #d03b3b, #a32e2e)' }}
      />
      <div className="mt-1 flex justify-between text-[10px] text-tinta-suave">
        <span>Aislado</span>
        <span>Concentrado</span>
      </div>
      <p className="mt-1 text-[10px] leading-snug text-tinta-tenue">
        {total} reportes · las de gravedad Alta pesan más
      </p>
    </div>
  )
}
