import { request } from "undici";
import * as cheerio from "cheerio";
import { withTenantContext } from "@centinela-ta/database";

const TIMEOUT_MS = 10_000;

/**
 * Detección automática de infracciones (Must #1 del MVP). El riesgo técnico
 * documentado en la arquitectura es real: no existe una API estándar de los
 * portales de transparencia municipales chilenos, así que este chequeo
 * depende de un selector CSS configurado por enlace (`enlace.selectorFecha`)
 * que apunta al elemento donde ese municipio publica la fecha de última
 * actualización de la sección. Sin ese selector configurado, el enlace se
 * salta — no se inventa un resultado.
 *
 * Cada corrida crea una fila nueva en `revision` (no actualiza la anterior),
 * para conservar el historial de cumplimiento tal como lo necesita el
 * informe del Auditor de Control Interno.
 */
export async function verificarSeccionesDeMunicipio(municipioId: string): Promise<void> {
  const enlaces = await withTenantContext(municipioId, (tx) =>
    tx.enlace.findMany({ where: { selectorFecha: { not: null } }, include: { seccion: true } }),
  );

  for (const enlace of enlaces) {
    const resultado = await evaluarSeccion(enlace.url, enlace.selectorFecha!, enlace.seccion.periodicidadDias);

    await withTenantContext(municipioId, (tx) =>
      tx.revision.create({
        data: {
          municipioId,
          seccionId: enlace.seccionId,
          estado: resultado.estado,
          detalle: resultado.detalle,
        },
      }),
    );

    console.log(
      `[verificar-secciones] ${enlace.seccion.nombre} (${municipioId}) -> ${resultado.estado}: ${resultado.detalle}`,
    );
  }
}

type EstadoDeteccion = "cumple" | "no_cumple" | "desactualizada";

async function evaluarSeccion(
  url: string,
  selectorFecha: string,
  periodicidadDias: number,
): Promise<{ estado: EstadoDeteccion; detalle: string }> {
  let html: string;
  try {
    const res = await request(url, { method: "GET", headersTimeout: TIMEOUT_MS, bodyTimeout: TIMEOUT_MS });
    if (res.statusCode >= 400) {
      return { estado: "no_cumple", detalle: `El portal respondió ${res.statusCode} al intentar leer la sección` };
    }
    html = await res.body.text();
  } catch (err) {
    return { estado: "no_cumple", detalle: `No se pudo acceder al portal: ${(err as Error).message}` };
  }

  const $ = cheerio.load(html);
  const texto = $(selectorFecha).first().text().trim();

  if (!texto) {
    return {
      estado: "no_cumple",
      detalle: `No se encontró el indicador de fecha de actualización (selector "${selectorFecha}") en la página`,
    };
  }

  const fecha = parsearFechaChilena(texto);
  if (!fecha) {
    return { estado: "no_cumple", detalle: `No se pudo interpretar la fecha publicada: "${texto}"` };
  }

  const diasDesdeActualizacion = Math.floor((Date.now() - fecha.getTime()) / 86_400_000);
  if (diasDesdeActualizacion > periodicidadDias) {
    return {
      estado: "desactualizada",
      detalle: `Última actualización hace ${diasDesdeActualizacion} días (tope ${periodicidadDias})`,
    };
  }

  return { estado: "cumple", detalle: `Actualizada hace ${diasDesdeActualizacion} días (tope ${periodicidadDias})` };
}

/** Acepta dd/mm/yyyy y dd-mm-yyyy, los dos formatos más comunes en portales
 * municipales chilenos. Fechas en otros formatos quedan como "no se pudo
 * interpretar" en vez de arriesgar una lectura equivocada. */
function parsearFechaChilena(texto: string): Date | null {
  const match = texto.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (!match) return null;
  const [, dia, mes, anio] = match;
  const fecha = new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(dia)));
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}
