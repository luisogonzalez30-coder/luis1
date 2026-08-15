# Centinela TA

Plataforma de Monitoreo de Transparencia Activa — LOG-In Soluciones Integrales SpA.

Construida a partir del documento de arquitectura para la Compra Ágil N° 3013-534-COT26
(Ilustre Municipalidad de Retiro). Monorepo npm workspaces con:

- **`apps/api`** — NestJS. Auth (JWT), RBAC por rol, aislamiento multi-tenant vía
  Row-Level Security de PostgreSQL.
- **`apps/worker`** — BullMQ. Verifica los enlaces del portal de transparencia de
  cada municipio (alerta cuando alguno cae) y detecta infracciones por
  sección leyendo la fecha de última actualización que cada municipio
  publica en su portal.
- **`apps/web`** — Next.js (App Router). Dashboard de cumplimiento, revisiones,
  enlaces y solicitudes de acceso.
- **`packages/database`** — Schema de Prisma, migraciones (incluida la de RLS) y
  el helper `withTenantContext` que usan API y worker por igual.

Este scaffold ya se probó de punta a punta contra una instancia real de
PostgreSQL 16 + Redis (no es solo código sin ejecutar): login con JWT real,
aislamiento entre tenants verificado con una consulta cruzada que RLS bloqueó,
cifrado de campo verificado leyendo la columna directo en la base, RBAC
verificado con un 403 real, y el worker corriendo un ciclo de verificación de
enlaces completo (detectó los 4 enlaces caídos del seed y disparó las
alertas). El dashboard se probó en un navegador real (Chromium) con el flujo
login → resumen → enlaces, incluyendo resolver infracciones y registrar/
responder solicitudes de acceso desde la UI, con el % de cumplimiento
recalculándose en vivo.

La detección automática de infracciones por sección (`apps/worker/src/verificar-secciones.ts`)
se probó contra un servidor HTTP real que simula tres variantes de portal
municipal (sección actualizada, sección vencida, sección sin el indicador de
fecha) y produjo los tres estados correctos (`cumple`, `desactualizada`,
`no_cumple`) a partir de un fetch + parseo de HTML de verdad, no de datos
simulados a mano.

## Requisitos

- Node.js 20+
- PostgreSQL 16 (local, o vía `docker-compose up postgres`)
- Redis (local, o vía `docker-compose up redis`)

## Arranque local

```bash
# 1. Levantar Postgres y Redis (si no los tienes corriendo ya)
docker-compose up -d postgres redis

# 2. Instalar dependencias de todo el monorepo
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env: como mínimo, generar FIELD_ENCRYPTION_KEY con:
#   openssl rand -hex 32

# 4. Generar el cliente de Prisma y aplicar migraciones (incluye la de RLS)
cd packages/database
cp ../../.env .env
npx prisma generate
npx prisma migrate deploy
npm run db:seed   # crea el municipio piloto "Retiro" + 3 usuarios demo
cd ../..

# 5. Levantar cada servicio (en terminales separadas)
npm run dev:api      # http://localhost:3001/api/v1
npm run dev:worker    # procesa la cola de verificación de enlaces
npm run dev:web       # http://localhost:3000
```

Usuarios demo creados por el seed (contraseña `Cambiar123!` para los tres):

| Email | Rol |
|---|---|
| `admin@retiro.cl` | Administrador Municipal |
| `transparencia@retiro.cl` | Encargado de Transparencia |
| `control.interno@retiro.cl` | Auditor de Control Interno |

## Nota sobre la migración de RLS y el rol de base de datos

La migración `20260815181202_auth_tenant_resolver` crea un rol de Postgres
(`app_auth_resolver`) con el atributo `BYPASSRLS`. Solo un rol que **ya tiene**
`BYPASSRLS` (o un superusuario) puede crear otro rol con ese atributo — por
eso, en producción, esta migración debe correr con una credencial de
**migración** separada de la credencial de **runtime** que usa la API día a
día (que nunca debería tener `BYPASSRLS` ni `CREATEROLE`). En local, si tu
rol de desarrollo no tiene los permisos necesarios, aplica esa migración una
vez como superusuador (`psql -U postgres -f prisma/migrations/.../migration.sql`)
y márcala como aplicada con `npx prisma migrate resolve --applied <nombre>`.

## Configurar la detección de infracciones para un municipio real

Cada fila de `enlace` necesita `selectorFecha` (un selector CSS) apuntando
al elemento donde ese municipio publica la fecha de última actualización de
esa sección. No hay un valor por defecto razonable — cada portal municipal
chileno usa una plantilla distinta, así que esto se releva y configura por
enlace (ver "Supuestos de Diseño" del documento de arquitectura). El seed
deja los enlaces de Retiro sin `selectorFecha` porque apuntan a URLs de
ejemplo, no al portal real todavía.

## Qué falta para producción

Ver la sección "Próximos Pasos" del documento de arquitectura: el calendario
de feriados chilenos para el cálculo de plazos, el módulo de gestión de
usuarios/municipios para el rol Administrador Municipal, y el despliegue a
GCP `southamerica-west1` descrito ahí. Este repo es el punto de partida
técnico, no el producto terminado.
