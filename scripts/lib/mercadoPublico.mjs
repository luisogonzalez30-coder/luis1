// Cliente de la API pública de Mercado Público (ChileCompra).
// Docs: https://api.mercadopublico.cl/  — ticket gratuito, cuota 10.000
// peticiones/día por ticket.
//
// El ticket NO se versiona ni se expone al navegador: la API no habilita CORS
// y el ticket iría en el bundle. Todo lo que consulte esta API corre en Node.
//
// Uso:
//   import { crearCliente } from './lib/mercadoPublico.mjs'
//   const mp = crearCliente()
//   const { Listado } = await mp.licitacionesActivas()

import { readFileSync } from 'fs'

// MERCADOPUBLICO_BASE solo se usa para apuntar a un stub local en pruebas; en
// uso normal queda sin definir y vale la API real.
const BASE =
  process.env.MERCADOPUBLICO_BASE ?? 'https://api.mercadopublico.cl/servicios/v1/publico'

// La API real es lenta y castiga las ráfagas: responde 500 (no 429) cuando se
// la consulta muy seguido. Una pausa entre llamadas cuesta menos que perder la
// corrida entera a mitad de camino.
const PAUSA_MS = 1200
const REINTENTOS = 4
const TIMEOUT_MS = 60_000

const dormir = ms => new Promise(r => setTimeout(r, ms))

/** Lee el ticket de --ticket=, de MERCADOPUBLICO_TICKET, o del .env local. */
export const leerTicket = (argv = process.argv) => {
  const bandera = argv.find(a => a.startsWith('--ticket='))
  if (bandera) return bandera.slice('--ticket='.length).trim()

  if (process.env.MERCADOPUBLICO_TICKET) return process.env.MERCADOPUBLICO_TICKET.trim()

  try {
    const env = readFileSync('.env', 'utf-8')
    const linea = env.split('\n').find(l => l.trim().startsWith('MERCADOPUBLICO_TICKET='))
    if (linea) return linea.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '')
  } catch {
    // sin .env: se resuelve más abajo con el error explicativo
  }
  return null
}

/**
 * Estados de una licitación (campo CodigoEstado del listado).
 * Los nombres vienen del propio campo Estado que devuelve la API; este mapa
 * sirve para filtrar sin pedir el detalle de cada una.
 */
export const ESTADOS = {
  5: 'Publicada',
  6: 'Cerrada',
  7: 'Desierta',
  8: 'Adjudicada',
  18: 'Revocada',
  19: 'Suspendida',
}

/**
 * Tipo de licitación → tramo de monto en UTM. El tramo es la señal más barata
 * de "cuánta competencia grande atrae esto": L1/E2 son las compras chicas
 * donde un proveedor pequeño compite de igual a igual.
 */
export const TIPOS = {
  L1: { tramo: 'menor a 100 UTM', chica: true },
  LE: { tramo: '100 a 1.000 UTM', chica: true },
  LP: { tramo: '1.000 a 5.000 UTM', chica: false },
  LQ: { tramo: '2.000 a 5.000 UTM', chica: false },
  LR: { tramo: 'mayor a 5.000 UTM', chica: false },
  LS: { tramo: 'servicios personales especializados', chica: true },
  E2: { tramo: 'obras, menor a 100 UTM', chica: true },
  CO: { tramo: 'obras, 100 a 1.000 UTM', chica: true },
  B2: { tramo: 'obras, 1.000 a 5.000 UTM', chica: false },
  H2: { tramo: 'obras, mayor a 5.000 UTM', chica: false },
  I2: { tramo: 'privada, menor a 100 UTM', chica: true },
  O1: { tramo: 'obras públicas', chica: false },
}

/** Fecha en el formato ddmmaaaa que exige la API. */
export const aFechaApi = fecha =>
  String(fecha.getDate()).padStart(2, '0') +
  String(fecha.getMonth() + 1).padStart(2, '0') +
  fecha.getFullYear()

class ErrorMercadoPublico extends Error {
  constructor(mensaje, { estadoHttp = null, cuerpo = null } = {}) {
    super(mensaje)
    this.name = 'ErrorMercadoPublico'
    this.estadoHttp = estadoHttp
    this.cuerpo = cuerpo
  }
}

export const crearCliente = ({ ticket = leerTicket(), verboso = true } = {}) => {
  if (!ticket) {
    throw new ErrorMercadoPublico(
      'Falta el ticket de la API. Definí MERCADOPUBLICO_TICKET en .env, ' +
        'exportalo en el shell, o pasá --ticket=XXXX.'
    )
  }

  let ultimaLlamada = 0
  let llamadas = 0

  const pedir = async (ruta, params = {}) => {
    const espera = PAUSA_MS - (Date.now() - ultimaLlamada)
    if (espera > 0) await dormir(espera)

    const url = new URL(`${BASE}/${ruta}`)
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
    }
    url.searchParams.set('ticket', ticket)

    // El ticket nunca se imprime: los logs de estas corridas se pegan en
    // tickets y chats.
    const urlVisible = url.toString().replace(ticket, '***')

    let ultimoError = null
    for (let intento = 1; intento <= REINTENTOS; intento++) {
      ultimaLlamada = Date.now()
      llamadas++
      try {
        const resp = await fetch(url, {
          signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: { Accept: 'application/json' },
        })
        const texto = await resp.text()

        if (!resp.ok) {
          // 401/403 son problema del ticket, no de la red: reintentar es
          // quemar cuota para recibir el mismo rechazo.
          if (resp.status === 401 || resp.status === 403) {
            throw new ErrorMercadoPublico(
              `La API rechazó el ticket (HTTP ${resp.status}). Revisá que esté vigente ` +
                'en el formulario de Solicitud de Ticket de mercadopublico.cl.',
              { estadoHttp: resp.status, cuerpo: texto.slice(0, 500) }
            )
          }
          ultimoError = new ErrorMercadoPublico(
            `HTTP ${resp.status} en ${urlVisible}`,
            { estadoHttp: resp.status, cuerpo: texto.slice(0, 500) }
          )
        } else {
          let datos
          try {
            datos = JSON.parse(texto)
          } catch {
            // La API devuelve HTML cuando está caída o en mantención.
            ultimoError = new ErrorMercadoPublico(
              `Respuesta no-JSON de ${urlVisible} (¿API en mantención?)`,
              { estadoHttp: resp.status, cuerpo: texto.slice(0, 300) }
            )
            datos = null
          }
          if (datos) {
            // Errores de negocio vienen con 200 y un campo Mensaje/Codigo.
            if (datos.Mensaje && !datos.Listado) {
              throw new ErrorMercadoPublico(`La API respondió: ${datos.Mensaje}`, {
                cuerpo: texto.slice(0, 500),
              })
            }
            return datos
          }
        }
      } catch (e) {
        if (e instanceof ErrorMercadoPublico && e.estadoHttp === 401) throw e
        if (e instanceof ErrorMercadoPublico && e.estadoHttp === 403) throw e
        if (e instanceof ErrorMercadoPublico && !e.estadoHttp && e.cuerpo) throw e
        ultimoError = e
      }

      if (intento < REINTENTOS) {
        const espera = 2000 * 2 ** (intento - 1)
        if (verboso) {
          console.warn(
            `  reintento ${intento}/${REINTENTOS - 1} en ${espera / 1000}s ` +
              `(${ultimoError?.message ?? 'sin detalle'})`
          )
        }
        await dormir(espera)
      }
    }
    throw ultimoError ?? new ErrorMercadoPublico(`Falló ${urlVisible}`)
  }

  return {
    get llamadas() {
      return llamadas
    },

    /** Listado liviano de todas las licitaciones en estado "Publicada". */
    licitacionesActivas: () => pedir('licitaciones.json', { estado: 'activas' }),

    /** Licitaciones cuyo estado cambió en esa fecha (Date). */
    licitacionesPorFecha: (fecha, estado) =>
      pedir('licitaciones.json', { fecha: aFechaApi(fecha), estado }),

    /** Ficha completa: items, UNSPSC, fechas, adjudicación, comprador. */
    licitacion: codigo => pedir('licitaciones.json', { codigo }),

    /**
     * Órdenes de compra de un día. Acá aparecen los Tratos Directos y las
     * Compras Ágiles ya emitidas: es la fuente para detectar qué organismos
     * compran tu rubro de forma recurrente y sin licitar.
     */
    ordenesPorFecha: (fecha, estado) =>
      pedir('ordenesdecompra.json', { fecha: aFechaApi(fecha), estado }),

    /** Ficha completa de una orden de compra. */
    orden: codigo => pedir('ordenesdecompra.json', { codigo }),
  }
}

export { ErrorMercadoPublico }
