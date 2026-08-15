import { Injectable } from "@nestjs/common";
import { calcularPorcentajeCumplimiento, withTenantContext } from "@centinela-ta/database";
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

@Injectable()
export class CumplimientoService {
  async resumen(auth: AuthContext): Promise<ResumenCumplimiento> {
    return withTenantContext(auth.municipioId, async (tx) => {
      const porcentaje = await calcularPorcentajeCumplimiento(tx);

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
        ...porcentaje,
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
