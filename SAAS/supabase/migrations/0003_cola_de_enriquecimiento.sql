-- =====================================================================
-- Radar de Licitaciones — priorización de la cola de fichas
--
-- El problema que resuelve, en números: cada ficha completa cuesta 1
-- petición de las 10.000 diarias y ~7 segundos reales. Un día cualquiera
-- de Mercado Público publica cientos de licitaciones. Pedir la ficha de
-- todas no es caro: es imposible — no alcanza el tiempo, no la cuota.
--
-- La salida es no pedirlas todas. El listado diario ya trae el NOMBRE
-- gratis, y con el nombre alcanza para descartar la enorme mayoría: si una
-- licitación no le pega a ninguna preferencia activa de ningún usuario, su
-- ficha no le sirve a nadie.
--
-- Entre las que sí sirven, el orden es por fecha de cierre: una ficha que
-- llega después del cierre no vale nada, por muy buena que fuera.
-- =====================================================================

create or replace function public.licitaciones_por_enriquecer(p_max integer default 200)
returns table (codigo_externo text, fecha_cierre timestamptz, interesados integer)
language sql
stable
security definer          -- lee las preferencias de TODOS los usuarios para
set search_path = public, extensions   -- decidir la cola; no devuelve ningún
as $$                                  -- dato de usuario, solo códigos públicos
  with patrones as (
    -- Todas las palabras clave de todos los perfiles activos, sin repetir.
    -- Son pocas comparadas con las licitaciones, así que el conjunto cabe
    -- de sobra en memoria.
    select distinct '%' || public.normalizar_texto(k) || '%' as patron
      from public.preferencias_alerta p,
           unnest(p.palabras_clave) k
     where p.activa and btrim(k) <> ''
  )
  select l.codigo_externo,
         l.fecha_cierre,
         1 as interesados
    from public.licitaciones_cache l
   where l.detalle_cargado = false
     and l.codigo_estado = 5
     and l.fecha_cierre > now()
     -- `LIKE ANY` sobre un arreglo sí baja al índice GIN de trigramas.
     -- Acá se usa solo la coincidencia exacta, no la difusa: en esta etapa
     -- se está decidiendo en qué gastar la cuota, y conviene pecar de
     -- tacaño. Lo difuso se aplica después, con la ficha ya en la base.
     and l.busqueda like any (array(select patron from patrones))
   order by l.fecha_cierre asc
   limit greatest(p_max, 1);
$$;

comment on function public.licitaciones_por_enriquecer(integer) is
  'Cola de fichas por pedir, priorizada por cierre. Solo lo que le pega a alguna preferencia activa.';

-- No se concede a `authenticated`: es SECURITY DEFINER y lee las preferencias
-- de toda la base.
--
-- El `grant` de abajo no es decorativo. Postgres concede EXECUTE a PUBLIC en
-- toda función nueva, así que revocarlo de PUBLIC se lo quita TAMBIÉN a
-- `service_role`, que es justo quien la necesita. Sin esta línea la ingesta
-- falla con "permission denied for function" — y no en la migración, sino
-- de madrugada, en la primera corrida del cron.
revoke all on function public.licitaciones_por_enriquecer(integer) from public, anon, authenticated;
grant execute on function public.licitaciones_por_enriquecer(integer) to service_role;
