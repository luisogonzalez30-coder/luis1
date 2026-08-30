\set ON_ERROR_STOP on
-- ============ 1. RUT módulo 11 ============
select 'rut' as caso,
       public.rut_valido('76.086.428-5') as valido_con_puntos,
       public.rut_valido('760864285')    as valido_sin_formato,
       public.rut_valido('76.086.428-4') as dv_incorrecto,
       public.normalizar_rut('76.086.428-5') as canonico;

-- ============ 2. Alta por trigger sobre auth.users ============
insert into auth.users (id, email, raw_user_meta_data)
values ('11111111-1111-1111-1111-111111111111', 'Pyme@Ejemplo.CL', '{"nombre_contacto":"Ana"}'),
       ('22222222-2222-2222-2222-222222222222', 'otra@ejemplo.cl', '{}');
select 'perfil_auto' as caso, id, email, nombre_contacto, plan, max_preferencias from public.usuarios order by email;

-- ============ 3. RUT inválido rechazado por la base ============
do $$ begin
  update public.usuarios set rut_empresa = '76.086.428-4'
   where id = '11111111-1111-1111-1111-111111111111';
  raise exception 'FALLO: aceptó un RUT con DV malo';
exception when check_violation then
  raise notice 'OK: la base rechazó el RUT inválido';
end $$;

update public.usuarios set rut_empresa = '76086428-5', razon_social = 'Pyme Ejemplo SpA'
 where id = '11111111-1111-1111-1111-111111111111';

-- ============ 4. Compradores + semáforo generado ============
insert into public.historial_compradores
  (codigo_organismo, nombre_organismo, region, dias_pago_mediana, pct_pagos_sobre_30, ordenes_evaluadas, fuente)
values
  ('7001', 'I. Municipalidad de Licantén',    'Maule',        22, 10, 40, 'reporte_usuario'),
  ('7002', 'Servicio de Salud del Maule',     'Maule',        48, 35, 60, 'dipres'),
  ('7003', 'Gobierno Regional de Ñuble',      'Ñuble',        95, 71, 30, 'dipres'),
  ('7004', 'Municipalidad de Recién Medida',  'Maule',        12,  0,  2, 'reporte_usuario'),
  ('7005', 'Municipalidad Sin Datos',         'Maule',      null, null,  0, 'sin_datos');
select 'semaforo' as caso, codigo_organismo, dias_pago_mediana, ordenes_evaluadas, semaforo
  from public.historial_compradores order by codigo_organismo;

-- ============ 5. Licitaciones ============
insert into public.licitaciones_cache
 (codigo_externo, nombre, descripcion, codigo_estado, estado, tipo, codigo_organismo, nombre_organismo,
  region, monto_estimado, moneda, fecha_cierre, unspsc, data_cruda, detalle_cargado)
values
 ('1509-12-LE26','Servicio de plataforma web de reporte de incidencias urbanas',
  'Implementación y mantención de software para gestión municipal',5,'Publicada','LE','7001',
  'I. Municipalidad de Licantén','Maule', 900, 'CLF', now()+interval '12 days',
  array['81111500'], '{"CodigoExterno":"1509-12-LE26"}'::jsonb, true),
 ('2239-2-LR26','Convenio Marco Desarrollo de Software y Servicios TI',
  'Catálogo electrónico',5,'Publicada','LR','7002','Servicio de Salud del Maule','Maule',
  50000000,'CLP', now()+interval '30 days', array['81112200'], '{"CodigoExterno":"2239-2-LR26"}'::jsonb, true),
 ('3300-1-L126','Adquisicion de plataforma wb para reportes ciudadanos',   -- typo a propósito
  null,5,'Publicada','L1','7003','Gobierno Regional de Ñuble','Ñuble',
  4000000,'CLP', now()+interval '5 days', '{}', '{"CodigoExterno":"3300-1-L126"}'::jsonb, true),
 ('4400-9-LP26','Adquisición de equipos computacionales y cableado estructurado',
  'Notebooks y switches',5,'Publicada','LP','7001','I. Municipalidad de Licantén','Maule',
  30000000,'CLP', now()+interval '18 days', array['43211500'], '{"CodigoExterno":"4400-9-LP26"}'::jsonb, true),
 ('5500-3-LE26','Software de atención ciudadana',null,6,'Cerrada','LE','7001',
  'I. Municipalidad de Licantén','Maule',5000000,'CLP', now()-interval '2 days','{}',
  '{"CodigoExterno":"5500-3-LE26"}'::jsonb, true);

select 'columna_generada' as caso, codigo_externo, busqueda from public.licitaciones_cache order by codigo_externo limit 3;

-- ============ 6. Preferencia sin criterio: rechazada ============
do $$ begin
  insert into public.preferencias_alerta (usuario_id, nombre) values
    ('11111111-1111-1111-1111-111111111111','Todo');
  raise exception 'FALLO: aceptó una preferencia sin ningún criterio';
exception when check_violation then
  raise notice 'OK: la base rechazó la preferencia sin criterio (mandaría todo el diario)';
end $$;

insert into public.preferencias_alerta
  (id, usuario_id, nombre, palabras_clave, palabras_excluidas, codigos_unspsc, regiones, umbral_similitud)
values ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',
        'Software municipal', array['plataforma web','reporte de incidencias'],
        array['cableado estructurado'], array['81112200'], '{}', 0.30);
update public.preferencias_alerta set semaforos_aceptados = array['verde','amarillo','rojo','gris'];

-- ============ 7. Tope de perfiles por plan ============
do $$ begin
  insert into public.preferencias_alerta (usuario_id, nombre, palabras_clave)
  values ('11111111-1111-1111-1111-111111111111','Segundo perfil', array['obras']);
  raise exception 'FALLO: se saltó el tope del plan';
exception when check_violation then
  raise notice 'OK: el plan trial tope 1 perfil, bloqueado';
end $$;

-- ============ 8. EL MOTOR ============
select 'motor' as caso, codigo_externo, organismo, semaforo, round(similitud::numeric,2) as sim,
       dias_restantes, moneda, motivos
  from public.oportunidades_de('aaaaaaaa-0000-0000-0000-000000000001');
