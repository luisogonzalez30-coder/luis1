// Número de ticket que el residente anota o dicta por teléfono.
//
// Formato: 6 dígitos ("482173"), mostrado agrupado como "482 173".
// Antes era "INC-YYYYMMDD-XXXX" (17 caracteres, con letras y números): se
// acortó a propósito porque es un dato que el residente tiene que leer, anotar a
// mano y muchas veces dictar por teléfono a el condominio — mezclar letras
// con números y agregar la fecha lo hacía largo y propenso a errores.
//
// Un millón de combinaciones alcanza de sobra: no se exige que sea imposible
// de repetir, sino que las repeticiones sean raras. Cuando ocurre una, el
// propio Firestore rechaza la escritura (el número es el ID del documento en
// tickets_publicos) y crearSolicitud genera otro y reintentaconst DIGITOS = 6

export function generarNumeroTicket() {
  const maximo = 10 ** DIGITOS
  return String(Math.floor(Math.random() * maximo)).padStart(DIGITOS, '0')
}

// Solo para mostrar en pantalla: "482173" → "482 173". Los tickets antiguos
// (formato "INC-20260802-8BD7") se devuelven tal cual, para que los residentes
// que ya tienen uno anotado lo sigan reconociendo.
export function formatearNumeroTicket(numeroTicket) {
  if (!numeroTicket) return ''
  if (!/^\d{6}$/.test(numeroTicket)) return numeroTicket
  return `${numeroTicket.slice(0, 3)} ${numeroTicket.slice(3)}`
}

// Normaliza lo que el residente escribe al consultar: le saca espacios, puntos y
// guiones ("482 173", "482-173" → "482173") y pasa a mayúsculas para que los
// tickets antiguos ("inc-...") también calcen con su ID real.
export function normalizarNumeroTicket(entrada) {
  const limpio = (entrada || '').trim().replace(/[\s.\-]/g, '')
  return /^\d+$/.test(limpio) ? limpio : (entrada || '').trim().toUpperCase()
}
