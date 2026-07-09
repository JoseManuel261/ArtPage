-- ============================================================
-- RESET DEFINITIVO — LIENZO COLAGE
-- ============================================================
-- Este script BORRA todo lo anterior (tablas, politicas, storage)
-- y reconstruye la base de datos completa desde cero, exactamente
-- como la necesita la version actual del codigo.
--
-- Usalo si:
-- - No estas seguro de que columnas/politicas ya tienes aplicadas
-- - Corriste varias versiones del schema.sql en distinto orden
-- - Quieres empezar limpio sin dudas
--
-- ⚠️ ADVERTENCIA: esto borra TODOS los tableros y stickers que ya
-- hayas guardado. Si quieres conservarlos, avisame antes de correr
-- esto y hacemos un respaldo primero.
--
-- Ejecutar completo en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- ------------------------------------------------------------
-- 1) Borrar todo lo anterior
-- ------------------------------------------------------------
drop table if exists public.stickers cascade;
drop table if exists public.tableros cascade;

-- Borrar politicas de storage anteriores (si existian con estos nombres)
drop policy if exists "imagenes_stickers_select_publico" on storage.objects;
drop policy if exists "imagenes_stickers_insert_publico" on storage.objects;
drop policy if exists "imagenes_stickers_update_publico" on storage.objects;
drop policy if exists "imagenes_stickers_delete_publico" on storage.objects;

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 2) Tabla: tableros
-- ------------------------------------------------------------
create table public.tableros (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  modo text not null default 'collage'
    check (modo in ('collage', 'album', 'timeline', 'presentacion', 'constelacion')),
  tema_visual text not null default 'neon'
    check (tema_visual in ('neon', 'scrapbook', 'pastel', 'minimal')),
  fecha_revelacion timestamptz,
  dedicatoria text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3) Tabla: stickers
-- ------------------------------------------------------------
create table public.stickers (
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

create index idx_stickers_tablero_id on public.stickers (tablero_id);

-- ------------------------------------------------------------
-- 4) Row Level Security (capa gratuita, acceso publico de demo)
-- ------------------------------------------------------------
alter table public.tableros enable row level security;
alter table public.stickers enable row level security;

create policy "tableros_select_publico" on public.tableros for select using (true);
create policy "tableros_insert_publico" on public.tableros for insert with check (true);
create policy "tableros_update_publico" on public.tableros for update using (true);
create policy "tableros_delete_publico" on public.tableros for delete using (true);

create policy "stickers_select_publico" on public.stickers for select using (true);
create policy "stickers_insert_publico" on public.stickers for insert with check (true);
create policy "stickers_update_publico" on public.stickers for update using (true);
create policy "stickers_delete_publico" on public.stickers for delete using (true);

-- ------------------------------------------------------------
-- 5) Politicas de Storage para el bucket "imagenes_stickers"
-- ------------------------------------------------------------
create policy "imagenes_stickers_select_publico"
on storage.objects for select to public
using ( bucket_id = 'imagenes_stickers' );

create policy "imagenes_stickers_insert_publico"
on storage.objects for insert to public
with check ( bucket_id = 'imagenes_stickers' );

create policy "imagenes_stickers_update_publico"
on storage.objects for update to public
using ( bucket_id = 'imagenes_stickers' );

create policy "imagenes_stickers_delete_publico"
on storage.objects for delete to public
using ( bucket_id = 'imagenes_stickers' );

