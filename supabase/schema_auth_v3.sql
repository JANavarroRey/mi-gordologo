-- Mi Gordólogo — Auth v3 (Aprobación estricta, bóveda cifrada AES-256-GCM, OTP de recuperación y cierre RLS)
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de schema.sql y schema_auth_v2.sql.
-- Idempotente: puede ejecutarse varias veces sin pérdida de datos.

-- =====================================================================
-- 1) Columnas de correo SMTP (cifrado) en public.app_admin
-- =====================================================================
alter table public.app_admin
  add column if not exists mail_smtp_user text;

alter table public.app_admin
  add column if not exists mail_smtp_pass text;

alter table public.app_admin
  add column if not exists mail_smtp_pass_enc text;

alter table public.app_admin
  add column if not exists mail_from_name text default 'Mi Gordólogo';

alter table public.app_admin
  add column if not exists mail_provider text default 'gmail_smtp';

-- =====================================================================
-- 2) Columna de bóveda cifrada en public.app_users
-- =====================================================================
alter table public.app_users
  add column if not exists password_enc text;

alter table public.app_users
  add column if not exists known_password text;

-- Sincronizar email desde auth.users si faltaba en alguna fila vinculada
update public.app_users u
set email = lower(trim(a.email)),
    updated_at = now()
from auth.users a
where u.auth_user_id = a.id
  and (u.email is null or length(trim(u.email)) = 0)
  and a.email is not null;

-- Garantizar que jose.navarrorey@gmail.com sea el único superadmin aprobado
-- (solo degrada otros superadmin si la cuenta del admin oficial ya existe).
do $$
begin
  if exists (
    select 1
    from public.app_users
    where lower(trim(coalesce(email, ''))) = 'jose.navarrorey@gmail.com'
      and auth_user_id is not null
  ) then
    update public.app_users
    set role = 'superadmin',
        status = 'approved',
        updated_at = now()
    where lower(trim(coalesce(email, ''))) = 'jose.navarrorey@gmail.com';

    update public.app_users
    set role = 'member',
        updated_at = now()
    where role = 'superadmin'
      and lower(trim(coalesce(email, ''))) <> 'jose.navarrorey@gmail.com';
  end if;
end $$;

-- =====================================================================
-- 3) Códigos OTP de recuperación de contraseña (inmune a Hotmail Safe Links)
-- =====================================================================
create table if not exists public.password_reset_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_password_reset_codes_email_created
  on public.password_reset_codes (lower(email), created_at desc);

alter table public.password_reset_codes enable row level security;
revoke all on table public.password_reset_codes from anon, authenticated;
grant all on table public.password_reset_codes to postgres, service_role;

-- =====================================================================
-- 4) Control de tasa (rate limiting) para registro público y recuperación
-- =====================================================================
create table if not exists public.auth_rate_limits (
  id bigserial primary key,
  action text not null,
  scope_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_rate_limits_lookup
  on public.auth_rate_limits (action, scope_key, created_at desc);

alter table public.auth_rate_limits enable row level security;
revoke all on table public.auth_rate_limits from anon, authenticated;
grant all on table public.auth_rate_limits to postgres, service_role;

-- =====================================================================
-- 5) Cierre de fuga RLS en tabla legacy public.family_snapshots
-- =====================================================================
do $$
begin
  if to_regclass('public.family_snapshots') is not null then
    alter table public.family_snapshots enable row level security;
    drop policy if exists "family_select" on public.family_snapshots;
    drop policy if exists "family_upsert" on public.family_snapshots;
    drop policy if exists "family_update" on public.family_snapshots;
    revoke all on table public.family_snapshots from anon, authenticated;
    grant all on table public.family_snapshots to postgres, service_role;
  end if;
end $$;

-- =====================================================================
-- 6) Defensa en profundidad: revocar permisos directos a anon/authenticated
-- =====================================================================
revoke all on table public.app_admin from anon, authenticated;
revoke all on table public.admin_sessions from anon, authenticated;
revoke all on table public.app_users from anon, authenticated;
revoke all on table public.user_sessions from anon, authenticated;
revoke all on table public.user_menus from anon, authenticated;
revoke all on table public.user_measurements from anon, authenticated;
revoke all on table public.app_acting from anon, authenticated;

-- =====================================================================
-- 7) Trigger de alta endurecido: SIEMPRE member + pending
-- =====================================================================
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
  new_id text;
  clean_email text;
begin
  clean_email := lower(trim(coalesce(new.email, '')));
  display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(clean_email, '@', 1), ''),
    'Usuario'
  );
  new_id := 'usr_' || replace(new.id::text, '-', '');

  insert into public.app_users (
    id,
    name,
    role,
    email,
    auth_user_id,
    status,
    age,
    height,
    target_calories,
    settings,
    created_at,
    updated_at
  ) values (
    new_id,
    display_name,
    'member',
    clean_email,
    new.id,
    'pending',
    coalesce((new.raw_user_meta_data ->> 'age')::int, 0),
    coalesce((new.raw_user_meta_data ->> 'height')::int, 0),
    1500,
    jsonb_build_object(
      'servings', 1,
      'freeDay', 5,
      'freeDayEnabled', false,
      'weighInDay', 4
    ),
    now(),
    now()
  )
  on conflict (auth_user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();

-- =====================================================================
-- 8) Cerrar permisos EXECUTE de funciones SECURITY DEFINER para anon/authenticated
-- =====================================================================
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
grant execute on function public.handle_new_auth_user() to postgres, service_role;

do $$
begin
  if to_regprocedure('public.link_app_user_to_auth(text,uuid,text,text,text)') is not null then
    revoke execute on function public.link_app_user_to_auth(text, uuid, text, text, text) from public, anon, authenticated;
    grant execute on function public.link_app_user_to_auth(text, uuid, text, text, text) to postgres, service_role;
  end if;
end $$;

create or replace function public.link_app_user_to_auth(
  p_app_user_id text,
  p_auth_user_id uuid,
  p_email text,
  p_status text default 'approved',
  p_role text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception 'forbidden: legacy helper disabled' using errcode = '42501';
end;
$$;
