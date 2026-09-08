import { PrismaClient } from "./generated";
import { prisma } from "./client";

export * from "./generated";
export { prisma } from "./client";
export * from "./cumplimiento";

/**
 * Ejecuta `fn` dentro de una transacción con `app.tenant_id` fijado vía
 * SET LOCAL. Las políticas RLS de packages/database/prisma/migrations/
 * 0002_rls comparan cada fila contra este valor — si el código de la
 * aplicación se equivoca de tenant, la base de datos igual bloquea la fila,
 * no solo el filtro del ORM.
 *
 * `municipioId` nunca puede venir del body/query de la request: siempre
 * del JWT ya validado (ver apps/api/src/common/middleware).
 */
export async function withTenantContext<T>(
  municipioId: string,
  fn: (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => Promise<T>,
): Promise<T> {
  if (!isUuid(municipioId)) {
    throw new Error(`municipioId inválido para contexto de tenant: ${municipioId}`);
  }

  return prisma.$transaction(async (tx) => {
    // set_config con el tercer argumento en true = SET LOCAL (solo dura la transacción).
    await tx.$executeRawUnsafe(`SELECT set_config('app.tenant_id', $1, true)`, municipioId);
    return fn(tx);
  });
}

/**
 * Vía de soporte para el SuperAdmin de LOG-In: sin RLS, pero cada llamada
 * queda forzada a loguear en audit_log desde el llamador (ver
 * apps/api/src/common/guards). Nunca se expone a través del mismo pool que
 * usan los tenants.
 */
export async function withSupportContext<T>(
  fn: (client: PrismaClient) => Promise<T>,
): Promise<T> {
  return fn(prisma);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
