import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { verify } from "argon2";
import { prisma, withTenantContext } from "@centinela-ta/database";

export interface LoginResult {
  accessToken: string;
  usuario: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
    municipioId: string;
  };
}

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  async login(email: string, password: string): Promise<LoginResult> {
    // Paso 1: resolver a qué municipio pertenece este email SIN pasar por
    // RLS todavía — lee de `usuario_tenant_lookup` (migración
    // auth_tenant_resolver), una tabla espejo sin RLS que un trigger
    // mantiene sincronizada con `usuario` y que solo expone (email,
    // municipio_id), nunca el hash de contraseña. Es el único punto del
    // sistema donde se resuelve el tenant de un usuario antes de tener el
    // contexto de tenant fijado.
    const filas = await prisma.$queryRaw<{ municipio_id: string }[]>`
      SELECT municipio_id FROM usuario_tenant_lookup WHERE email = ${email}
    `;
    const municipioId = filas[0]?.municipio_id;

    if (!municipioId) {
      // Mismo mensaje que una contraseña incorrecta: no revelar si el email existe.
      throw new UnauthorizedException("Credenciales inválidas");
    }

    // Paso 2: con el tenant ya resuelto, releer el usuario completo dentro
    // del contexto RLS normal — este sí puede tocar hash_password.
    const usuario = await withTenantContext(municipioId, (tx) => tx.usuario.findUnique({ where: { email } }));

    if (!usuario) {
      throw new UnauthorizedException("Credenciales inválidas");
    }

    const passwordValida = await verify(usuario.hashPassword, password);
    if (!passwordValida) {
      throw new UnauthorizedException("Credenciales inválidas");
    }

    // Se valida DESPUÉS de la contraseña, no antes: si fuera antes, alguien
    // sin la contraseña podría usar el mensaje de error para averiguar qué
    // cuentas están desactivadas.
    if (!usuario.activo) {
      throw new UnauthorizedException("Esta cuenta fue desactivada. Contacta a tu Administrador Municipal.");
    }

    await withTenantContext(municipioId, (tx) =>
      tx.usuario.update({ where: { id: usuario.id }, data: { ultimoLogin: new Date() } }),
    );

    const accessToken = this.jwt.sign({
      sub: usuario.id,
      municipioId: usuario.municipioId,
      rol: usuario.rol,
      email: usuario.email,
    });

    return {
      accessToken,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        municipioId: usuario.municipioId,
      },
    };
  }
}
