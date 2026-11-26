import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { json } from './http.ts';
import { decryptSecret, encryptSecret } from './vault.ts';

export const ADMIN_EMAIL = (Deno.env.get('ADMIN_EMAIL') || 'jose.navarrorey@gmail.com')
  .trim()
  .toLowerCase();

export function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${key}`, apikey: key } },
  });
}

export function anonAuthClient() {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type ServiceSupabase = ReturnType<typeof serviceClient>;

export type UserRow = {
  id: string;
  name: string;
  role: string;
  email: string | null;
  auth_user_id: string | null;
  status: string;
  age: number;
  height: number;
  target_calories: number;
  gender: string | null;
  activity_level: string | null;
  goal: string | null;
  settings: Record<string, unknown> | null;
  password_enc?: string | null;
  known_password?: string | null;
  created_at: string;
};

export type AuthContext = {
  authUid: string;
  auth: UserRow;
  acting: UserRow;
  isAdmin: boolean;
};

export function normalizeEmail(raw: unknown): string {
  return String(raw || '')
    .trim()
    .toLowerCase();
}

export function isStrictAdmin(row: UserRow | null | undefined): boolean {
  if (!row) return false;
  return (
    row.role === 'superadmin' &&
    row.status === 'approved' &&
    normalizeEmail(row.email) === ADMIN_EMAIL
  );
}

/** Proyección pública sin contraseñas ni campos sensibles. */
export function publicUser(row: UserRow) {
  const rawSettings = { ...(row.settings || {}) };
  delete rawSettings.passwordRecovery;
  delete rawSettings.knownPassword;
  delete rawSettings.password_enc;

  const normalizedRole = isStrictAdmin(row) ? 'superadmin' : 'member';
  return {
    id: row.id,
    name: row.name,
    role: normalizedRole,
    email: row.email,
    status: row.status || 'pending',
    age: row.age,
    height: row.height,
    targetCalories: row.target_calories,
    gender: row.gender,
    activityLevel: row.activity_level,
    goal: row.goal,
    linkedMenuUserId: null,
    createdAt: row.created_at,
    settings: rawSettings,
  };
}

export async function saveEncryptedPassword(
  sb: ServiceSupabase,
  userId: string,
  plaintext: string
): Promise<void> {
  const encrypted = await encryptSecret(plaintext);
  const { error } = await sb
    .from('app_users')
    .update({
      password_enc: encrypted,
      known_password: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    throw new Error(
      error.message.includes('password_enc')
        ? 'Falta ejecutar supabase/schema_auth_v3.sql en Supabase.'
        : error.message
    );
  }
}

export async function readDecryptedPassword(
  sb: ServiceSupabase,
  row: UserRow
): Promise<string | null> {
  if (row.password_enc) {
    return decryptSecret(row.password_enc);
  }
  if (row.known_password) {
    const plain = String(row.known_password);
    // Migración progresiva: cifrar y borrar la columna en texto plano
    try {
      await saveEncryptedPassword(sb, row.id, plain);
    } catch {
      // Si aún no existe password_enc, devolvemos el valor igualmente sin bloquear
    }
    return plain;
  }
  return null;
}

export async function loadContext(
  sb: ServiceSupabase,
  jwt: string | null
): Promise<AuthContext | null> {
  if (!jwt) return null;
  const { data: authData, error } = await sb.auth.getUser(jwt);
  if (error || !authData?.user) return null;
  const authUid = authData.user.id;
  const authEmail = normalizeEmail(authData.user.email);

  let { data: authProfile } = await sb
    .from('app_users')
    .select('*')
    .eq('auth_user_id', authUid)
    .maybeSingle();

  if (!authProfile) {
    await new Promise((r) => setTimeout(r, 400));
    const retry = await sb
      .from('app_users')
      .select('*')
      .eq('auth_user_id', authUid)
      .maybeSingle();
    authProfile = retry.data;
  }

  if (!authProfile) return null;

  const authRow: UserRow = {
    ...(authProfile as UserRow),
    email: normalizeEmail((authProfile as UserRow).email) || authEmail || null,
  };

  const isAdmin = isStrictAdmin(authRow);
  let acting = authRow;

  if (isAdmin) {
    const { data: actingRow } = await sb
      .from('app_acting')
      .select('acting_user_id')
      .eq('auth_user_id', authUid)
      .maybeSingle();
    if (actingRow?.acting_user_id && actingRow.acting_user_id !== authRow.id) {
      const { data: target } = await sb
        .from('app_users')
        .select('*')
        .eq('id', actingRow.acting_user_id)
        .maybeSingle();
      if (target && (target as UserRow).status === 'approved') {
        acting = target as UserRow;
      }
    }
  }

  return {
    authUid,
    auth: authRow,
    acting,
    isAdmin,
  };
}

export function requireAuth(ctx: AuthContext | null): Response | null {
  if (!ctx) return json({ ok: false, error: 'Inicia sesión.' }, 401);
  return null;
}

export function requireApproved(ctx: AuthContext): Response | null {
  if (ctx.auth.status !== 'approved') {
    return json(
      {
        ok: false,
        error:
          ctx.auth.status === 'rejected'
            ? 'Tu cuenta fue rechazada. Contacta con el administrador.'
            : 'Tu cuenta está pendiente de aprobación.',
        authUser: publicUser(ctx.auth),
        status: ctx.auth.status,
      },
      403
    );
  }
  return null;
}

export function requireAdmin(ctx: AuthContext | null): Response | null {
  const unauth = requireAuth(ctx);
  if (unauth) return unauth;
  const unapproved = requireApproved(ctx!);
  if (unapproved) return unapproved;
  if (!ctx!.isAdmin) {
    return json({ ok: false, error: 'Acceso restringido al administrador.' }, 403);
  }
  return null;
}

export async function ensureAdminRow(sb: ServiceSupabase): Promise<void> {
  const { data } = await sb.from('app_admin').select('id').eq('id', 1).maybeSingle();
  if (data) return;
  await sb.from('app_admin').insert({
    id: 1,
    password_salt: 'auth_v3',
    password_hash: 'auth_v3',
    gemini_api_key: null,
  });
}

export async function countApproved(sb: ServiceSupabase): Promise<number> {
  const { count } = await sb
    .from('app_users')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'approved')
    .not('auth_user_id', 'is', null);
  return count || 0;
}

export async function listUsersPublic(sb: ServiceSupabase) {
  const { data } = await sb.from('app_users').select('*').order('created_at');
  return (data || []).map((row) => publicUser(row as UserRow));
}

export async function checkRateLimit(
  sb: ServiceSupabase,
  action: string,
  scopeKey: string,
  windowSeconds: number,
  maxRequests: number
): Promise<boolean> {
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const { count, error } = await sb
    .from('auth_rate_limits')
    .select('id', { count: 'exact', head: true })
    .eq('action', action)
    .eq('scope_key', scopeKey)
    .gte('created_at', since);

  if (error) {
    // Si la tabla aún no fue migrada, no bloqueamos el flujo
    return true;
  }

  if ((count || 0) >= maxRequests) {
    return false;
  }

  await sb.from('auth_rate_limits').insert({ action, scope_key: scopeKey });

  // Limpieza periódica ligera de registros antiguos (> 24h)
  if (Math.random() < 0.05) {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await sb.from('auth_rate_limits').delete().lt('created_at', cutoff);
  }

  return true;
}
