-- ============================================================
-- STICKER BOMB DIGITAL — DEDSEC EDITION
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
  created_at timestamptz not null default now()
);

-- Indice para acelerar la carga de stickers por tablero
create index if not exists idx_stickers_tablero_id on public.stickers (tablero_id);

-- ------------------------------------------------------------
-- Row Level Security (capa gratuita, acceso publico de demo)
-- Ajusta estas politicas si mas adelante agregas autenticacion.
--
-- Nota sobre las nuevas API keys de Supabase: la "publishable key"
-- (sb_publishable_...) se autentica ante Postgres exactamente con el
-- mismo rol "anon" que antes usaba la vieja "anon key" (JWT). Estas
-- politicas no cambian ni dependen de que uses la clave legacy o la
-- nueva: en ambos casos las peticiones desde el navegador llegan
-- como rol "anon".
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

-- ============================================================
-- ⚠️ RECORDATORIO MANUAL (no se puede hacer por SQL):
-- Ve a Supabase > Storage > Create a new bucket
--   Nombre exacto:  imagenes_stickers
--   Marca la opcion "Public bucket" = ON
-- Esto permite que las imagenes subidas tengan una URL publica
-- directa que se guarda en la columna stickers.image_url
-- ============================================================
