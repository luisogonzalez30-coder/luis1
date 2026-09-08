import { calcularPorcentajeCumplimiento, withTenantContext } from "@centinela-ta/database";

/**
 * Snapshot mensual de cumplimiento — es lo que alimenta la "tendencia" del
 * dashboard (sin esto, `informe_cumplimiento` queda vacío para siempre y el
 * gráfico de tendencia nunca tiene datos, aunque el endpoint ya lo devuelva).
 * Usa el mismo cálculo que el resumen en vivo de la API
 * (`calcularPorcentajeCumplimiento`, en el paquete compartido) para que el
 * número de hoy y el snapshot del mes coincidan si se generan el mismo día.
 */
export async function generarInformeDeMunicipio(municipioId: string): Promise<void> {
  const periodo = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));

  await withTenantContext(municipioId, async (tx) => {
    const { porcentajeCumplimiento } = await calcularPorcentajeCumplimiento(tx);

    await tx.informeCumplimiento.upsert({
      where: { municipioId_periodo: { municipioId, periodo } },
      update: { porcentajeCumplimiento, generadoEn: new Date() },
      create: { municipioId, periodo, porcentajeCumplimiento },
    });
  });

  console.log(`[generar-informe] snapshot del periodo ${periodo.toISOString().slice(0, 7)} guardado (${municipioId})`);
}
