import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { hash } from "argon2";
import { Rol, withTenantContext } from "@centinela-ta/database";
import { AuditService } from "../audit/audit.service";
import { AuthContext } from "../common/types/auth-context";

@Injectable()
export class UsuariosService {
  constructor(private readonly audit: AuditService) {}

  listar(auth: AuthContext) {
    return withTenantContext(auth.municipioId, (tx) =>
      tx.usuario.findMany({
        select: {
          id: true,
          nombre: true,
          email: true,
          rol: true,
          activo: true,
          ultimoLogin: true,
          creadoEn: true,
        },
        orderBy: { creadoEn: "asc" },
      }),
    );
  }

  async crear(auth: AuthContext, email: string, nombre: string, rol: Rol, password: string, ip?: string) {
    return withTenantContext(auth.municipioId, async (tx) => {
      const existente = await tx.usuario.findUnique({ where: { email } });
      if (existente) {
        throw new BadRequestException("Ya existe un usuario con ese correo");
      }

      const creado = await tx.usuario.create({
        data: {
          municipioId: auth.municipioId,
          email,
          nombre,
          rol,
          hashPassword: await hash(password),
        },
        select: { id: true, nombre: true, email: true, rol: true, activo: true },
      });

      await this.audit.registrar(tx, {
        municipioId: auth.municipioId,
        usuarioId: auth.usuarioId,
        accion: "usuario.crear",
        entidad: "usuario",
        entidadId: creado.id,
        ip,
      });

      return creado;
    });
  }

  async cambiarActivo(auth: AuthContext, usuarioId: string, activo: boolean, ip?: string) {
    if (usuarioId === auth.usuarioId && !activo) {
      throw new BadRequestException("No puedes desactivar tu propia cuenta");
    }

    return withTenantContext(auth.municipioId, async (tx) => {
      const usuario = await tx.usuario.findUnique({ where: { id: usuarioId } });
      if (!usuario) throw new NotFoundException("Usuario no encontrado");
      if (usuario.municipioId !== auth.municipioId) throw new ForbiddenException();

      const actualizado = await tx.usuario.update({
        where: { id: usuarioId },
        data: { activo },
        select: { id: true, nombre: true, email: true, rol: true, activo: true },
      });

      await this.audit.registrar(tx, {
        municipioId: auth.municipioId,
        usuarioId: auth.usuarioId,
        accion: activo ? "usuario.reactivar" : "usuario.desactivar",
        entidad: "usuario",
        entidadId: usuarioId,
        ip,
      });

      return actualizado;
    });
  }
}
