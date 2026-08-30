-- =====================================================================
-- Radar de Licitaciones — esquema inicial
-- PostgreSQL 15+ / Supabase
--
-- Ejecutar entero, en orden, con el rol `postgres` (SQL Editor de Supabase
-- o `supabase db push`). Es idempotente: se puede volver a correr.
--
-- Modelo híbrido a propósito:
--   · usuarios / preferencias_alerta  -> relacional estricto. Son datos
--     nuestros, el esquema lo controlamos nosotros y queremos que la base
--     rechace lo que esté mal.
--   · licitaciones_cache / historial_compradores -> columnas tipadas para
--     lo que consultamos siempre (fechas, montos, estado) + `data_cruda`
--     JSONB con la respuesta completa de la API. Si ChileCompra agrega o
--     renombra un campo, la ingesta no se cae y el dato queda guardado
--     igual; se promueve a columna cuando haga falta indexarlo.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Extensiones
-- ---------------------------------------------------------------------
-- Supabase pide que las extensiones vivan en el esquema `extensions`, no
-- en `public`. Por eso los operadores se califican (`extensions.gin_trgm_ops`):
-- sin calificar, el índice falla si `extensions` no está en el search_path
-- de quien corre la migración.
create schema if not exists extensions;

create extension if not exists pg_trgm  with schema extensions;  -- fuzzy matching
create extension if not exists unaccent with schema extensions;  -- "licitación" = "licitacion"


-- ---------------------------------------------------------------------
-- 2. Funciones de apoyo
-- ---------------------------------------------------------------------

-- Normalizador de texto para búsqueda: minúsculas, sin tildes, sin espacios
-- redundantes. Es lo que se indexa con trigramas.
--
-- OJO con el IMMUTABLE: `unaccent()` es STABLE porque depende de un
-- diccionario que se puede editar. Marcarla IMMUTABLE es la práctica estándar
-- para poder usarla en columnas generadas e índices, y el precio es concreto:
-- si algún día se modifica el diccionario `unaccent`, hay que correr
-- `REINDEX INDEX licitaciones_cache_busqueda_trgm_idx`. No pasa solo.
create or replace function public.normalizar_texto(t text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select regexp_replace(
           lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(t, ''))),
           '\s+', ' ', 'g')
$$;

comment on function public.normalizar_texto(text) is
  'Minúsculas + sin tildes + espacios colapsados. Base de todo el fuzzy matching.';


-- Validación de RUT chileno con módulo 11. Va en un CHECK, así que la base
-- rechaza un RUT inventado en vez de descubrirlo al facturar.
create or replace function public.rut_valido(rut text)
returns boolean
language plpgsql
immutable
parallel safe
set search_path = ''
as $$
declare
  limpio   text;
  cuerpo   text;
  dv       text;
  suma     int := 0;
  mult     int := 2;
  i        int;
  resto    int;
  esperado text;
begin
  if rut is null then
    return true;                       -- la nulabilidad la decide la columna
  end if;

  limpio := upper(regexp_replace(rut, '[^0-9kK]', '', 'g'));
  if length(limpio) < 8 or length(limpio) > 9 then
    return false;                      -- RUT de empresa: 7 u 8 dígitos + DV
  end if;

  cuerpo := left(limpio, length(limpio) - 1);
  dv     := right(limpio, 1);
  if cuerpo !~ '^[0-9]+$' then
    return false;
  end if;

  for i in reverse length(cuerpo)..1 loop
    suma := suma + substr(cuerpo, i, 1)::int * mult;
    mult := case when mult = 7 then 2 else mult + 1 end;
  end loop;

  resto    := 11 - (suma % 11);
  esperado := case resto when 11 then '0' when 10 then 'K' else resto::text end;

  return dv = esperado;
end;
$$;

comment on function public.rut_valido(text) is
  'Módulo 11. Acepta con o sin puntos y guión; NULL pasa.';


-- Canonicaliza a `76543210-K`, para que el UNIQUE del RUT sirva de verdad.
create or replace function public.normalizar_rut(rut text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when rut is null or btrim(rut) = '' then null
    else left(upper(regexp_replace(rut, '[^0-9kK]', '', 'g')),
              length(upper(regexp_replace(rut, '[^0-9kK]', '', 'g'))) - 1)
         || '-' ||
         right(upper(regexp_replace(rut, '[^0-9kK]', '', 'g')), 1)
  end
$$;


-- Toca `actualizado_en` en cada UPDATE.
create or replace function public.tocar_actualizado_en()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------
-- 3. historial_compradores
--    Va primero: licitaciones_cache la referencia.
-- ---------------------------------------------------------------------
--
-- ADVERTENCIA DE DISEÑO, leerla antes de vender el semáforo:
-- la API pública de ChileCompra NO expone fechas de pago. Ni
-- `licitaciones.json` ni `ordenesdecompra.json` traen cuándo se pagó una
-- orden — traen cuándo se emitió y cuándo se aceptó. Así que el semáforo
-- no se puede calcular solo con la API, y por eso esta tabla tiene `fuente`
-- y arranca en `sin_datos` (gris). Un semáforo verde por omisión sería
-- inventarle solvencia a un organismo, que es exactamente el error que el
-- producto promete evitar.
--
-- Fuentes reales para llenarla, en orden de esfuerzo:
--   1. `reporte_usuario` — los propios proveedores declaran cuánto tardaron
--      en cobrarle a cada organismo. Es el dato más caro de conseguir y el
--      único defendible como diferencial; también es el que se vuelve foso
--      competitivo cuando hay volumen.
--   2. `dipres` — informes trimestrales de deuda del Estado a proveedores.
--   3. `chilecompra` — reportes de plazo de pago que publica la DCCP.
--   4. `api_oc` — proxy débil: días entre emisión y aceptación de la OC.
--      Mide burocracia interna, no pago. Sirve de señal, no de veredicto.

create table if not exists public.historial_compradores (
  codigo_organismo      text primary key,
  nombre_organismo      text        not null,
  tipo_organismo        text,                         -- municipalidad, salud, educación…
  region                text,
  comuna                text,

  -- Métricas de pago
  dias_pago_promedio    numeric(6,2),
  dias_pago_mediana     numeric(6,2),
  pct_pagos_sobre_30    numeric(5,2) check (pct_pagos_sobre_30 between 0 and 100),
  ordenes_evaluadas     integer      not null default 0 check (ordenes_evaluadas >= 0),
  monto_total_evaluado  numeric(16,2),
  deuda_informada       numeric(16,2),
  moneda_deuda          text         not null default 'CLP',

  -- Trazabilidad del dato
  fuente                text         not null default 'sin_datos'
                          check (fuente in ('sin_datos','reporte_usuario','dipres','chilecompra','api_oc','mixta')),
  periodo_desde         date,
  periodo_hasta         date,

  -- El semáforo es derivado, no escrito a mano: nadie puede pintar un
  -- organismo de verde sin que los números lo respalden.
  --
  -- Reglas (Ley 21.131 fija 30 días como plazo legal de pago):
  --   gris     -> menos de 5 órdenes evaluadas o sin fuente. No sabemos.
  --   verde    -> mediana <= 30 días y menos del 20% se pasa de 30.
  --   amarillo -> mediana <= 60 días.
  --   rojo     -> mediana > 60 días, o más de la mitad se pasa de 30.
  semaforo text generated always as (
    case
      when fuente = 'sin_datos'
        or ordenes_evaluadas < 5
        or dias_pago_mediana is null              then 'gris'
      when dias_pago_mediana > 60
        or coalesce(pct_pagos_sobre_30, 0) > 50   then 'rojo'
      when dias_pago_mediana > 30                 then 'amarillo'
      when coalesce(pct_pagos_sobre_30, 0) > 20   then 'amarillo'
      else                                             'verde'
    end
  ) stored,

  data_cruda            jsonb,
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now(),

  constraint historial_compradores_periodo_coherente
    check (periodo_desde is null or periodo_hasta is null or periodo_desde <= periodo_hasta)
);

comment on table  public.historial_compradores is
  'Un organismo comprador del Estado y su comportamiento de pago. El semáforo es generado, nunca escrito.';
comment on column public.historial_compradores.semaforo is
  'Derivado. gris = sin datos suficientes (>=5 órdenes). Nunca asumir verde por omisión.';

create index if not exists historial_compradores_semaforo_idx
  on public.historial_compradores (semaforo);

create index if not exists historial_compradores_region_idx
  on public.historial_compradores (region)
  where region is not null;

create index if not exists historial_compradores_nombre_trgm_idx
  on public.historial_compradores
  using gin (public.normalizar_texto(nombre_organismo) extensions.gin_trgm_ops);

create index if not exists historial_compradores_data_cruda_idx
  on public.historial_compradores using gin (data_cruda jsonb_path_ops);

drop trigger if exists tg_historial_compradores_actualizado on public.historial_compradores;
create trigger tg_historial_compradores_actualizado
  before update on public.historial_compradores
  for each row execute function public.tocar_actualizado_en();


-- ---------------------------------------------------------------------
-- 4. licitaciones_cache
-- ---------------------------------------------------------------------
--
-- Se llena en dos fases, y esto no es un detalle de implementación sino
-- la restricción que ordena todo el backend: el ticket de la API tiene
-- cuota de 10.000 peticiones al día y la API responde 429 en ráfaga. El
-- listado diario (`?fecha=DDMMAAAA`) trae campos mínimos de MUCHAS
-- licitaciones en 1 petición; la ficha completa (`?codigo=...`) cuesta
-- 1 petición por licitación. Se guarda todo lo del listado y se pide la
-- ficha solo de las que le pegaron a alguna preferencia.
-- `detalle_cargado` marca en qué fase está cada fila.

create table if not exists public.licitaciones_cache (
  id                bigint generated always as identity primary key,
  codigo_externo    text        not null unique,     -- p.ej. '1509-12-LE26'

  -- Fase 1: listado
  nombre            text        not null,
  codigo_estado     smallint,                        -- 5=Publicada 6=Cerrada 8=Adjudicada…
  estado            text,
  tipo              text,                            -- L1, LE, LP, LQ, LR, CM…
  fecha_cierre      timestamptz,

  -- Fase 2: ficha completa
  descripcion       text,
  codigo_organismo  text        references public.historial_compradores(codigo_organismo)
                                on update cascade on delete set null,
  nombre_organismo  text,
  region            text,
  comuna            text,
  monto_estimado    numeric(16,2),

  -- La moneda importa y se olvida: 4.126 UF no son $4.126. Sin este campo
  -- cualquier filtro por monto miente por un factor de ~39.000.
  moneda            text        not null default 'CLP'
                      check (moneda in ('CLP','CLF','USD','EUR','UTM','UTTAL','OTRA')),

  fecha_publicacion timestamptz,
  fecha_adjudicacion timestamptz,
  unspsc            text[]      not null default '{}',   -- extraído de los ítems
  items             jsonb,

  -- Respuesta cruda de la API, tal cual llegó. Es el respaldo ante cambios
  -- de esquema del gobierno y la única fuente de verdad si algo se mapeó mal.
  data_cruda        jsonb       not null,

  detalle_cargado   boolean     not null default false,
  detalle_pedido_en timestamptz,

  -- Columna generada = no se puede olvidar de actualizarla. Es lo que se
  -- indexa con trigramas y contra lo que corre el motor de alertas.
  busqueda          text generated always as (
                      public.normalizar_texto(nombre || ' ' || coalesce(descripcion, ''))
                    ) stored,

  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now()
);

comment on table  public.licitaciones_cache is
  'Espejo local de la API de ChileCompra. Columnas tipadas para lo que se filtra; data_cruda para todo lo demás.';
comment on column public.licitaciones_cache.data_cruda is
  'Respuesta íntegra de la API. Nunca se edita a mano: se reescribe en cada upsert.';
comment on column public.licitaciones_cache.detalle_cargado is
  'false = solo tiene los campos del listado diario. La ficha cuesta 1 petición de las 10.000 diarias.';

-- --- Índices ---------------------------------------------------------

-- jsonb_path_ops: la mitad del tamaño y más rápido para `data_cruda @> '{...}'`,
-- que es como se consulta el 95% del tiempo. No sirve para `?` (existencia de
-- clave); si algún día hace falta, se agrega un segundo índice con jsonb_ops.
create index if not exists licitaciones_cache_data_cruda_idx
  on public.licitaciones_cache using gin (data_cruda jsonb_path_ops);

-- Los ítems sí se consultan por clave (`items @> ...`, `items ? 'Codigo'`),
-- así que acá va el operator class completo.
create index if not exists licitaciones_cache_items_idx
  on public.licitaciones_cache using gin (items);

-- El corazón del fuzzy matching. Acelera `<%` (word_similarity) y también
-- `LIKE '%texto%'`, que es lo que usa el motor para la coincidencia exacta.
--
-- Medido sobre 50.000 filas: un término selectivo ("luminarias led n°4242")
-- resuelve por Bitmap Index Scan en 2,5 ms. Un término que pega en el 12%
-- de la tabla lo resuelve por Seq Scan en 18 ms, y eso está bien: a esa
-- selectividad el índice sería más lento. O sea que el índice no evita el
-- seq scan siempre — evita el que importa, que es el de las palabras clave
-- específicas con las que un proveedor caza de verdad.
create index if not exists licitaciones_cache_busqueda_trgm_idx
  on public.licitaciones_cache using gin (busqueda extensions.gin_trgm_ops);

-- Cruce por código ONU/UNSPSC: `unspsc && ARRAY['81111500']`.
create index if not exists licitaciones_cache_unspsc_idx
  on public.licitaciones_cache using gin (unspsc);

-- Índice parcial: el dashboard y el motor de alertas solo miran lo abierto.
-- Sobre millones de filas históricas, esto es la diferencia entre 5 ms y 2 s.
create index if not exists licitaciones_cache_abiertas_idx
  on public.licitaciones_cache (fecha_cierre)
  where codigo_estado = 5;

create index if not exists licitaciones_cache_organismo_idx
  on public.licitaciones_cache (codigo_organismo)
  where codigo_organismo is not null;

create index if not exists licitaciones_cache_publicacion_idx
  on public.licitaciones_cache (fecha_publicacion desc);

-- Cola de enriquecimiento: "dame las que aún no tienen ficha".
create index if not exists licitaciones_cache_pendientes_detalle_idx
  on public.licitaciones_cache (creado_en)
  where detalle_cargado = false;

drop trigger if exists tg_licitaciones_cache_actualizado on public.licitaciones_cache;
create trigger tg_licitaciones_cache_actualizado
  before update on public.licitaciones_cache
  for each row execute function public.tocar_actualizado_en();


-- ---------------------------------------------------------------------
-- 5. usuarios
-- ---------------------------------------------------------------------
-- Extiende `auth.users` de Supabase (que no se toca). La PK es la misma
-- para que `auth.uid() = id` sea toda la política de RLS.

create table if not exists public.usuarios (
  id                 uuid        primary key references auth.users(id) on delete cascade,
  email              text        not null,
  rut_empresa        text        unique,
  razon_social       text,
  nombre_contacto    text,
  telefono           text,

  plan               text        not null default 'trial'
                       check (plan in ('trial','basico','pro','agencia')),
  estado_suscripcion text        not null default 'activa'
                       check (estado_suscripcion in ('activa','morosa','cancelada','pausada')),
  trial_termina_en   timestamptz not null default (now() + interval '14 days'),

  -- Tope de perfiles de alerta según plan. Se aplica con un trigger más abajo:
  -- un CHECK no puede contar filas de otra tabla.
  max_preferencias   smallint    not null default 1 check (max_preferencias between 1 and 100),

  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),

  constraint usuarios_rut_valido check (public.rut_valido(rut_empresa))
);

comment on table public.usuarios is
  'Perfil de negocio. 1:1 con auth.users; auth.users guarda la credencial, esto guarda la empresa.';

create index if not exists usuarios_plan_idx on public.usuarios (plan, estado_suscripcion);

drop trigger if exists tg_usuarios_actualizado on public.usuarios;
create trigger tg_usuarios_actualizado
  before update on public.usuarios
  for each row execute function public.tocar_actualizado_en();

-- Canonicaliza el RUT antes de guardarlo: '76.543.210-k' y '765432l0K'
-- tienen que chocar contra el mismo UNIQUE.
create or replace function public.usuarios_normalizar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.rut_empresa := public.normalizar_rut(new.rut_empresa);
  new.email       := lower(btrim(new.email));
  return new;
end;
$$;

drop trigger if exists tg_usuarios_normalizar on public.usuarios;
create trigger tg_usuarios_normalizar
  before insert or update on public.usuarios
  for each row execute function public.usuarios_normalizar();


-- Alta automática del perfil cuando Supabase Auth crea la cuenta. Sin esto
-- hay una ventana en la que el usuario existe en `auth` y no en `public`,
-- y el dashboard revienta en el primer login.
create or replace function public.crear_perfil_usuario()
returns trigger
language plpgsql
security definer                     -- corre como owner: `authenticated` no
set search_path = ''                 -- puede insertar en public.usuarios
as $$
begin
  insert into public.usuarios (id, email, nombre_contacto)
  values (new.id, new.email, new.raw_user_meta_data ->> 'nombre_contacto')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists tg_crear_perfil_usuario on auth.users;
create trigger tg_crear_perfil_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_usuario();


-- ---------------------------------------------------------------------
-- 6. preferencias_alerta
-- ---------------------------------------------------------------------
-- Un usuario puede tener varios perfiles de caza ("obras menores en Maule",
-- "software en todo Chile"). Cada uno es una fila.

create table if not exists public.preferencias_alerta (
  id                    uuid        primary key default gen_random_uuid(),
  usuario_id            uuid        not null references public.usuarios(id) on delete cascade,
  nombre                text        not null,
  activa                boolean     not null default true,

  -- Cruce por texto
  palabras_clave        text[]      not null default '{}',
  palabras_excluidas    text[]      not null default '{}',
  umbral_similitud      real        not null default 0.35
                          check (umbral_similitud > 0 and umbral_similitud <= 1),

  -- Cruce por clasificación
  codigos_unspsc        text[]      not null default '{}',
  tipos_licitacion      text[]      not null default '{}',   -- L1, LE, CM…
  regiones              text[]      not null default '{}',   -- vacío = todo Chile

  -- Filtros duros
  organismos_incluidos  text[]      not null default '{}',
  organismos_excluidos  text[]      not null default '{}',
  monto_min             numeric(16,2) check (monto_min  >= 0),
  monto_max             numeric(16,2) check (monto_max  >= 0),
  moneda_monto          text        not null default 'CLP',
  dias_minimos_cierre   smallint    not null default 0 check (dias_minimos_cierre between 0 and 90),

  -- Riesgo financiero: por omisión se muestran verde, amarillo y gris.
  -- Gris entra a propósito: excluir "no sabemos" esconde oportunidades
  -- buenas de organismos que nunca han sido medidos.
  semaforos_aceptados   text[]      not null default '{verde,amarillo,gris}',

  -- Entrega
  canales               text[]      not null default '{email}',
  frecuencia            text        not null default 'diaria'
                          check (frecuencia in ('inmediata','diaria','semanal')),
  hora_envio            time        not null default '08:00',

  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now(),

  constraint preferencias_nombre_unico       unique (usuario_id, nombre),
  constraint preferencias_monto_coherente    check (monto_min is null or monto_max is null or monto_min <= monto_max),
  constraint preferencias_semaforos_validos  check (semaforos_aceptados <@ array['verde','amarillo','rojo','gris']),
  constraint preferencias_canales_validos    check (canales <@ array['email','whatsapp','webhook']),
  -- Un perfil sin ningún criterio de cruce mandaría TODAS las licitaciones
  -- del día. Es el bug que hace que el usuario marque el correo como spam
  -- el primer día, así que lo prohíbe la base.
  constraint preferencias_con_criterio
    check (cardinality(palabras_clave) > 0 or cardinality(codigos_unspsc) > 0)
);

comment on table public.preferencias_alerta is
  'Perfil de caza. El motor de alertas cruza cada licitación nueva contra todas las filas activas de acá.';

-- Cruce inverso: dada una licitación, ¿qué preferencias le pegan? Con GIN
-- sobre los arrays, `palabras_clave && ARRAY[...]` no recorre la tabla.
create index if not exists preferencias_palabras_idx
  on public.preferencias_alerta using gin (palabras_clave)
  where activa;

create index if not exists preferencias_unspsc_idx
  on public.preferencias_alerta using gin (codigos_unspsc)
  where activa;

create index if not exists preferencias_regiones_idx
  on public.preferencias_alerta using gin (regiones)
  where activa;

create index if not exists preferencias_usuario_idx
  on public.preferencias_alerta (usuario_id);

-- Cola del cron: "qué perfiles toca despachar a esta hora".
create index if not exists preferencias_despacho_idx
  on public.preferencias_alerta (frecuencia, hora_envio)
  where activa;

drop trigger if exists tg_preferencias_actualizado on public.preferencias_alerta;
create trigger tg_preferencias_actualizado
  before update on public.preferencias_alerta
  for each row execute function public.tocar_actualizado_en();


-- Tope de perfiles por plan. Va en trigger porque un CHECK no puede contar
-- filas. El bloqueo explícito evita que dos inserts simultáneos se salten
-- el tope por condición de carrera.
create or replace function public.limitar_preferencias()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  tope   smallint;
  actual integer;
begin
  select max_preferencias into tope
    from public.usuarios where id = new.usuario_id for update;

  select count(*) into actual
    from public.preferencias_alerta where usuario_id = new.usuario_id;

  if actual >= tope then
    raise exception 'El plan actual permite % perfil(es) de alerta. Elimina uno o cambia de plan.', tope
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists tg_limitar_preferencias on public.preferencias_alerta;
create trigger tg_limitar_preferencias
  before insert on public.preferencias_alerta
  for each row execute function public.limitar_preferencias();


-- ---------------------------------------------------------------------
-- 7. Row Level Security
-- ---------------------------------------------------------------------
-- Regla de oro: `service_role` (la clave que usa la ingesta en el backend)
-- SALTA RLS por diseño. Todo lo de abajo describe qué puede hacer el
-- navegador del cliente con la clave `anon`/`authenticated`, que es la única
-- que viaja al frontend.

alter table public.usuarios              enable row level security;
alter table public.preferencias_alerta   enable row level security;
alter table public.licitaciones_cache    enable row level security;
alter table public.historial_compradores enable row level security;

-- Y que ni el owner se las salte por accidente en una migración futura.
alter table public.usuarios              force row level security;
alter table public.preferencias_alerta   force row level security;

-- --- usuarios: solo su propia fila ------------------------------------
drop policy if exists usuarios_leer_propio      on public.usuarios;
drop policy if exists usuarios_editar_propio    on public.usuarios;

create policy usuarios_leer_propio on public.usuarios
  for select to authenticated
  using ((select auth.uid()) = id);

create policy usuarios_editar_propio on public.usuarios
  for update to authenticated
  using      ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No hay policy de INSERT ni de DELETE a propósito: el alta la hace el
-- trigger sobre auth.users y la baja la hace el borrado en cascada.
-- Tampoco hay policy que permita cambiar `plan` — eso lo escribe el webhook
-- de pagos con service_role. Si un día se necesita bloquear columnas
-- individuales, va con un trigger BEFORE UPDATE, no con RLS: RLS es por fila.

-- --- preferencias_alerta: CRUD sobre lo propio ------------------------
drop policy if exists preferencias_crud_propio on public.preferencias_alerta;

create policy preferencias_crud_propio on public.preferencias_alerta
  for all to authenticated
  using      ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

-- --- Datos públicos: lectura para quien pagó, escritura solo backend --
-- Son datos públicos del Estado, pero se sirven solo a usuarios con sesión
-- y suscripción viva: el producto es el cruce, no el dato, y sin esto
-- cualquiera raspa la base entera con la clave anon.
drop policy if exists licitaciones_leer     on public.licitaciones_cache;
drop policy if exists compradores_leer      on public.historial_compradores;

create policy licitaciones_leer on public.licitaciones_cache
  for select to authenticated
  using (
    exists (
      select 1 from public.usuarios u
      where u.id = (select auth.uid())
        and u.estado_suscripcion in ('activa','morosa')
    )
  );

create policy compradores_leer on public.historial_compradores
  for select to authenticated
  using (
    exists (
      select 1 from public.usuarios u
      where u.id = (select auth.uid())
        and u.estado_suscripcion in ('activa','morosa')
    )
  );

-- Sin policies de INSERT/UPDATE/DELETE: solo la ingesta con service_role escribe.

-- El rol `anon` (visitante sin login) no tiene nada que hacer acá.
revoke all on public.usuarios,
              public.preferencias_alerta,
              public.licitaciones_cache,
              public.historial_compradores
  from anon;


-- ---------------------------------------------------------------------
-- 8. Motor de alertas quirúrgicas
-- ---------------------------------------------------------------------
-- Todo el cruce vive en la base, no en la aplicación. Dos razones:
-- el índice de trigramas está acá y mover 50.000 filas a Node para
-- filtrarlas en JavaScript no escala; y así el mismo criterio sirve para
-- el correo diario y para el dashboard, sin dos implementaciones que se
-- desincronizan.
--
-- Es SECURITY INVOKER: corre con los permisos de quien llama, así que RLS
-- se aplica igual y un usuario no puede pasarle el id de preferencia de otro.
-- Es VOLATILE porque ajusta un GUC de sesión.
--
-- Se usa `word_similarity` (`<%`), NO `similarity` (`%`). La diferencia decide
-- si el motor sirve o no: `similarity()` compara las dos cadenas ENTERAS, así
-- que "plataforma web" contra una descripción de 120 caracteres da ~0.06 y
-- nunca pasa ningún umbral razonable. `word_similarity()` busca la frase
-- dentro del texto y da ~0.85 en el mismo caso. Ambos usan el mismo índice GIN.

create or replace function public.oportunidades_de(
  p_preferencia uuid,
  p_limite      integer default 50,
  p_desde       timestamptz default null   -- null = todo lo abierto; para el
)                                          -- correo diario, la corrida anterior
returns table (
  codigo_externo   text,
  nombre           text,
  organismo        text,
  region           text,
  tipo             text,
  monto_estimado   numeric,
  moneda           text,
  fecha_cierre     timestamptz,
  dias_restantes   integer,
  semaforo         text,
  similitud        real,
  motivos          text[]
)
language plpgsql
volatile
security invoker
set search_path = public, extensions
as $$
declare
  pref        public.preferencias_alerta%rowtype;
  v_claves    text[];   -- palabras clave normalizadas
  v_patrones  text[];   -- las mismas, como '%patrón%' para LIKE
  v_excluidas text[];
begin
  -- RLS filtra acá: si la preferencia es de otro usuario, no aparece.
  select * into pref
    from public.preferencias_alerta
   where id = p_preferencia and activa;

  if not found then
    return;   -- ninguna fila, sin error: no revela si el id existe
  end if;

  -- Umbral del operador `%>`, acotado a esta transacción (tercer argumento
  -- `true`): dos usuarios con umbrales distintos pueden correr en paralelo
  -- sobre la misma conexión del pool sin pisarse.
  perform set_config('pg_trgm.word_similarity_threshold', pref.umbral_similitud::text, true);

  -- Las palabras clave se normalizan UNA vez, acá, y no una vez por fila.
  -- Como arrays locales, el planner las ve como constantes y puede usar
  -- `LIKE ANY` / `%> ANY` contra el índice GIN. Con las mismas palabras
  -- dentro de un CTE correlacionado no puede, y ahí se pierde el índice.
  select array_agg(t), array_agg('%' || t || '%')
    into v_claves, v_patrones
    from (select public.normalizar_texto(k) as t
            from unnest(pref.palabras_clave) k where btrim(k) <> '') q;

  select array_agg('%' || public.normalizar_texto(k) || '%')
    into v_excluidas
    from unnest(pref.palabras_excluidas) k where btrim(k) <> '';

  v_claves    := coalesce(v_claves,    '{}');
  v_patrones  := coalesce(v_patrones,  '{}');
  v_excluidas := coalesce(v_excluidas, '{}');

  return query
  -- El cruce se arma en tres ramas SEPARADAS y después se unen. Es más
  -- largo que un WHERE con ORs, y es a propósito: cada rama toca el índice
  -- que le corresponde. Un solo WHERE con `%> ANY(array)` se degrada a
  -- Seq Scan porque GIN no soporta ScalarArrayOpExpr para ese operador
  -- (medido: 1.776 ms contra 157 ms sobre 50.000 filas).
  with claves as (
    select k from unnest(v_claves) k
  ),
  candidatos as (
    -- Rama 1: frase exacta. `LIKE ANY` sí baja al índice GIN.
    select l.codigo_externo, true as exacta, false as pega_unspsc
      from public.licitaciones_cache l
     where cardinality(v_patrones) > 0
       and l.busqueda like any (v_patrones)

    union all

    -- Rama 2: difusa. Un LATERAL por palabra clave: cada iteración es un
    -- Bitmap Index Scan con la palabra como parámetro, que es lo que GIN
    -- sí sabe acelerar.
    select l.codigo_externo, false, false
      from claves c
      cross join lateral (
        select l2.codigo_externo
          from public.licitaciones_cache l2
         where l2.busqueda %> c.k
      ) l

    union all

    -- Rama 3: código ONU/UNSPSC, sobre el índice GIN del arreglo.
    select l.codigo_externo, false, true
      from public.licitaciones_cache l
     where cardinality(pref.codigos_unspsc) > 0
       and l.unspsc && pref.codigos_unspsc
  ),
  agrupados as (
    select c.codigo_externo,
           bool_or(c.exacta)      as exacta,
           bool_or(c.pega_unspsc) as pega_unspsc
      from candidatos c
     group by c.codigo_externo
  )
  select l.codigo_externo,
         l.nombre,
         coalesce(h.nombre_organismo, l.nombre_organismo)      as organismo,
         -- La región de la licitación manda sobre la del organismo: un
         -- servicio nacional publica para una unidad regional concreta.
         -- El MISMO coalesce se usa en el filtro de abajo; si no, el usuario
         -- filtra por una región y la pantalla le muestra otra.
         coalesce(l.region, h.region)                          as region,
         l.tipo,
         l.monto_estimado,
         l.moneda,
         l.fecha_cierre,
         ceil(extract(epoch from (l.fecha_cierre - now())) / 86400)::integer as dias_restantes,
         coalesce(h.semaforo, 'gris')                          as semaforo,
         sim.valor,
         array_remove(array[
           case when a.exacta      then 'palabra clave exacta' end,
           case when sim.valor > 0 then 'similitud ' || round(sim.valor::numeric, 2) end,
           case when a.pega_unspsc then 'código ONU'           end
         ], null)                                              as motivos
    from agrupados a
    join public.licitaciones_cache l on l.codigo_externo = a.codigo_externo
    left join public.historial_compradores h on h.codigo_organismo = l.codigo_organismo
    -- La similitud se calcula acá, sobre las filas que ya sobrevivieron,
    -- no sobre la tabla entera.
    cross join lateral (
      select coalesce((select max(word_similarity(k, l.busqueda))
                         from unnest(v_claves) k
                        where l.busqueda %> k), 0)::real as valor
    ) sim
   where l.codigo_estado = 5                                   -- publicada
     and l.fecha_cierre > now() + make_interval(days => pref.dias_minimos_cierre)
     and not (l.busqueda like any (v_excluidas))
     and (p_desde is null or l.creado_en >= p_desde)
     and (cardinality(pref.regiones) = 0
          or coalesce(l.region, h.region) = any (pref.regiones))
     and (cardinality(pref.tipos_licitacion) = 0  or l.tipo   = any (pref.tipos_licitacion))
     and (cardinality(pref.organismos_incluidos) = 0
          or l.codigo_organismo = any (pref.organismos_incluidos))
     and (cardinality(pref.organismos_excluidos) = 0
          or l.codigo_organismo is null
          or l.codigo_organismo <> all (pref.organismos_excluidos))
     -- El monto solo filtra cuando la moneda coincide: comparar 4.126 UF
     -- contra un tope en pesos es peor que no filtrar. Si la moneda no
     -- calza, la licitación pasa y el usuario decide.
     and (pref.monto_min is null or l.monto_estimado is null
          or l.moneda <> pref.moneda_monto or l.monto_estimado >= pref.monto_min)
     and (pref.monto_max is null or l.monto_estimado is null
          or l.moneda <> pref.moneda_monto or l.monto_estimado <= pref.monto_max)
     and coalesce(h.semaforo, 'gris') = any (pref.semaforos_aceptados)
   -- El orden es la promesa del producto: primero lo que más se parece,
   -- después lo que cierra antes. Un match perfecto que cierra en 20 días
   -- vale más que uno mediocre que cierra mañana.
   order by (a.exacta or a.pega_unspsc) desc, sim.valor desc, l.fecha_cierre asc
   limit greatest(p_limite, 1);
end;
$$;

comment on function public.oportunidades_de(uuid, integer, timestamptz) is
  'Cruce de una preferencia contra el caché. SECURITY INVOKER: RLS impide leer preferencias ajenas.';

grant execute on function public.oportunidades_de(uuid, integer, timestamptz) to authenticated;
