alter table public.resenas
add column if not exists tags text not null default '';
