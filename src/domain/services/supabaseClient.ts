import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

function getEnv() {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
  const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';
  return { url, anon };
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const { url, anon } = getEnv();
  if (!url || !anon) return null;
  if (!client) {
    client = createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    });
  }
  return client;
}

export function isSupabaseConfigured(): boolean {
  const { url, anon } = getEnv();
  return Boolean(url && anon);
}

export async function getAccessToken(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function getSession(): Promise<Session | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session;
}

/** URL pública de la app (evitar localhost en emails de recuperación). */
export const PUBLIC_APP_URL = 'https://janavarrorey.github.io/mi-gordologo';

/** Base URL de la SPA (GitHub Pages / local) para redirects de Auth. */
export function authRedirectBase(): string {
  if (typeof window === 'undefined') return PUBLIC_APP_URL;
  const { origin, pathname } = window.location;
  if (/localhost|127\.0\.0\.1/i.test(origin)) return PUBLIC_APP_URL;
  // pathname en Pages suele ser /repo/ o /
  return `${origin}${pathname.replace(/\/$/, '') || ''}`;
}

export function passwordResetRedirectUrl(): string {
  return `${authRedirectBase()}/#/restablecer-clave`;
}
