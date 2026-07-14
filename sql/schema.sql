-- ============================================================
-- LIENZO COLAGE — GLITCH ART
-- Script de inicializacion para Supabase (Postgres)
-- Ejecutar completo en: Supabase Dashboard > SQL Editor > New query
--
-- Este script es IDEMPOTENTE: se puede correr las veces que sea
-- necesario sin errores, aunque ya hayas ejecutado una version
-- anterior (usa "drop policy if exists" antes de cada politica).
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Tabla: tableros
-- ------------------------------------------------------------
create table if not exists public.tableros (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  modo text not null default 'collage' check (modo in ('collage', 'album', 'timeline', 'presentacion', 'constelacion', 'dibujo')),
  tema_visual text not null default 'minimal' check (tema_visual in ('neon', 'scrapbook', 'pastel', 'minimal')),
  fecha_revelacion timestamptz,
  dedicatoria text,
  dibujo_url text,
  fondo_ia_url text,
  created_at timestamptz not null default now()
);

-- Si la tabla ya existia de una version anterior, agrega las columnas:
alter table public.tableros add column if not exists modo text not null default 'collage';
alter table public.tableros add column if not exists tema_visual text not null default 'minimal';
alter table public.tableros add column if not exists fecha_revelacion timestamptz;
alter table public.tableros add column if not exists dedicatoria text;
alter table public.tableros add column if not exists dibujo_url text;
alter table public.tableros add column if not exists fondo_ia_url text;

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'tableros_modo_check') then
    alter table public.tableros drop constraint tableros_modo_check;
  end if;
  alter table public.tableros
    add constraint tableros_modo_check check (modo in ('collage', 'album', 'timeline', 'presentacion', 'constelacion', 'dibujo'));

  if exists (select 1 from pg_constraint where conname = 'tableros_tema_check') then
    alter table public.tableros drop constraint tableros_tema_check;
  end if;
  alter table public.tableros
    add constraint tableros_tema_check check (tema_visual in ('neon', 'scrapbook', 'pastel', 'minimal'));
end $$;

-- ------------------------------------------------------------
-- Tabla: stickers
-- ------------------------------------------------------------
create table if not exists public.stickers (
  id uuid primary key default gen_random_uuid(),
  tablero_id uuid not null references public.tableros (id) on delete cascade,
  tipo text not null default 'imagen' check (tipo in ('imagen', 'texto')),
  image_url text not null,
  x double precision not null default 0,
  y double precision not null default 0,
  rotation double precision not null default 0,
  scale double precision not null default 1,
  filter_type text not null default 'raw' check (filter_type in ('raw', 'hackeado', 'duotone')),
  z_index integer not null default 1,
  dominant_color text,
  palette text[],
  texto text,
  color_fondo text,
  fuente text,
  favorito boolean not null default false,
  created_at timestamptz not null default now()
);

-- Si la tabla ya existia de una version anterior, agrega las columnas:
alter table public.stickers add column if not exists dominant_color text;
alter table public.stickers add column if not exists palette text[];
alter table public.stickers add column if not exists tipo text not null default 'imagen';
alter table public.stickers add column if not exists texto text;
alter table public.stickers add column if not exists color_fondo text;
alter table public.stickers add column if not exists fuente text;
alter table public.stickers add column if not exists favorito boolean not null default false;

-- Si la restriccion de tipo no existe todavia (proyectos ya creados), agregala:
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'stickers_tipo_check'
  ) then
    alter table public.stickers
      add constraint stickers_tipo_check check (tipo in ('imagen', 'texto'));
  end if;
end $$;

create index if not exists idx_stickers_tablero_id on public.stickers (tablero_id);

-- ------------------------------------------------------------
-- Row Level Security (capa gratuita, acceso publico de demo)
-- ------------------------------------------------------------
alter table public.tableros enable row level security;
alter table public.stickers enable row level security;

drop policy if exists "tableros_select_publico" on public.tableros;
create policy "tableros_select_publico" on public.tableros
  for select using (true);

drop policy if exists "tableros_insert_publico" on public.tableros;
create policy "tableros_insert_publico" on public.tableros
  for insert with check (true);

drop policy if exists "stickers_select_publico" on public.stickers;
create policy "stickers_select_publico" on public.stickers
  for select using (true);

drop policy if exists "stickers_insert_publico" on public.stickers;
create policy "stickers_insert_publico" on public.stickers
  for insert with check (true);

drop policy if exists "stickers_update_publico" on public.stickers;
create policy "stickers_update_publico" on public.stickers
  for update using (true);

drop policy if exists "stickers_delete_publico" on public.stickers;
create policy "stickers_delete_publico" on public.stickers
  for delete using (true);

-- ------------------------------------------------------------
-- Politicas de Storage para el bucket "imagenes_stickers"
--
-- Importante: marcar un bucket como "Public" en el dashboard solo
-- habilita la LECTURA publica. Subir archivos (insert) sigue
-- requiriendo estas politicas explicitas sobre storage.objects.
-- ------------------------------------------------------------
drop policy if exists "imagenes_stickers_select_publico" on storage.objects;
create policy "imagenes_stickers_select_publico"
on storage.objects for select
to public
using ( bucket_id = 'imagenes_stickers' );

drop policy if exists "imagenes_stickers_insert_publico" on storage.objects;
create policy "imagenes_stickers_insert_publico"
on storage.objects for insert
to public
with check ( bucket_id = 'imagenes_stickers' );

drop policy if exists "imagenes_stickers_update_publico" on storage.objects;
create policy "imagenes_stickers_update_publico"
on storage.objects for update
to public
using ( bucket_id = 'imagenes_stickers' );

drop policy if exists "imagenes_stickers_delete_publico" on storage.objects;
create policy "imagenes_stickers_delete_publico"
on storage.objects for delete
to public
using ( bucket_id = 'imagenes_stickers' );

-- ============================================================
-- ⚠️ RECORDATORIO MANUAL (no se puede hacer por SQL):
-- Ve a Supabase > Storage > Create a new bucket
--   Nombre exacto:  imagenes_stickers
--   Marca la opcion "Public bucket" = ON
-- ============================================================
