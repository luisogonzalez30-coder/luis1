// Validación de RUT chileno (módulo 11). El campo es opcional en el formulario
// ciudadano, pero si el vecino escribe algo, se valida el dígito verificador
// para evitar datos basura que después no sirvan para avisarle nada.
export function limpiarRut(rut) {
  return rut.replace(/[^0-9kK]/g, '').toUpperCase()
}

export function esRutValido(rut) {
  const limpio = limpiarRut(rut)
  if (limpio.length < 2) return false

  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)
  if (!/^\d+$/.test(cuerpo)) return false

  let suma = 0
  let multiplo = 2
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplo
    multiplo = multiplo === 7 ? 2 : multiplo + 1
  }

  const resto = 11 - (suma % 11)
  const dvEsperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto)
  return dv === dvEsperado
}

export function formatearRut(rut) {
  const limpio = limpiarRut(rut)
  if (limpio.length < 2) return limpio

  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)
  const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${cuerpoFormateado}-${dv}`
}
