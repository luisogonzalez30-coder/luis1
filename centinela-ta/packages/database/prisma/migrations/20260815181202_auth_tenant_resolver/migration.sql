-- Problema que resuelve esta migración: con RLS forzado en `usuario`
-- (migración anterior), ni siquiera el rol dueño de la tabla puede leer
-- una fila sin haber fijado antes app.tenant_id — pero en el login todavía
-- no sabemos el tenant del usuario, solo su email. Es un problema de
-- huevo y gallina inherente a RLS por fila en un login multi-tenant.
--
-- Solución: una tabla espejo `usuario_tenant_lookup(email, municipio_id)`
-- SIN RLS — no tiene nada sensible (nunca el hash de contraseña, ni el
-- nombre, solo a qué municipio pertenece un email), mantenida al día por
-- trigger sobre `usuario`. El backend la usa exclusivamente para resolver
-- el tenant antes de re-consultar el usuario completo ya con el contexto
-- de tenant correcto (ver AuthService).
--
-- A propósito NO usa un rol con BYPASSRLS (como una primera versión de
-- esta migración): eso exige que el rol de conexión tenga privilegio
-- CREATEROLE, algo que ningún Postgres administrado (Render, RDS, Cloud
-- SQL, etc.) le da al usuario de la aplicación. Esta versión solo necesita
-- privilegios de dueño de tabla — funciona en cualquier Postgres.

CREATE TABLE "usuario_tenant_lookup" (
  "email" TEXT PRIMARY KEY,
  "municipio_id" TEXT NOT NULL
);

CREATE OR REPLACE FUNCTION sync_usuario_tenant_lookup() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM usuario_tenant_lookup WHERE email = OLD.email;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.email <> OLD.email THEN
    DELETE FROM usuario_tenant_lookup WHERE email = OLD.email;
  END IF;

  INSERT INTO usuario_tenant_lookup (email, municipio_id)
  VALUES (NEW.email, NEW.municipio_id)
  ON CONFLICT (email) DO UPDATE SET municipio_id = EXCLUDED.municipio_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_usuario_tenant_lookup
AFTER INSERT OR UPDATE OF email, municipio_id OR DELETE ON "usuario"
FOR EACH ROW EXECUTE FUNCTION sync_usuario_tenant_lookup();

-- Backfill de los usuarios que ya existían antes de esta migración.
-- ALTER TABLE (DDL) no está sujeto a RLS, así que esto es válido incluso
-- sin app.tenant_id fijado: quita FORCE momentáneamente para que el propio
-- dueño de la tabla (sujeto a FORCE en runtime normal) pueda leer todas
-- las filas de todos los tenants solo para esta copia única, y lo
-- restaura enseguida.
ALTER TABLE "usuario" NO FORCE ROW LEVEL SECURITY;

INSERT INTO usuario_tenant_lookup (email, municipio_id)
SELECT email, municipio_id FROM "usuario"
ON CONFLICT (email) DO NOTHING;

ALTER TABLE "usuario" FORCE ROW LEVEL SECURITY;
