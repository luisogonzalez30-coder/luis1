// Aplica la identidad visual (colores, título de pestaña) de un condominio
// a la app en tiempo de ejecución, vía variables CSS leídas por tailwind.config.js.
const VAR_PRIMARIO = '--color-primary-rgb'
const VAR_PRIMARIO_OSCURO = '--color-primary-dark-rgb'
const DEFAULT_PRIMARIO = '29 78 216' // #1D4ED8
const DEFAULT_PRIMARIO_OSCURO = '30 58 138' // #1E3A8A
const TITULO_DEFECTO = 'TuCondoAquí'
const COLOR_DEFECTO = '#1D4ED8'

function hexARgbTriple(hex) {
  if (typeof hex !== 'string') return null
  const limpio = hex.replace('#', '').trim()
  if (!/^[0-9a-fA-F]{6}$/.test(limpio)) return null
  const n = parseInt(limpio, 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

export function aplicarTema(condominio) {
  const raiz = document.documentElement
  raiz.style.setProperty(VAR_PRIMARIO, hexARgbTriple(condominio?.color_primario) || DEFAULT_PRIMARIO)
  raiz.style.setProperty(
    VAR_PRIMARIO_OSCURO,
    hexARgbTriple(condominio?.color_primario_oscuro) || DEFAULT_PRIMARIO_OSCURO
 )
  document.title = condominio?.nombre ? `TuCondoAquí — ${condominio.nombre}` : TITULO_DEFECTO

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', condominio?.color_primario || COLOR_DEFECTO)
}

export function restaurarTemaPorDefecto() {
  aplicarTema(null)
}
