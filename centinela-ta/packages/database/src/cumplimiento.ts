import { PrismaClient } from "./generated";
import { prisma } from "./client";

export interface PorcentajeCumplimiento {
  porcentajeCumplimiento: number;
  seccionesObligatorias: number;
  seccionesEvaluadas: number;
  seccionesConInfraccion: number;
}

const ESTADOS_CUMPLE = new Set(["cumple", "resuelta_pendiente_verificacion"]);

/**
 * Único lugar donde se calcula el % de cumplimiento — lo usan tanto el
 * endpoint de resumen (API) como el job mensual que genera el snapshot
 * histórico (worker). Vivir en el paquete compartido evita que las dos
 * implementaciones se desalineen con el tiempo.
 *
 * `tx` debe venir ya de un `withTenantContext` (o del propio job dentro de
 * uno) — esta función no fija el tenant, asume que quien la llama ya lo hizo.
 */
export async function calcularPorcentajeCumplimiento(
  tx: Pick<PrismaClient, "revision">,
): Promise<PorcentajeCumplimiento> {
  const totalSeccionesObligatorias = await prisma.seccionTransparencia.count({ where: { obligatoria: true } });

  const revisiones = await tx.revision.findMany({
    orderBy: { revisadoEn: "desc" },
    select: { seccionId: true, estado: true },
  });

  const ultimaPorSeccion = new Map<string, string>();
  for (const r of revisiones) {
    if (!ultimaPorSeccion.has(r.seccionId)) ultimaPorSeccion.set(r.seccionId, r.estado);
  }

  const seccionesEvaluadas = ultimaPorSeccion.size;
  let seccionesConInfraccion = 0;
  let seccionesQueCumplen = 0;
  for (const estado of ultimaPorSeccion.values()) {
    if (ESTADOS_CUMPLE.has(estado)) seccionesQueCumplen += 1;
    else seccionesConInfraccion += 1;
  }

  const porcentajeCumplimiento =
    totalSeccionesObligatorias === 0 ? 0 : Math.round((seccionesQueCumplen / totalSeccionesObligatorias) * 1000) / 10;

  return { porcentajeCumplimiento, seccionesObligatorias: totalSeccionesObligatorias, seccionesEvaluadas, seccionesConInfraccion };
}
