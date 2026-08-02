// Validación de número de WhatsApp chileno. Reemplaza al RUT como dato de
// contacto del ciudadano (ver §29 en ESTADO_PROYECTO.md): el RUT se dejó de
// pedir a propósito para no manejar datos personales sensibles innecesarios.
//
// Se acepta lo que la gente realmente escribe: "912345678", "9 1234 5678",
// "+56 9 1234 5678", "56912345678". Un celular chileno son 9 dígitos que
// empiezan con 9, con o sin el código de país 56 adelante.

export function limpiarTelefono(valor) {
  return (valor || '').replace(/\D/g, '')
}

export function esWhatsappValido(valor) {
  const digitos = limpiarTelefono(valor)
  if (digitos.length === 9) return digitos.startsWith('9')
  if (digitos.length === 11) return digitos.startsWith('569')
  return false
}

// Guarda siempre en el mismo formato internacional ("+56912345678"), sin
// importar cómo lo haya escrito el vecino — así el bot de WhatsApp puede
// usarlo directo y buscar por él sin normalizar de nuevo.
export function normalizarWhatsapp(valor) {
  const digitos = limpiarTelefono(valor)
  if (digitos.length === 9) return `+56${digitos}`
  if (digitos.length === 11) return `+${digitos}`
  return valor
}

// Solo para mostrar: "+56912345678" → "+56 9 1234 5678".
export function formatearWhatsapp(valor) {
  const digitos = limpiarTelefono(valor)
  if (digitos.length !== 11) return valor
  return `+${digitos.slice(0, 2)} ${digitos.slice(2, 3)} ${digitos.slice(3, 7)} ${digitos.slice(7)}`
}
