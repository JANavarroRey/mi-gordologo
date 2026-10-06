-- Mi Gordólogo — esquema (Supabase Free)
-- 1) Proyecto en https://supabase.com
-- 2) SQL Editor → ejecutar este archivo
-- 3) Deploy de función: npx supabase functions deploy gordologo --project-ref TU_REF
-- 4) Secrets de GitHub Pages: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
-- La clave Gemini NUNCA va en el cliente: solo la guarda el superadmin vía Edge Function.

-- Copia familiar de menús / perfiles (sincronización opcional)
create table if not exists public.family_snapshots (
  family_key text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.family_snapshots enable row level security;

drop policy if exists "family_select" on public.family_snapshots;
drop policy if exists "family_upsert" on public.family_snapshots;
drop policy if exists "family_update" on public.family_snapshots;

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

-- Superadmin + clave Gemini: SIN políticas RLS → el anon key NO puede leer esto.
-- Solo el service_role de la Edge Function accede.
create table if not exists public.app_admin (
  id integer primary key default 1 check (id = 1),
  password_salt text not null,
  password_hash text not null,
  gemini_api_key text,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_sessions (
  token text primary key,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.app_admin enable row level security;
alter table public.admin_sessions enable row level security;
