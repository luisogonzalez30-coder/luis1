import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Rol } from "@centinela-ta/database";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Rol[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const req = context.switchToHttp().getRequest();
    if (!req.auth) {
      throw new UnauthorizedException("No autenticado");
    }

    if (!required || required.length === 0) return true;

    if (!required.includes(req.auth.rol)) {
      throw new ForbiddenException(`El rol "${req.auth.rol}" no tiene acceso a esta acción`);
    }
    return true;
  }
}
