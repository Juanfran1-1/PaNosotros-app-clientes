alter table public.resenas
drop constraint if exists resenas_nombre_requerido;

alter table public.resenas
add constraint resenas_nombre_requerido
check (btrim(nombre) <> '');
