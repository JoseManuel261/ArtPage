-- ============================================================
-- STICKER BOMB DIGITAL — LIENZO COLAGE / GLITCH ART
-- Script de inicializacion para Supabase (Postgres)
-- Ejecutar completo en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- Extension necesaria para generar UUIDs
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Tabla: tableros
-- ------------------------------------------------------------
create table if not exists public.tableros (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Tabla: stickers
-- ------------------------------------------------------------
create table if not exists public.stickers (
  id uuid primary key default gen_random_uuid(),
  tablero_id uuid not null references public.tableros (id) on delete cascade,
  image_url text not null,
  x double precision not null default 0,
  y double precision not null default 0,
  rotation double precision not null default 0,
  scale double precision not null default 1,
  filter_type text not null default 'raw' check (filter_type in ('raw', 'hackeado', 'duotone')),
  z_index integer not null default 1,
  -- Color dominante detectado en el navegador (analisis de pixeles,
  -- 100% client-side y gratis) para que el lienzo adapte su paleta
  -- ambiental al contenido que se sube.
  dominant_color text,
  created_at timestamptz not null default now()
);

-- Si la tabla ya existia de una version anterior, agrega la columna:
alter table public.stickers add column if not exists dominant_color text;

-- Indice para acelerar la carga de stickers por tablero
create index if not exists idx_stickers_tablero_id on public.stickers (tablero_id);

-- ------------------------------------------------------------
-- Row Level Security (capa gratuita, acceso publico de demo)
-- Ajusta estas politicas si mas adelante agregas autenticacion.
-- ------------------------------------------------------------
alter table public.tableros enable row level security;
alter table public.stickers enable row level security;

create policy "tableros_select_publico" on public.tableros
  for select using (true);
create policy "tableros_insert_publico" on public.tableros
  for insert with check (true);

create policy "stickers_select_publico" on public.stickers
  for select using (true);
create policy "stickers_insert_publico" on public.stickers
  for insert with check (true);
create policy "stickers_update_publico" on public.stickers
  for update using (true);
create policy "stickers_delete_publico" on public.stickers
  for delete using (true);

-- ------------------------------------------------------------
-- Politicas de Storage para el bucket "imagenes_stickers"
--
-- Importante: marcar un bucket como "Public" en el dashboard solo
-- habilita la LECTURA publica. Subir archivos (insert) sigue
-- requiriendo estas politicas explicitas sobre storage.objects.
-- ------------------------------------------------------------
create policy "imagenes_stickers_select_publico"
on storage.objects for select
to public
using ( bucket_id = 'imagenes_stickers' );

create policy "imagenes_stickers_insert_publico"
on storage.objects for insert
to public
with check ( bucket_id = 'imagenes_stickers' );

create policy "imagenes_stickers_update_publico"
on storage.objects for update
to public
using ( bucket_id = 'imagenes_stickers' );

create policy "imagenes_stickers_delete_publico"
on storage.objects for delete
to public
using ( bucket_id = 'imagenes_stickers' );

-- ============================================================
-- ⚠️ RECORDATORIO MANUAL (no se puede hacer por SQL):
-- Ve a Supabase > Storage > Create a new bucket
--   Nombre exacto:  imagenes_stickers
--   Marca la opcion "Public bucket" = ON
-- Esto permite que las imagenes subidas tengan una URL publica
-- directa que se guarda en la columna stickers.image_url
-- ============================================================
