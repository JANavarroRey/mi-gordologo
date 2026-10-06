import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-admin-token, x-user-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SESSION_DAYS = 30;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${key}`, apikey: key } },
  });
}

function b64(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach((b) => {
    s += String.fromCharCode(b);
  });
  return btoa(s);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hashPassword(password: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 120_000, hash: 'SHA-256' },
    key,
    256
  );
  return b64(new Uint8Array(bits));
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return b64(bytes).replace(/[+/=]/g, (c) => (c === '+' ? '-' : c === '/' ? '_' : ''));
}

async function makePassword(password: string) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const password_hash = await hashPassword(password, salt);
  return { password_salt: b64(salt), password_hash };
}

type UserRow = {
  id: string;
  name: string;
  role: string;
  age: number;
  height: number;
  target_calories: number;
  gender: string | null;
  activity_level: string | null;
  goal: string | null;
  settings: Record<string, unknown> | null;
  created_at: string;
};

function publicUser(row: UserRow) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    age: row.age,
    height: row.height,
    targetCalories: row.target_calories,
    gender: row.gender,
    activityLevel: row.activity_level,
    goal: row.goal,
    linkedMenuUserId: null,
    createdAt: row.created_at,
    settings: row.settings || {},
  };
}

function systemInstruction(profile?: { name?: string; age?: number; targetCalories?: number }) {
  const name = profile?.name || 'el paciente';
  const age = profile?.age ? `${profile.age} años` : 'edad no indicada';
  const kcal = profile?.targetCalories || 1500;
  return `Eres "El Gordólogo", un asistente médico y nutricionista con chispa, empático, cómplice y un toque de sátira cariñosa pero con absoluto rigor clínico.
Estás asesorando a ${name} (${age}) que sigue una dieta de ${kcal} kcal, basada en las reglas de la Unidad de Endocrinología y Nutrición del Hospital Morales Meseguer (pauta origen 1.500 kcal, adaptada a este perfil).

Reglas clínicas inquebrantables del hospital (escala las cantidades a ${kcal} kcal respecto a 1.500):
1. Las carnes magras son de 100g en crudo (pollo, pavo, conejo, ternera) a 1.500 kcal.
2. Los pescados blancos son de 150g; azules/semigrasos son de 100g a 1.500 kcal.
3. Legumbres: 60g crudas (unas 9 cucharadas soperas cocidas) a 1.500 kcal.
4. Arroz o pasta: 60g crudos en comida; 45g en cena a 1.500 kcal.
5. Patatas: 200g (2 pequeñas) o 100g (1 pequeña) según plato a 1.500 kcal.
6. Aceite de oliva virgen extra: máximo 1 - 1,5 cucharadas soperas por comida a 1.500 kcal.
7. Pan integral: 20g (2 biscotes) en la mayoría de tomas a 1.500 kcal.
8. Siempre que sugieras recetas elaboradas, prioriza preparaciones aptas para Thermomix.
9. Responde siempre en español, de forma muy clara, con frases directas, fácil de leer para personas mayores.
10. Tono: cariñoso, divertido, sin tecnicismos difíciles, motivador y nunca despectivo.`;
}

async function callGemini(apiKey: string, userText: string, jsonMode: boolean, profile?: { name?: string; age?: number; targetCalories?: number }): Promise<string> {
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' +
    encodeURIComponent(apiKey);
  const body: Record<string, unknown> = {
    system_instruction: { parts: [{ text: systemInstruction(profile) }] },
    contents: [{ role: 'user', parts: [{ text: userText }] }],
  };
  if (jsonMode) {
    body.generationConfig = { responseMimeType: 'application/json' };
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const raw = await res.json();
  if (!res.ok) {
    const msg = raw?.error?.message || `Gemini HTTP ${res.status}`;
    throw new Error(msg);
  }
  const text = raw?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || '';
  return String(text).trim();
}

async function requireAdminLegacy(sb: ReturnType<typeof serviceClient>, token: string | null) {
  if (!token) return false;
  const { data } = await sb.from('admin_sessions').select('token, expires_at').eq('token', token).maybeSingle();
  if (!data) return false;
  if (new Date(data.expires_at).getTime() < Date.now()) {
    await sb.from('admin_sessions').delete().eq('token', token);
    return false;
  }
  return true;
}

async function loadSession(sb: ReturnType<typeof serviceClient>, token: string | null) {
  if (!token) return null;
  const { data: sess } = await sb
    .from('user_sessions')
    .select('token, user_id, acting_user_id, expires_at')
    .eq('token', token)
    .maybeSingle();
  if (!sess) return null;
  if (new Date(sess.expires_at).getTime() < Date.now()) {
    await sb.from('user_sessions').delete().eq('token', token);
    return null;
  }
  const { data: auth } = await sb.from('app_users').select('*').eq('id', sess.user_id).maybeSingle();
  const { data: acting } = await sb.from('app_users').select('*').eq('id', sess.acting_user_id).maybeSingle();
  if (!auth || !acting) return null;
  return { sess, auth: auth as UserRow, acting: acting as UserRow };
}

async function issueSession(
  sb: ReturnType<typeof serviceClient>,
  userId: string,
  actingUserId: string
) {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();
  await sb.from('user_sessions').insert({
    token,
    user_id: userId,
    acting_user_id: actingUserId,
    expires_at: expires,
  });
  return token;
}

async function listUsers(sb: ReturnType<typeof serviceClient>) {
  const { data } = await sb.from('app_users').select('*').order('created_at');
  return (data || []).map((row) => publicUser(row as UserRow));
}

async function ensureAdminRow(sb: ReturnType<typeof serviceClient>) {
  const { data } = await sb.from('app_admin').select('id').eq('id', 1).maybeSingle();
  if (data) return;
  const dummy = await makePassword(randomToken());
  await sb.from('app_admin').insert({
    id: 1,
    password_salt: dummy.password_salt,
    password_hash: dummy.password_hash,
    gemini_api_key: null,
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ ok: false, error: 'Método no permitido' }, 405);
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: 'JSON inválido' }, 400);
  }

  const action = String(payload.action || '');
  const adminToken = req.headers.get('x-admin-token');
  const userToken = req.headers.get('x-user-token');
  const sb = serviceClient();

  try {
    if (action === 'status') {
      const { data: admin } = await sb.from('app_admin').select('id, gemini_api_key').eq('id', 1).maybeSingle();
      const usersRes = await sb.from('app_users').select('id', { count: 'exact', head: true });
      if (usersRes.error) {
        return json({
          ok: true,
          backend: true,
          hasAdmin: Boolean(admin),
          hasUsers: false,
          hasGemini: Boolean(admin?.gemini_api_key),
          users: [],
          error: usersRes.error.message,
        });
      }
      const users = await listUsers(sb);
      return json({
        ok: true,
        backend: true,
        hasAdmin: Boolean(admin) || (usersRes.count || 0) > 0,
        hasUsers: (usersRes.count || 0) > 0,
        hasGemini: Boolean(admin?.gemini_api_key),
        users: users.map((u) => ({ id: u.id, name: u.name, role: u.role })),
      });
    }

    if (action === 'bootstrapUsers') {
      const pepePassword = String(payload.pepePassword || '');
      const mariaPassword = String(payload.mariaPassword || '');
      if (pepePassword.length < 8) {
        return json({ ok: false, error: 'La contraseña de Pepe debe tener al menos 8 caracteres.' }, 400);
      }
      if (mariaPassword.length < 6) {
        return json({ ok: false, error: 'La contraseña de María debe tener al menos 6 caracteres.' }, 400);
      }
      const { count } = await sb.from('app_users').select('id', { count: 'exact', head: true });
      if ((count || 0) > 0) {
        return json({ ok: false, error: 'Las cuentas ya están creadas. Entra con tu contraseña.' }, 409);
      }
      await ensureAdminRow(sb);
      const pepePw = await makePassword(pepePassword);
      const mariaPw = await makePassword(mariaPassword);
      const now = new Date().toISOString();
      const { error: pepeErr } = await sb.from('app_users').insert({
        id: 'pepe',
        name: 'Pepe',
        role: 'superadmin',
        ...pepePw,
        age: 0,
        height: 0,
        target_calories: 1500,
        settings: { servings: 1, freeDay: 5, freeDayEnabled: false, weighInDay: 4 },
        created_at: now,
      });
      if (pepeErr) return json({ ok: false, error: pepeErr.message }, 500);
      const { error: mariaErr } = await sb.from('app_users').insert({
        id: 'maria_ignacia',
        name: 'María Ignacia',
        role: 'member',
        ...mariaPw,
        age: 68,
        height: 167,
        target_calories: 1500,
        gender: 'female',
        activity_level: 'sedentary',
        goal: 'lose_weight',
        settings: { servings: 2, freeDay: 5, freeDayEnabled: false, weighInDay: 4 },
        created_at: '2026-09-10T10:00:00Z',
      });
      if (mariaErr) return json({ ok: false, error: mariaErr.message }, 500);

      const menusByUser = (payload.menusByUser || {}) as Record<string, unknown>;
      const measurementsByUser = (payload.measurementsByUser || {}) as Record<string, unknown>;
      const meta = (payload.meta || {}) as Record<string, string>;
      for (const uid of ['pepe', 'maria_ignacia']) {
        if (menusByUser[uid]) {
          await sb.from('user_menus').upsert({
            user_id: uid,
            weeks: menusByUser[uid],
            edited: meta[`menus_edited_${uid}`] === '1',
            updated_at: now,
          });
        }
        if (measurementsByUser[uid]) {
          await sb.from('user_measurements').upsert({
            user_id: uid,
            payload: measurementsByUser[uid],
            updated_at: now,
          });
        }
      }

      const token = await issueSession(sb, 'pepe', 'pepe');
      const { data: admin } = await sb.from('app_admin').select('gemini_api_key').eq('id', 1).maybeSingle();
      return json({
        ok: true,
        token,
        hasGemini: Boolean(admin?.gemini_api_key),
        authUser: { id: 'pepe', name: 'Pepe', role: 'superadmin' },
        actingUserId: 'pepe',
        users: await listUsers(sb),
      });
    }

    if (action === 'login') {
      const userId = String(payload.userId || '');
      const password = String(payload.password || '');
      if (!userId) {
        return json({ ok: false, error: 'Elige un perfil.' }, 400);
      }
      const { data } = await sb.from('app_users').select('*').eq('id', userId).maybeSingle();
      if (!data) {
        return json({ ok: false, error: 'Ese perfil no existe.' }, 404);
      }
      const hash = await hashPassword(password, fromB64(data.password_salt));
      if (hash !== data.password_hash) {
        return json({ ok: false, error: 'Contraseña incorrecta.' }, 401);
      }
      const token = await issueSession(sb, data.id, data.id);
      const { data: admin } = await sb.from('app_admin').select('gemini_api_key').eq('id', 1).maybeSingle();
      return json({
        ok: true,
        token,
        hasGemini: Boolean(admin?.gemini_api_key),
        authUser: publicUser(data as UserRow),
        actingUserId: data.id,
        users: data.role === 'superadmin' ? await listUsers(sb) : [publicUser(data as UserRow)],
      });
    }

    if (action === 'logout') {
      if (userToken) await sb.from('user_sessions').delete().eq('token', userToken);
      if (adminToken) await sb.from('admin_sessions').delete().eq('token', adminToken);
      return json({ ok: true });
    }

    const session = await loadSession(sb, userToken);

    if (action === 'openAsUser') {
      if (!session || session.auth.role !== 'superadmin') {
        return json({ ok: false, error: 'Solo Pepe puede abrir otros perfiles.' }, 401);
      }
      const targetUserId = String(payload.targetUserId || '');
      const { data: target } = await sb.from('app_users').select('*').eq('id', targetUserId).maybeSingle();
      if (!target) return json({ ok: false, error: 'Perfil no encontrado.' }, 404);
      await sb.from('user_sessions').update({ acting_user_id: target.id }).eq('token', session.sess.token);
      return json({
        ok: true,
        actingUserId: target.id,
        actingUser: publicUser(target as UserRow),
        authUser: publicUser(session.auth),
      });
    }

    if (action === 'createUser') {
      if (!session || session.auth.role !== 'superadmin') {
        return json({ ok: false, error: 'Solo Pepe puede crear perfiles.' }, 401);
      }
      const name = String(payload.name || '').trim();
      const password = String(payload.password || '');
      if (!name) return json({ ok: false, error: 'Falta el nombre.' }, 400);
      if (password.length < 6) return json({ ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' }, 400);
      const id = String(payload.id || `usr_${Date.now()}`);
      const pw = await makePassword(password);
      const now = new Date().toISOString();
      const row = {
        id,
        name,
        role: 'member',
        ...pw,
        age: Number(payload.age) || 40,
        height: Number(payload.height) || 170,
        target_calories: Number(payload.targetCalories) || 1500,
        gender: payload.gender ? String(payload.gender) : null,
        activity_level: payload.activityLevel ? String(payload.activityLevel) : null,
        goal: payload.goal ? String(payload.goal) : null,
        settings: {
          servings: 1,
          freeDay: 5,
          freeDayEnabled: false,
          weighInDay: Number(payload.weighInDay) || 4,
        },
        created_at: now,
      };
      const { error } = await sb.from('app_users').insert(row);
      if (error) return json({ ok: false, error: error.message }, 500);
      if (payload.weeks) {
        await sb.from('user_menus').insert({
          user_id: id,
          weeks: payload.weeks,
          edited: false,
          updated_at: now,
        });
      }
      if (payload.measurements) {
        await sb.from('user_measurements').insert({
          user_id: id,
          payload: payload.measurements,
          updated_at: now,
        });
      }
      return json({ ok: true, user: publicUser(row as UserRow) });
    }

    if (action === 'setUserPassword') {
      if (!session) return json({ ok: false, error: 'Inicia sesión.' }, 401);
      const targetId = String(payload.userId || session.auth.id);
      const password = String(payload.password || '');
      const minLen = targetId === 'pepe' ? 8 : 6;
      if (password.length < minLen) {
        return json({ ok: false, error: `La contraseña debe tener al menos ${minLen} caracteres.` }, 400);
      }
      if (session.auth.role !== 'superadmin' && targetId !== session.auth.id) {
        return json({ ok: false, error: 'No puedes cambiar la clave de otra persona.' }, 403);
      }
      const pw = await makePassword(password);
      const { error } = await sb.from('app_users').update({ ...pw, updated_at: new Date().toISOString() }).eq('id', targetId);
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === 'updateProfile') {
      if (!session) return json({ ok: false, error: 'Inicia sesión.' }, 401);
      const targetId = String(payload.userId || session.acting.id);
      if (session.auth.role !== 'superadmin' && targetId !== session.auth.id) {
        return json({ ok: false, error: 'No puedes editar otro perfil.' }, 403);
      }
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (payload.age != null) patch.age = Number(payload.age);
      if (payload.height != null) patch.height = Number(payload.height);
      if (payload.targetCalories != null) patch.target_calories = Number(payload.targetCalories);
      if (payload.gender !== undefined) patch.gender = payload.gender;
      if (payload.activityLevel !== undefined) patch.activity_level = payload.activityLevel;
      if (payload.goal !== undefined) patch.goal = payload.goal;
      if (payload.settings && typeof payload.settings === 'object') {
        const current = (session.acting.id === targetId ? session.acting.settings : {}) || {};
        patch.settings = { ...current, ...(payload.settings as object) };
      }
      const { error } = await sb.from('app_users').update(patch).eq('id', targetId);
      if (error) return json({ ok: false, error: error.message }, 500);
      const { data } = await sb.from('app_users').select('*').eq('id', targetId).maybeSingle();
      return json({ ok: true, user: data ? publicUser(data as UserRow) : null });
    }

    if (action === 'getState') {
      if (!session) return json({ ok: false, error: 'Inicia sesión.' }, 401);
      const uid = session.acting.id;
      const { data: menus } = await sb.from('user_menus').select('*').eq('user_id', uid).maybeSingle();
      const { data: meas } = await sb.from('user_measurements').select('*').eq('user_id', uid).maybeSingle();
      const { data: admin } = await sb.from('app_admin').select('gemini_api_key').eq('id', 1).maybeSingle();
      return json({
        ok: true,
        hasGemini: Boolean(admin?.gemini_api_key),
        authUser: publicUser(session.auth),
        actingUser: publicUser(session.acting),
        users: session.auth.role === 'superadmin' ? await listUsers(sb) : [publicUser(session.auth)],
        menus: menus?.weeks ?? null,
        menusEdited: Boolean(menus?.edited),
        menusUpdatedAt: menus?.updated_at ?? null,
        measurements: meas?.payload ?? null,
        measurementsUpdatedAt: meas?.updated_at ?? null,
      });
    }

    if (action === 'saveMenus') {
      if (!session) return json({ ok: false, error: 'Inicia sesión.' }, 401);
      const uid = String(payload.userId || session.acting.id);
      if (session.auth.role !== 'superadmin' && uid !== session.auth.id) {
        return json({ ok: false, error: 'No puedes guardar el menú de otra persona.' }, 403);
      }
      const { error } = await sb.from('user_menus').upsert({
        user_id: uid,
        weeks: payload.weeks,
        edited: payload.edited !== false,
        updated_at: new Date().toISOString(),
      });
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === 'saveMeasurements') {
      if (!session) return json({ ok: false, error: 'Inicia sesión.' }, 401);
      const uid = String(payload.userId || session.acting.id);
      if (session.auth.role !== 'superadmin' && uid !== session.auth.id) {
        return json({ ok: false, error: 'No puedes guardar la báscula de otra persona.' }, 403);
      }
      const { error } = await sb.from('user_measurements').upsert({
        user_id: uid,
        payload: payload.measurements ?? [],
        updated_at: new Date().toISOString(),
      });
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === 'setGeminiKey') {
      const pepeOk = session?.auth.role === 'superadmin';
      const legacyOk = await requireAdminLegacy(sb, adminToken);
      if (!pepeOk && !legacyOk) return json({ ok: false, error: 'Sesión de superadmin no válida.' }, 401);
      const apiKey = String(payload.apiKey || '').trim();
      if (!apiKey.startsWith('AIza') || apiKey.length < 20) {
        return json({ ok: false, error: 'Esa no parece una clave de Google AI Studio (AIza…).' }, 400);
      }
      await ensureAdminRow(sb);
      const { error } = await sb
        .from('app_admin')
        .update({ gemini_api_key: apiKey, updated_at: new Date().toISOString() })
        .eq('id', 1);
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true, hasGemini: true });
    }

    if (action === 'ask' || action === 'adjustMeal') {
      if (!session) return json({ ok: false, error: 'Inicia sesión para usar la IA.' }, 401);
      const { data } = await sb.from('app_admin').select('gemini_api_key').eq('id', 1).maybeSingle();
      const apiKey = data?.gemini_api_key;
      if (!apiKey) {
        return json({ ok: false, error: 'NO_GEMINI_KEY' }, 503);
      }
      const profile = {
        name: session.acting.name,
        age: session.acting.age,
        targetCalories: session.acting.target_calories,
      };
      if (action === 'ask') {
        const question = String(payload.question || '').slice(0, 2000);
        if (!question.trim()) return json({ ok: false, error: 'Falta la pregunta.' }, 400);
        const prompt = `Pregunta de ${profile.name} (dieta ${profile.targetCalories} kcal): "${question}"

Responde en español, 3-8 frases claras, sin markdown complejo.
Si pregunta por calorías de algo concreto, da una estimación razonable.
Si implica alcohol, azúcar, miel o cerveza sin alcohol: prohíbelo con firmeza pero cariño y sugiere alternativa.`;
        const text = await callGemini(apiKey, prompt, false, profile);
        return json({ ok: true, text });
      }

      const mealType = String(payload.mealType || '');
      const userPrompt = String(payload.userPrompt || '').slice(0, 2000);
      const currentMeal = payload.currentMeal as Record<string, unknown> | undefined;
      if (!mealType || !userPrompt || !currentMeal) {
        return json({ ok: false, error: 'Faltan datos del plato.' }, 400);
      }
      const items = Array.isArray(currentMeal.items) ? currentMeal.items : [];
      const prompt = `El usuario ${profile.name} (objetivo ${profile.targetCalories} kcal/día) quiere modificar el plato de "${mealType}".
Plato actual:
- Nombre: ${currentMeal.recipeName || 'Plato'}
- Ingredientes actuales: ${items.map((i: { name?: string; quantity?: string }) => `${i.name} (${i.quantity || ''})`).join(', ')}

Petición del usuario: "${userPrompt}"

Ajusta cantidades al objetivo de ${profile.targetCalories} kcal.
Por favor, devuelve un JSON válido con el siguiente formato exacto:
{
  "message": "Comentario ingenioso y profesional del Gordólogo explicando el cambio",
  "recipeName": "Nuevo nombre del plato o receta",
  "recipeUrl": "URL de Cookidoo o Thermomix si aplica o null",
  "items": [
    { "name": "Nombre ingrediente", "quantity": "Cantidad recomendada", "notes": "opcional" }
  ]
}`;
      const rawText = await callGemini(apiKey, prompt, true, profile);
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return json({ ok: true, message: rawText || 'He procesado tu petición.' });
      const parsed = JSON.parse(jsonMatch[0]);
      return json({
        ok: true,
        message: parsed.message || '¡Cambio realizado con éxito por El Gordólogo!',
        recipeName: parsed.recipeName,
        recipeUrl: parsed.recipeUrl ?? null,
        items: parsed.items,
      });
    }

    // Compatibilidad: bootstrap/login antiguos de app_admin (ya no se usan en la UI).
    if (action === 'bootstrap' || action === 'loginAdmin') {
      return json({ ok: false, error: 'Usa las cuentas de usuario (Pepe / María).' }, 400);
    }

    return json({ ok: false, error: 'Acción desconocida' }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ ok: false, error: message }, 500);
  }
});
