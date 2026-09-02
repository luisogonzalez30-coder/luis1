// Aplica la identidad visual (colores, título de pestaña) de una municipalidad
// a la app en tiempo de ejecución, vía variables CSS leídas por tailwind.config.js.
const VAR_PRIMARIO = '--color-primary-rgb'
const VAR_PRIMARIO_OSCURO = '--color-primary-dark-rgb'
// Azul eléctrico institucional. Es el color de la app cuando la municipalidad
// no definió el suyo — no un color fijo de la interfaz: cada comuna sobrescribe
// esto con `color_primario` en su documento de Firestore (multi-tenant), y esa
// es la razón por la que el rediseño no fija #2563EB en las clases de Tailwind.
// El par claro/oscuro se mantiene a un paso de distancia (blue-600 → blue-700)
// para que el degradado del botón y su estado hover se lean como profundidad y
// no como dos colores distintos.
const DEFAULT_PRIMARIO = '37 99 235' // #2563EB (blue-600)
const DEFAULT_PRIMARIO_OSCURO = '29 78 216' // #1D4ED8 (blue-700)
const TITULO_DEFECTO = 'TuMuniAquí'
const COLOR_DEFECTO = '#2563EB'

function hexARgbTriple(hex) {
  if (typeof hex !== 'string') return null
  const limpio = hex.replace('#', '').trim()
  if (!/^[0-9a-fA-F]{6}$/.test(limpio)) return null
  const n = parseInt(limpio, 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

export function aplicarTema(municipio) {
  const raiz = document.documentElement
  raiz.style.setProperty(VAR_PRIMARIO, hexARgbTriple(municipio?.color_primario) || DEFAULT_PRIMARIO)
  raiz.style.setProperty(
    VAR_PRIMARIO_OSCURO,
    hexARgbTriple(municipio?.color_primario_oscuro) || DEFAULT_PRIMARIO_OSCURO
  )
  document.title = municipio?.nombre ? `TuMuniAquí — ${municipio.nombre}` : TITULO_DEFECTO

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', municipio?.color_primario || COLOR_DEFECTO)
}

export function restaurarTemaPorDefecto() {
  aplicarTema(null)
}
