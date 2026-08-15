import { Injectable } from "@nestjs/common";
import { prisma, withTenantContext } from "@centinela-ta/database";
import { AuthContext } from "../common/types/auth-context";
import { diasHabilesRestantes, UMBRAL_POR_VENCER_DIAS_HABILES } from "../solicitudes/dias-habiles.util";

export interface ResumenCumplimiento {
  periodo: string;
  porcentajeCumplimiento: number;
  seccionesObligatorias: number;
  seccionesEvaluadas: number;
  seccionesConInfraccion: number;
  enlacesCaidos: number;
  solicitudesPorVencer: number;
  solicitudesVencidas: number;
  tendencia: { periodo: string; porcentaje: number }[];
}

const ESTADOS_CUMPLE = new Set(["cumple", "resuelta_pendiente_verificacion"]);

@Injectable()
export class CumplimientoService {
  async resumen(auth: AuthContext): Promise<ResumenCumplimiento> {
    // El catálogo de secciones es compartido entre tenants (no tiene RLS),
    // así que se lee del cliente base, fuera de withTenantContext.
    const totalSeccionesObligatorias = await prisma.seccionTransparencia.count({ where: { obligatoria: true } });

    return withTenantContext(auth.municipioId, async (tx) => {
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

      const porcentajeCumplimiento = totalSeccionesObligatorias === 0
        ? 0
        : Math.round((seccionesQueCumplen / totalSeccionesObligatorias) * 1000) / 10;

      const enlacesCaidos = await tx.enlace.count({ where: { caidoDesde: { not: null } } });

      const solicitudesAbiertas = await tx.solicitudAcceso.findMany({
        where: { estado: { not: "respondida" } },
        select: { fechaLimite: true },
      });
      const hoy = new Date();
      let solicitudesPorVencer = 0;
      let solicitudesVencidas = 0;
      for (const s of solicitudesAbiertas) {
        const restantes = diasHabilesRestantes(hoy, s.fechaLimite);
        if (restantes < 0) solicitudesVencidas += 1;
        else if (restantes <= UMBRAL_POR_VENCER_DIAS_HABILES) solicitudesPorVencer += 1;
      }

      const informesPrevios = await tx.informeCumplimiento.findMany({
        orderBy: { periodo: "desc" },
        take: 6,
      });

      return {
        periodo: periodoActual(),
        porcentajeCumplimiento,
        seccionesObligatorias: totalSeccionesObligatorias,
        seccionesEvaluadas,
        seccionesConInfraccion,
        enlacesCaidos,
        solicitudesPorVencer,
        solicitudesVencidas,
        tendencia: informesPrevios
          .reverse()
          .map((i) => ({ periodo: i.periodo.toISOString().slice(0, 7), porcentaje: Number(i.porcentajeCumplimiento) })),
      };
    });
  }
}

function periodoActual(): string {
  const ahora = new Date();
  return `${ahora.getUTCFullYear()}-${String(ahora.getUTCMonth() + 1).padStart(2, "0")}`;
}
