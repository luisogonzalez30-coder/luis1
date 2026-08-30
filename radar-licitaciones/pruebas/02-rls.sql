-- Supabase concede estos grants por default privileges; los replico para probar RLS.
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
revoke all on public.usuarios, public.preferencias_alerta,
              public.licitaciones_cache, public.historial_compradores from anon;

-- ===== Como usuario 1 =====
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select 'u1_ve_usuarios' as caso, count(*) as filas from public.usuarios;
select 'u1_ve_preferencias' as caso, count(*) from public.preferencias_alerta;
select 'u1_ve_licitaciones' as caso, count(*) from public.licitaciones_cache;

-- ===== Como usuario 2: no debe ver nada del 1 =====
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select 'u2_ve_usuarios' as caso, count(*) from public.usuarios;
select 'u2_ve_preferencias_de_u1' as caso, count(*) from public.preferencias_alerta;
select 'u2_llama_motor_con_pref_ajena' as caso, count(*)
  from public.oportunidades_de('aaaaaaaa-0000-0000-0000-000000000001');

do $$ begin
  update public.usuarios set plan='agencia' where id='11111111-1111-1111-1111-111111111111';
  if found then raise exception 'FALLO: u2 modificó el plan de u1'; end if;
  raise notice 'OK: u2 no puede tocar la fila de u1';
end $$;

do $$ begin
  insert into public.preferencias_alerta (usuario_id, nombre, palabras_clave)
  values ('11111111-1111-1111-1111-111111111111','Robada', array['x']);
  raise exception 'FALLO: u2 creó una preferencia a nombre de u1';
exception when insufficient_privilege then
  raise notice 'OK: RLS bloqueó la preferencia a nombre ajeno';
end $$;

do $$ begin
  insert into public.licitaciones_cache (codigo_externo, nombre, data_cruda)
  values ('HACK-1','inyectada','{}'::jsonb);
  raise exception 'FALLO: un usuario escribió en licitaciones_cache';
exception when insufficient_privilege then
  raise notice 'OK: solo el backend (service_role) escribe el cache';
end $$;

-- ===== Suscripción cancelada: pierde acceso al dato ===== 
reset role;
update public.usuarios set estado_suscripcion='cancelada'
 where id='22222222-2222-2222-2222-222222222222';
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select 'u2_cancelado_ve_licitaciones' as caso, count(*) from public.licitaciones_cache;

-- ===== Visitante sin sesión =====
reset role; set role anon;
do $$ begin
  perform count(*) from public.licitaciones_cache;
  raise exception 'FALLO: anon leyó el cache';
exception when insufficient_privilege then
  raise notice 'OK: anon no tiene permiso ni de intentarlo';
end $$;
reset role;
