-- =====================================================================
-- Radar de Licitaciones — coincidencias materializadas
--
-- Esto NO estaba en el pedido original de 4 tablas. Se agrega porque la
-- medición sobre 50.000 licitaciones lo obligó, y conviene entender el
-- número antes de decidir si se deja fuera:
--
--   · preferencia estrecha (una frase específica)  ->  ~110 ms
--   · preferencia amplia ("software", "luminarias",
--     + un código ONU: 13.214 coincidencias)       -> ~3.200 ms
--
-- Y los 3,2 s no bajan con `LIMIT 20`: el `ORDER BY` por similitud obliga
-- a materializar el conjunto entero antes de cortar. O sea que un dashboard
-- que llame a `oportunidades_de()` en cada carga le va a dar 3 segundos de
-- espera al usuario que más paga, que es justo el que tiene el perfil más
-- amplio.
--
-- La solución no es optimizar más la consulta: es no correrla en vivo. El
-- cron la corre una vez por perfil al día y deja el resultado acá; el
-- dashboard lee de esta tabla, que es un índice btree y responde en
-- milisegundos.
--
-- De regalo resuelve el otro problema que las 4 tablas no cubren: sin
-- registro de qué se notificó, el correo diario reenvía las mismas
-- licitaciones todos los días hasta que el usuario lo marca como spam.
-- =====================================================================

create table if not exists public.coincidencias (
  id                 bigint generated always as identity primary key,
  preferencia_id     uuid   not null references public.preferencias_alerta(id) on delete cascade,
  -- Desnormalizado a propósito: la política de RLS es
  -- `usuario_id = auth.uid()` y así no necesita un JOIN por fila.
  usuario_id         uuid   not null references public.usuarios(id) on delete cascade,
  licitacion_id      bigint not null references public.licitaciones_cache(id) on delete cascade,
  codigo_externo     text   not null,

  -- Foto del cruce en el momento de detectarlo. Se guarda en vez de
  -- recalcularse porque el usuario tiene que poder entender por qué le
  -- llegó ESE correo, aunque después cambie su perfil.
  similitud          real        not null default 0,
  motivos            text[]      not null default '{}',
  semaforo_al_detectar text,

  detectada_en       timestamptz not null default now(),
  notificada_en      timestamptz,
  canal_notificacion text,

  -- Interacción del usuario: alimenta el ranking y mide si el producto sirve.
  vista_en           timestamptz,
  guardada           boolean     not null default false,
  descartada_en      timestamptz,

  constraint coincidencias_unica unique (preferencia_id, licitacion_id)
);

comment on table public.coincidencias is
  'Resultado materializado del cruce. El dashboard lee de acá, no de oportunidades_de().';
comment on column public.coincidencias.notificada_en is
  'NULL = pendiente de enviar. Es la cola del despachador y la garantía de no reenviar.';

-- Listado del dashboard: "mis coincidencias, lo más nuevo primero".
create index if not exists coincidencias_usuario_idx
  on public.coincidencias (usuario_id, detectada_en desc);

-- Cola de envío. Índice parcial: lo pendiente es una fracción mínima.
create index if not exists coincidencias_pendientes_idx
  on public.coincidencias (preferencia_id, detectada_en)
  where notificada_en is null;

create index if not exists coincidencias_licitacion_idx
  on public.coincidencias (licitacion_id);

alter table public.coincidencias enable row level security;
alter table public.coincidencias force row level security;

drop policy if exists coincidencias_leer   on public.coincidencias;
drop policy if exists coincidencias_marcar on public.coincidencias;

create policy coincidencias_leer on public.coincidencias
  for select to authenticated
  using ((select auth.uid()) = usuario_id);

-- El usuario puede marcar vista/guardada/descartada. No puede insertar ni
-- borrar: eso lo hace el motor con service_role.
create policy coincidencias_marcar on public.coincidencias
  for update to authenticated
  using      ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

revoke all on public.coincidencias from anon;


-- ---------------------------------------------------------------------
-- El paso que corre el cron, una vez por perfil activo.
-- ---------------------------------------------------------------------
-- SECURITY DEFINER porque escribe en una tabla sin policy de INSERT, y
-- se limita a sí misma verificando el dueño de la preferencia: quien la
-- llame solo puede materializar perfiles propios (service_role, que es
-- quien la usa en el cron, no tiene dueño y pasa igual).
--
-- `on conflict do nothing`: si el perfil se recalcula, lo ya detectado no
-- se duplica ni se vuelve a marcar como no notificado. Es lo que evita el
-- reenvío diario de la misma licitación.

create or replace function public.materializar_coincidencias(p_preferencia uuid)
returns integer
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_usuario uuid;
  v_nuevas  integer;
begin
  select usuario_id into v_usuario
    from public.preferencias_alerta
   where id = p_preferencia and activa;

  if v_usuario is null then
    return 0;
  end if;

  -- Cortafuegos del SECURITY DEFINER: si hay una sesión de usuario, tiene
  -- que ser el dueño. `auth.uid()` es NULL con service_role, que es el
  -- único caso en que se permite materializar un perfil ajeno.
  if (select auth.uid()) is not null and (select auth.uid()) <> v_usuario then
    raise exception 'No es tu perfil de alerta.' using errcode = 'insufficient_privilege';
  end if;

  with nuevas as (
    insert into public.coincidencias
      (preferencia_id, usuario_id, licitacion_id, codigo_externo,
       similitud, motivos, semaforo_al_detectar)
    select p_preferencia, v_usuario, l.id, o.codigo_externo,
           o.similitud, o.motivos, o.semaforo
      from public.oportunidades_de(p_preferencia, 500) o
      join public.licitaciones_cache l on l.codigo_externo = o.codigo_externo
    on conflict (preferencia_id, licitacion_id) do nothing
    returning 1
  )
  select count(*) into v_nuevas from nuevas;

  return v_nuevas;
end;
$$;

comment on function public.materializar_coincidencias(uuid) is
  'Corre el motor para un perfil y guarda lo nuevo. Idempotente: no reenvía lo ya detectado.';

grant execute on function public.materializar_coincidencias(uuid) to authenticated;
