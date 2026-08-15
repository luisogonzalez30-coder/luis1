-- Problema que resuelve esta migración: con RLS forzado en `usuario`
-- (migración anterior), ni siquiera el rol dueño de la tabla puede leer
-- una fila sin haber fijado antes app.tenant_id — pero en el login todavía
-- no sabemos el tenant del usuario, solo su email. Es un problema de
-- huevo y gallina inherente a RLS por fila en un login multi-tenant.
--
-- Solución: un rol muy angosto con BYPASSRLS, dueño de una función
-- SECURITY DEFINER que solo puede leer (email, municipio_id) — nunca
-- hash_password ni ninguna otra columna — y que el backend usa
-- exclusivamente para resolver el tenant antes de re-consultar el usuario
-- completo ya con el contexto de tenant correcto (ver AuthService).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_auth_resolver') THEN
    CREATE ROLE app_auth_resolver NOLOGIN BYPASSRLS;
  END IF;
END
$$;

GRANT SELECT (id, email, municipio_id) ON "usuario" TO app_auth_resolver;

CREATE OR REPLACE FUNCTION resolver_municipio_por_email(p_email text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT municipio_id FROM "usuario" WHERE email = p_email LIMIT 1;
$$;

ALTER FUNCTION resolver_municipio_por_email(text) OWNER TO app_auth_resolver;

-- En producción, reemplazar PUBLIC por el rol específico de la API
-- (por ejemplo app_runtime) — PUBLIC es aceptable acá porque la función
-- en sí ya está acotada a dos columnas no sensibles.
GRANT EXECUTE ON FUNCTION resolver_municipio_por_email(text) TO PUBLIC;
