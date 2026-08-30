/**
 * Cliente de la API pública de ChileCompra (Mercado Público).
 *
 * Todo lo de este archivo sale de haber corrido la API de verdad, no de la
 * documentación. Los tres hechos que lo ordenan:
 *
 *  1. La cuota es de 10.000 peticiones al día por ticket. El listado diario
 *     cuesta 1 petición y trae cientos de licitaciones; la ficha completa
 *     cuesta 1 petición POR licitación. Pedir la ficha de todo lo publicado
 *     en un día quema la cuota antes del mediodía.
 *
 *  2. La API castiga las ráfagas con 429 masivo: 60 rechazos en los primeros
 *     80 pedidos. Con la pausa de 1,2 s más el backoff, cada ficha termina
 *     costando ~7 s reales. No es un problema que se arregle con más
 *     paralelismo; se arregla pidiendo menos.
 *
 *  3. Los errores de negocio vienen con HTTP 200 y un campo `Mensaje`.
 *     Chequear solo `response.status` da falsos verdes.
 *
 * El ticket no se imprime nunca: estos logs se pegan en chats y tickets.
 * Tampoco puede vivir en el frontend — la API no habilita CORS y el ticket
 * viajaría dentro del bundle.
 */

import { dormir } from './fechas.ts';

const BASE = process.env.CHILECOMPRA_BASE
  ?? 'https://api.mercadopublico.cl/servicios/v1/publico';

const PAUSA_MS = 1_200;
const REINTENTOS = 4;
const TIMEOUT_MS = 60_000;
const CUOTA_DIARIA = 10_000;

export class ErrorChileCompra extends Error {
  constructor(
    mensaje: string,
    readonly estadoHttp: number | null = null,
    readonly cuerpo: string | null = null,
  ) {
    super(mensaje);
    this.name = 'ErrorChileCompra';
  }
}

export interface OpcionesCliente {
  ticket?: string;
  /** Tope de peticiones para esta corrida. Protege la cuota del día. */
  presupuesto?: number;
  pausaMs?: number;
  verboso?: boolean;
}

export function crearCliente(opciones: OpcionesCliente = {}) {
  const ticket = opciones.ticket ?? process.env.CHILECOMPRA_TICKET;
  if (!ticket) {
    throw new ErrorChileCompra(
      'Falta CHILECOMPRA_TICKET. Se pide gratis en el formulario "Solicitud de Ticket" ' +
      'de api.mercadopublico.cl y llega por correo.',
    );
  }

  const presupuesto = opciones.presupuesto ?? CUOTA_DIARIA;
  const pausaMs = opciones.pausaMs ?? PAUSA_MS;
  const verboso = opciones.verboso ?? true;

  let ultimaLlamada = 0;
  let llamadas = 0;

  async function pedir<T = any>(ruta: string, params: Record<string, string | undefined>): Promise<T> {
    if (llamadas >= presupuesto) {
      throw new ErrorChileCompra(
        `Presupuesto agotado (${presupuesto} peticiones). La corrida se detiene acá para ` +
        'no quemar la cuota diaria; lo que falta queda pendiente para la próxima.',
      );
    }

    const espera = pausaMs - (Date.now() - ultimaLlamada);
    if (espera > 0) await dormir(espera);

    const url = new URL(`${BASE}/${ruta}`);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, v);
    }
    url.searchParams.set('ticket', ticket);
    const urlVisible = url.toString().replace(ticket, '***');

    let ultimoError: Error | null = null;

    for (let intento = 1; intento <= REINTENTOS; intento++) {
      ultimaLlamada = Date.now();
      llamadas++;

      try {
        const resp = await fetch(url, {
          signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: { Accept: 'application/json' },
        });
        const texto = await resp.text();

        // 401/403 son problema del ticket. Reintentar es gastar cuota para
        // recibir el mismo rechazo cuatro veces.
        if (resp.status === 401 || resp.status === 403) {
          throw new ErrorChileCompra(
            `La API rechazó el ticket (HTTP ${resp.status}). Puede haber vencido.`,
            resp.status, texto.slice(0, 300),
          );
        }

        if (!resp.ok) {
          ultimoError = new ErrorChileCompra(
            `HTTP ${resp.status} en ${urlVisible}`, resp.status, texto.slice(0, 300),
          );
        } else {
          let datos: any;
          try {
            datos = JSON.parse(texto);
          } catch {
            // Cuando está en mantención devuelve HTML con status 200.
            ultimoError = new ErrorChileCompra(
              `Respuesta no-JSON de ${urlVisible} (¿API en mantención?)`, resp.status, texto.slice(0, 200),
            );
            datos = null;
          }

          if (datos) {
            // Error de negocio con HTTP 200. Este es el que hace pasar por
            // buena una corrida que no trajo nada.
            if (datos.Mensaje && !datos.Listado) {
              throw new ErrorChileCompra(`La API respondió: ${datos.Mensaje}`, 200, texto.slice(0, 300));
            }
            return datos as T;
          }
        }
      } catch (e: any) {
        if (e instanceof ErrorChileCompra && (e.estadoHttp === 401 || e.estadoHttp === 403 || e.estadoHttp === 200)) {
          throw e;
        }
        ultimoError = e;
      }

      if (intento < REINTENTOS) {
        const backoff = 2_000 * 2 ** (intento - 1);
        if (verboso) {
          console.warn(`  reintento ${intento}/${REINTENTOS - 1} en ${backoff / 1000}s — ${ultimoError?.message ?? 'sin detalle'}`);
        }
        await dormir(backoff);
      }
    }

    throw ultimoError ?? new ErrorChileCompra(`Falló ${urlVisible}`);
  }

  return {
    get llamadas() { return llamadas; },
    get presupuestoRestante() { return presupuesto - llamadas; },

    /**
     * Listado del día. 1 petición, cientos de resultados, campos mínimos:
     * CodigoExterno, Nombre, CodigoEstado, FechaCierre. No trae organismo,
     * ni monto, ni ítems — para eso está `licitacion()`.
     */
    licitacionesPorFecha: (fecha: string, estado?: string) =>
      pedir('licitaciones.json', { fecha, estado }),

    /** Todo lo que está en estado "Publicada" ahora mismo. 1 petición. */
    licitacionesActivas: () => pedir('licitaciones.json', { estado: 'activas' }),

    /** Ficha completa de UNA licitación. 1 petición cada una. */
    licitacion: (codigo: string) => pedir('licitaciones.json', { codigo }),

    /**
     * Órdenes de compra de un día. Es donde aparecen los Trato Directo y las
     * Compras Ágiles YA EMITIDAS. Sirve para inteligencia comercial, no para
     * postular: cuando la orden existe, la oportunidad ya se cerró.
     */
    ordenesPorFecha: (fecha: string, estado?: string) =>
      pedir('ordenesdecompra.json', { fecha, estado }),
  };
}

/** Estados del campo CodigoEstado del listado. */
export const ESTADOS: Record<number, string> = {
  5: 'Publicada', 6: 'Cerrada', 7: 'Desierta',
  8: 'Adjudicada', 18: 'Revocada', 19: 'Suspendida',
};

/**
 * Tipo de licitación → tramo de monto. El tramo es la señal más barata de
 * cuánta competencia grande atrae un llamado: L1/E2 son las compras chicas
 * donde una pyme compite de igual a igual.
 */
export const TIPOS: Record<string, { tramo: string; chica: boolean }> = {
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
};
