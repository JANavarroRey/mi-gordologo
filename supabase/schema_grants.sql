grant usage on schema public to postgres, service_role, anon, authenticated;
grant all on table public.app_users to postgres, service_role;
grant all on table public.user_sessions to postgres, service_role;
grant all on table public.user_menus to postgres, service_role;
grant all on table public.user_measurements to postgres, service_role;
