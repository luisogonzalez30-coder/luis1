import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { withTenantContext } from "@centinela-ta/database";
import { AuditService } from "../audit/audit.service";
import { AuthContext } from "../common/types/auth-context";

@Injectable()
export class RevisionesService {
  constructor(private readonly audit: AuditService) {}

  listar(auth: AuthContext, estado?: string) {
    return withTenantContext(auth.municipioId, (tx) =>
      tx.revision.findMany({
        where: estado ? { estado: estado as never } : undefined,
        include: { seccion: true },
        orderBy: { revisadoEn: "desc" },
      }),
    );
  }

  async resolver(auth: AuthContext, revisionId: string, evidenciaUrl: string, comentario: string | undefined, ip?: string) {
    return withTenantContext(auth.municipioId, async (tx) => {
      const revision = await tx.revision.findUnique({ where: { id: revisionId } });

      // RLS ya impide leer revisiones de otro tenant (vuelve null), pero
      // igual se valida acá para devolver un 404 en vez de dejar que un
      // where fallido en el update pase silencioso.
      if (!revision) {
        throw new NotFoundException("Revisión no encontrada");
      }
      if (revision.municipioId !== auth.municipioId) {
        throw new ForbiddenException();
      }

      const actualizada = await tx.revision.update({
        where: { id: revisionId },
        data: {
          estado: "resuelta_pendiente_verificacion",
          evidenciaUrl,
          detalle: comentario ?? revision.detalle,
          resueltoPorId: auth.usuarioId,
        },
      });

      await this.audit.registrar(tx, {
        municipioId: auth.municipioId,
        usuarioId: auth.usuarioId,
        accion: "revision.resolver",
        entidad: "revision",
        entidadId: revisionId,
        ip,
      });

      return actualizada;
    });
  }
}
