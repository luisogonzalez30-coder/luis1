import { SetMetadata } from "@nestjs/common";
import { Rol } from "@centinela-ta/database";

export const ROLES_KEY = "roles";

/** Restringe un endpoint a los roles indicados. Sin este decorador, el
 * endpoint solo exige estar autenticado (ver TenantContextMiddleware) pero
 * no restringe por rol. */
export const RequireRoles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
