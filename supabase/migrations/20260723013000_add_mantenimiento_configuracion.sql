alter table public.configuracion
    add column if not exists mantenimiento boolean not null default false;

comment on column public.configuracion.mantenimiento is
    'Bloquea la app de clientes y muestra la pantalla de mantenimiento.';

-- El negocio entra en mantenimiento al aplicar esta migración.
update public.configuracion
set mantenimiento = true;
