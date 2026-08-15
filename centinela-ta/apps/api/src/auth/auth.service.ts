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
    // RLS todavía — usa la función SECURITY DEFINER de la migración
    // auth_tenant_resolver, que solo expone (email, municipio_id), nunca
    // el hash de contraseña. Es el único punto del sistema donde se
    // consulta `usuario` fuera de un contexto de tenant ya fijado.
    const filas = await prisma.$queryRaw<{ resolver_municipio_por_email: string | null }[]>`
      SELECT resolver_municipio_por_email(${email})
    `;
    const municipioId = filas[0]?.resolver_municipio_por_email;

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
