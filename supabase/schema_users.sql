-- Ejecutar en SQL Editor de Supabase si el proyecto ya existía
-- (también está al final de schema.sql).

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
