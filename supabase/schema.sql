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

-- Cuentas de familia (Pepe + María + perfiles nuevos). Sin políticas anon:
-- solo la Edge Function con service_role lee/escribe.
create table if not exists public.app_users (
  id text primary key,
  name text not null,
  role text not null check (role in ('superadmin', 'member')),
  password_salt text not null,
  password_hash text not null,
  age integer not null default 0,
  height integer not null default 0,
  target_calories integer not null default 1500,
  gender text,
  activity_level text,
  goal text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_sessions (
  token text primary key,
  user_id text not null references public.app_users(id) on delete cascade,
  acting_user_id text not null references public.app_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_menus (
  user_id text primary key references public.app_users(id) on delete cascade,
  weeks jsonb not null,
  edited boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_measurements (
  user_id text primary key references public.app_users(id) on delete cascade,
  payload jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_users enable row level security;
alter table public.user_sessions enable row level security;
alter table public.user_menus enable row level security;
alter table public.user_measurements enable row level security;

-- La Edge Function usa service_role (bypassa RLS). Sin GRANT, Postgres responde
-- "permission denied for table app_users" al crear las cuentas.
grant usage on schema public to postgres, service_role, anon, authenticated;
grant all on table public.app_admin to postgres, service_role;
grant all on table public.admin_sessions to postgres, service_role;
grant all on table public.app_users to postgres, service_role;
grant all on table public.user_sessions to postgres, service_role;
grant all on table public.user_menus to postgres, service_role;
grant all on table public.user_measurements to postgres, service_role;
