import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@centinela-ta/database";

export interface RegistrarAuditoriaInput {
  municipioId: string;
  usuarioId?: string;
  accion: string;
  entidad: string;
  entidadId?: string;
  ip?: string;
}

/**
 * Registro de auditoría. Se llama siempre dentro del mismo `tx` con el que
 * se hizo el cambio (mismo withTenantContext), para que quede en la misma
 * transacción: si el cambio de negocio falla, el log tampoco queda huérfano.
 */
@Injectable()
export class AuditService {
  async registrar(
    tx: Pick<PrismaClient, "auditLog">,
    input: RegistrarAuditoriaInput,
  ): Promise<void> {
    await tx.auditLog.create({
      data: {
        municipioId: input.municipioId,
        usuarioId: input.usuarioId,
        accion: input.accion,
        entidad: input.entidad,
        entidadId: input.entidadId,
        ip: input.ip,
      },
    });
  }
}
