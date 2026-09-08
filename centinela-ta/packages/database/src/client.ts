import { PrismaClient } from "./generated";

/**
 * Cliente Prisma "crudo" — solo para el runtime de migraciones/seed y para
 * el pool base que withTenantContext toma prestado. El código de negocio
 * nunca debe importar esto directo: siempre pasa por withTenantContext,
 * que es lo que activa las políticas RLS de la base de datos.
 *
 * Vive en su propio módulo (en vez de en index.ts) para que otros módulos
 * del paquete (como cumplimiento.ts) puedan importarlo sin crear un ciclo
 * con index.ts.
 */
export const prisma = new PrismaClient();
