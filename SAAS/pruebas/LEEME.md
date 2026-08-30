# Cómo se probó esto sin Supabase

El esquema se ejecutó contra un **PostgreSQL 16 local**, no contra Supabase.
Para eso hace falta un simulacro de lo que Supabase ya trae —el esquema
`auth`, la función `auth.uid()` y los roles `anon` / `authenticated` /
`service_role`—, que es lo que hay en `00-simulacro-supabase.sql`.

```bash
# 1. Cluster de pruebas (el usuario postgres no puede ser root)
D=/tmp/pgtest; mkdir -p $D; chown postgres:postgres $D; chmod 700 $D
su postgres -c "initdb -D $D -U postgres --auth=trust -E UTF8 --locale=C"
su postgres -c "pg_ctl -D $D -o '-k /tmp -p 5599 -c listen_addresses=' -l /tmp/pg.log start"

# 2. Base y esquema
psql -h /tmp -p 5599 -U postgres -c "create database radar;"
P() { psql -h /tmp -p 5599 -U postgres -d radar -v ON_ERROR_STOP=1 "$@"; }
P -f pruebas/00-simulacro-supabase.sql          # crear roles aparte, son del cluster
for f in supabase/migrations/*.sql; do P -f "$f"; done

# 3. Pruebas
P -f pruebas/01-esquema.sql     # RUT, semáforo, CHECKs, tope de plan, motor
P -f pruebas/02-rls.sql         # aislamiento entre usuarios
```

`01-esquema.sql` y `02-rls.sql` **fallan a propósito** cuando algo se permite
que no debería: cada caso está escrito como un bloque `DO` que lanza una
excepción con el texto `FALLO:` si la base acepta lo que tenía que rechazar.
Si la corrida imprime solo `OK:`, está todo bien.

Las pruebas de TypeScript no necesitan base ni ticket:

```bash
npm run prueba
```
