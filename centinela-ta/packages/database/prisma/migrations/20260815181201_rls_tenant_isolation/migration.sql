-- Aislamiento multi-tenant a nivel de motor de base de datos (modelo "pool").
--
-- withTenantContext() en packages/database/src/index.ts fija
-- app.tenant_id vía SET LOCAL antes de cada operación de negocio. Estas
-- políticas comparan cada fila contra ese valor: si el código de la API
-- tuviera un bug de autorización, Postgres igual bloquea el acceso — el
-- aislamiento no depende de que cada query del ORM filtre correctamente.
--
-- `municipio` no lleva RLS: es la tabla raíz que ancla el tenant, y el
-- login (que todavía no tiene tenant_id fijado) necesita poder resolver
-- el municipio de un usuario por email antes de autenticar.

-- Los IDs son String/@default(uuid()) en Prisma, que mapea a `text` en
-- Postgres (no al tipo nativo `uuid`) — por eso esta función devuelve
-- text: comparar uuid = text falla sin un cast explícito en cada policy.
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS text AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '');
$$ LANGUAGE sql STABLE;

ALTER TABLE "usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "revision" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "enlace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "solicitud_acceso" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "informe_cumplimiento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;

-- FORCE: incluso el dueño de la tabla (el rol de conexión de la app) queda
-- sujeto a la política. Sin esto, RLS se puede saltar por accidente si la
-- app se conecta con el mismo rol que creó las tablas.
ALTER TABLE "usuario" FORCE ROW LEVEL SECURITY;
ALTER TABLE "revision" FORCE ROW LEVEL SECURITY;
ALTER TABLE "enlace" FORCE ROW LEVEL SECURITY;
ALTER TABLE "solicitud_acceso" FORCE ROW LEVEL SECURITY;
ALTER TABLE "informe_cumplimiento" FORCE ROW LEVEL SECURITY;
ALTER TABLE "audit_log" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "usuario"
  USING (municipio_id = current_tenant_id());

CREATE POLICY tenant_isolation ON "revision"
  USING (municipio_id = current_tenant_id());

CREATE POLICY tenant_isolation ON "enlace"
  USING (municipio_id = current_tenant_id());

CREATE POLICY tenant_isolation ON "solicitud_acceso"
  USING (municipio_id = current_tenant_id());

CREATE POLICY tenant_isolation ON "informe_cumplimiento"
  USING (municipio_id = current_tenant_id());

CREATE POLICY tenant_isolation ON "audit_log"
  USING (municipio_id = current_tenant_id());
