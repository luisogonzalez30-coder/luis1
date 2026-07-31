// Aplica la identidad visual (colores, título de pestaña) de una municipalidad
// a la app en tiempo de ejecución, vía variables CSS leídas por tailwind.config.js.
const VAR_PRIMARIO = '--color-primary-rgb'
const VAR_PRIMARIO_OSCURO = '--color-primary-dark-rgb'
const DEFAULT_PRIMARIO = '29 78 216' // #1D4ED8
const DEFAULT_PRIMARIO_OSCURO = '30 58 138' // #1E3A8A
const TITULO_DEFECTO = 'TuMuniAquí'
const COLOR_DEFECTO = '#1D4ED8'

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
