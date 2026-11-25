-- Mi Gordólogo — Auth v2 (Supabase Auth + aprobación)
-- Ejecutar en SQL Editor de Supabase DESPUÉS de schema.sql / schema_users.sql.
-- Auth es gratuito en el plan Free. Los emails de producción requieren SMTP (p. ej. Resend free).

-- 1) Columnas de identidad / estado
alter table public.app_users
  alter column password_salt drop not null;

alter table public.app_users
  alter column password_hash drop not null;

alter table public.app_users
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;

alter table public.app_users
  add column if not exists email text;

alter table public.app_users
  add column if not exists status text not null default 'pending';

-- Contraseña visible en Perfil/Superadmin (app familiar). Auth sigue con hash de Supabase.
alter table public.app_users
  add column if not exists known_password text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'app_users_status_check'
  ) then
    alter table public.app_users
      add constraint app_users_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create unique index if not exists app_users_email_unique
  on public.app_users (lower(email))
  where email is not null and length(trim(email)) > 0;

-- Legacy sin Auth: NO auto-aprobar (si no, bloquea bootstrapAdmin).
-- Quedan pending hasta vincular con Auth o crear el primer admin por email.
update public.app_users
set status = 'pending'
where auth_user_id is null;

-- 2) Impersonación (Pepe abre otros perfiles) — sin contraseñas en claro
create table if not exists public.app_acting (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  acting_user_id text not null references public.app_users(id) on delete cascade,
  updated_at timestamptz not null default now()
);

alter table public.app_acting enable row level security;
grant all on table public.app_acting to postgres, service_role;

-- 3) Trigger: al registrarse en Auth → perfil app pending
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
  new_id text;
begin
  display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(coalesce(new.email, 'usuario'), '@', 1),
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
    lower(trim(coalesce(new.email, ''))),
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

-- 4) Helper opcional: vincular Auth a Pepe / María (ejecutar a mano tras crear el usuario en Auth)
-- select public.link_app_user_to_auth('pepe', 'UUID-DEL-AUTH-USER', 'tu@email.com', 'approved', 'superadmin');
create or replace function public.link_app_user_to_auth(
  p_app_user_id text,
  p_auth_user_id uuid,
  p_email text,
  p_status text default 'approved',
  p_role text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.app_users
  set
    auth_user_id = p_auth_user_id,
    email = lower(trim(p_email)),
    status = coalesce(p_status, status),
    role = coalesce(p_role, role),
    updated_at = now()
  where id = p_app_user_id;

  if not found then
    raise exception 'app_user % no existe', p_app_user_id;
  end if;

  -- Evita duplicado del trigger si el Auth user ya creó usr_...
  delete from public.app_users
  where auth_user_id = p_auth_user_id
    and id <> p_app_user_id;
end;
$$;

grant execute on function public.link_app_user_to_auth(text, uuid, text, text, text) to service_role;
