// Firestore encola las escrituras y reintenta indefinidamente cuando no hay conexión
// (comportamiento "offline-first" por diseño): la promesa de addDoc/updateDoc puede
// quedar pendiente para siempre sin avisar al usuario. Esta utilidad agrega un límite
// de espera para poder mostrar un mensaje de error claro en vez de un botón de carga
// infinito, especialmente relevante para residentes reportando desde la calle con mala señal.
export function conTimeout(promesa, ms, mensajeError) {
  let temporizador
  const limite = new Promise((_, reject) => {
    temporizador = setTimeout(() => {
      // Se marca explícitamente (en vez de que el caller compare el texto del
      // mensaje) para poder distinguir "se agotó el tiempo" de un error real
      // como permission-denied, sin depender de un string frágil.
      const error = new Error(mensajeError)
      error.esTimeout = true
      reject(error)
    }, ms)
  })

  return Promise.race([promesa, limite]).finally(() => clearTimeout(temporizador))
}
