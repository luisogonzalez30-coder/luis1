import { Injectable, NestMiddleware, UnauthorizedException } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { JwtService } from "@nestjs/jwt";
import { Rol } from "@centinela-ta/database";

interface JwtPayload {
  sub: string;
  municipioId: string;
  rol: Rol;
  email: string;
}

/**
 * Valida el JWT y deja el contexto de autenticación en `req.auth`. Este es
 * el único lugar donde `municipioId` puede originarse para el resto de la
 * request — nunca desde el body, la query string o un parámetro de ruta,
 * porque eso permitiría a un usuario pedir datos de otro municipio con solo
 * cambiar un ID en la URL.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly jwt: JwtService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Falta el encabezado Authorization: Bearer <token>");
    }

    const token = header.slice("Bearer ".length);

    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException("Token inválido o expirado");
    }

    req.auth = {
      usuarioId: payload.sub,
      municipioId: payload.municipioId,
      rol: payload.rol,
      email: payload.email,
    };
    next();
  }
}
