-- Mi Gordólogo — esquema mínimo gratis (Supabase Free)
-- 1) Crea un proyecto en https://supabase.com (gratis)
-- 2) SQL Editor → pega y ejecuta este archivo
-- 3) Project Settings → API → copia URL y anon key a .env / GitHub Secrets

create table if not exists public.family_snapshots (
  family_key text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.family_snapshots enable row level security;

-- Acceso anon con clave familiar (proyecto privado de uso familiar).
-- Quien conozca family_key puede leer/escribir ese snapshot.
drop policy if exists "family_select" on public.family_snapshots;
drop policy if exists "family_upsert" on public.family_snapshots;

create policy "family_select" on public.family_snapshots
  for select to anon, authenticated
  using (true);

create policy "family_upsert" on public.family_snapshots
  for insert to anon, authenticated
  with check (true);

create policy "family_update" on public.family_snapshots
  for update to anon, authenticated
  using (true)
  with check (true);
