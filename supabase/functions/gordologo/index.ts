import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-admin-token, x-user-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

function normalizeGeminiKey(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .replace(/\s+/g, '');
}

function isLikelyGeminiKey(apiKey: string): boolean {
  if (apiKey.length < 20 || apiKey.length > 512) return false;
  return apiKey.startsWith('AIza') || apiKey.startsWith('AQ.');
}

type UserRow = {
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
  created_at: string;
};

function publicUser(row: UserRow) {
  const rawSettings = { ...(row.settings || {}) };
  delete rawSettings.passwordRecovery;
  return {
    id: row.id,
    name: row.name,
    role: row.role,
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

function systemInstruction(profile?: { name?: string; age?: number; targetCalories?: number }, skipCalorieRules = false) {
  const name = profile?.name || 'el paciente';
  const age = profile?.age ? `${profile.age} años` : 'edad no indicada';
  const kcal = profile?.targetCalories || 1500;
  const dietLine = skipCalorieRules
    ? `Estás asesorando a ${name} (${age}). NO apliques el tope de 1.500 kcal ni recortes cantidades por calorías. Reproduce o diseña el menú pedido tal cual, con raciones caseras reales.`
    : `Estás asesorando a ${name} (${age}), dieta de ${kcal} kcal según la pauta de Endocrinología del Hospital Morales Meseguer (origen 1.500 kcal, adaptada a este perfil).`;
  return `Eres "El Gordólogo": nutricionista clínico con humor seco, inteligente y elegante. Hablas como un médico culto y cercano de Murcia, no como un influencer ni como una niña de cuatro años.

${dietLine}

Tono (obligatorio):
- Cercano, breve, con un toque de ironía fina. Nunca cursi.
- Prohibido: "de mi alma", "cielo", "bombón", "mi vida", diminutivos empalagosos, "menuda bomba", "botellita", "bajo llave", palmaditas, infantilismos y emojis en exceso (como mucho uno, si aporta).
- No hagas teatro. No te presentes en cada respuesta. Usa el nombre de pila como mucho una vez, en tono adulto.
- Firmes con alcohol, azúcar y trampas; educados, no sermón de abuela.
- Español claro, frases cortas, sin tecnicismos innecesarios. Accesible para personas mayores, no condescendiente.

${skipCalorieRules
    ? `Reglas:
1. No recortes ni escalas por calorías.
2. Recetas elaboradas: prioriza Thermomix/Cookidoo si encaja.
3. Responde siempre en español, JSON si se pide.`
    : `Reglas clínicas (escala cantidades a ${kcal} kcal respecto a 1.500):
1. Carnes magras 100g en crudo (pollo, pavo, conejo, ternera) a 1.500 kcal.
2. Pescados blancos 150g; azules/semigrasos 100g a 1.500 kcal.
3. Legumbres 60g crudas a 1.500 kcal.
4. Arroz o pasta: 60g crudos en comida; 45g en cena a 1.500 kcal.
5. Patatas 200g o 100g según plato a 1.500 kcal.
6. AOVE: máximo 1–1,5 cucharadas por comida a 1.500 kcal.
7. Pan integral ~20g (o 2 biscotes) en la mayoría de tomas a 1.500 kcal.
8. Recetas elaboradas: prioriza Thermomix/Cookidoo.
9. Responde siempre en español.`}
`;
}

function isRetryableGeminiStatus(status: number, message: string): boolean {
  const m = message.toLowerCase();
  if (status === 429 || status === 503 || status === 500) return true;
  return /high demand|unavailable|overload|resource exhausted|try again|no longer available|not found|not supported/i.test(m);
}

async function callGemini(
  apiKey: string,
  userText: string,
  jsonMode: boolean,
  profile?: { name?: string; age?: number; targetCalories?: number },
  skipCalorieRules = false
): Promise<string> {
  const models = jsonMode
    ? [
        'gemini-3.5-flash',
        'gemini-3.6-flash',
        'gemini-3.8-flash',
        'gemini-3.1-flash-lite',
        'gemini-3.5-flash-lite',
        'gemini-2.5-flash',
        'gemini-flash-latest',
      ]
    : [
        'gemini-3.1-flash-lite',
        'gemini-3.5-flash-lite',
        'gemini-3.8-flash',
        'gemini-3.6-flash',
        'gemini-3.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-2.5-flash',
        'gemini-flash-latest',
      ];
  const isAuthKey = apiKey.startsWith('AQ.');
  const body: Record<string, unknown> = {
    system_instruction: { parts: [{ text: systemInstruction(profile, skipCalorieRules) }] },
    contents: [{ role: 'user', parts: [{ text: userText }] }],
  };
  if (jsonMode) {
    body.generationConfig = { responseMimeType: 'application/json' };
  }

  for (const model of models) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const url = isAuthKey ? endpoint : `${endpoint}?key=${encodeURIComponent(apiKey)}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (isAuthKey) headers['x-goog-api-key'] = apiKey;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const raw = await res.json();
      if (!res.ok) {
        const msg = String(raw?.error?.message || `HTTP ${res.status}`);
        if (isRetryableGeminiStatus(res.status, msg)) continue;
        continue;
      }
      const text = raw?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || '';
      if (text.trim()) return String(text).trim();
    } catch {
      continue;
    }
  }
  throw new Error('IA_SATURADA');
}

function extractBearer(req: Request): string | null {
  const h = req.headers.get('Authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

async function listUsers(sb: ReturnType<typeof serviceClient>) {
  const { data } = await sb.from('app_users').select('*').order('created_at');
  return (data || []).map((row) => publicUser(row as UserRow));
}

async function ensureAdminRow(sb: ReturnType<typeof serviceClient>) {
  const { data } = await sb.from('app_admin').select('id').eq('id', 1).maybeSingle();
  if (data) return;
  await sb.from('app_admin').insert({
    id: 1,
    password_salt: 'legacy',
    password_hash: 'legacy',
    gemini_api_key: null,
  });
}

async function countApproved(sb: ReturnType<typeof serviceClient>) {
  // Solo cuentan perfiles ya vinculados a Supabase Auth
  const { count } = await sb
    .from('app_users')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'approved')
    .not('auth_user_id', 'is', null);
  return count || 0;
}

async function loadContext(sb: ReturnType<typeof serviceClient>, jwt: string | null) {
  if (!jwt) return null;
  const { data: authData, error } = await sb.auth.getUser(jwt);
  if (error || !authData?.user) return null;
  const authUid = authData.user.id;

  let { data: authProfile } = await sb
    .from('app_users')
    .select('*')
    .eq('auth_user_id', authUid)
    .maybeSingle();

  // Perfil creado por trigger puede tardar un instante
  if (!authProfile) {
    await new Promise((r) => setTimeout(r, 400));
    const retry = await sb.from('app_users').select('*').eq('auth_user_id', authUid).maybeSingle();
    authProfile = retry.data;
  }

  if (!authProfile) return null;

  let acting = authProfile as UserRow;
  if (authProfile.role === 'superadmin' && authProfile.status === 'approved') {
    const { data: actingRow } = await sb
      .from('app_acting')
      .select('acting_user_id')
      .eq('auth_user_id', authUid)
      .maybeSingle();
    if (actingRow?.acting_user_id) {
      const { data: target } = await sb
        .from('app_users')
        .select('*')
        .eq('id', actingRow.acting_user_id)
        .maybeSingle();
      if (target) acting = target as UserRow;
    }
  }

  return {
    authUid,
    auth: authProfile as UserRow,
    acting,
  };
}

function requireApproved(ctx: { auth: UserRow }) {
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
  const jwt = extractBearer(req);
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
          needsBootstrap: true,
          hasGemini: Boolean(admin?.gemini_api_key),
          users: [],
          error: usersRes.error.message,
        });
      }
      const approved = await countApproved(sb);
      const users = await listUsers(sb);
      return json({
        ok: true,
        backend: true,
        hasAdmin: Boolean(admin) || approved > 0,
        hasUsers: (usersRes.count || 0) > 0,
        needsBootstrap: approved === 0,
        hasGemini: Boolean(admin?.gemini_api_key),
        users: users
          .filter((u) => u.status === 'approved')
          .map((u) => ({ id: u.id, name: u.name, role: u.role, status: u.status })),
      });
    }

    // Primer administrador (solo si no hay nadie aprobado)
    if (action === 'bootstrapAdmin') {
      const email = String(payload.email || '')
        .trim()
        .toLowerCase();
      const password = String(payload.password || '');
      const name = String(payload.name || 'Admin').trim() || 'Admin';
      if (!email || !email.includes('@')) {
        return json({ ok: false, error: 'Indica un email válido.' }, 400);
      }
      if (password.length < 8) {
        return json({ ok: false, error: 'La contraseña debe tener al menos 8 caracteres.' }, 400);
      }
      if ((await countApproved(sb)) > 0) {
        return json({ ok: false, error: 'Ya hay un administrador. Regístrate y espera aprobación.' }, 409);
      }

      await ensureAdminRow(sb);

      const { data: created, error: createErr } = await sb.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (createErr || !created.user) {
        return json({ ok: false, error: createErr?.message || 'No se pudo crear el usuario Auth.' }, 500);
      }

      const authUid = created.user.id;
      // El trigger puede haber creado usr_… pending; lo convertimos en pepe superadmin aprobado
      await sb.from('app_users').delete().eq('auth_user_id', authUid);

      const now = new Date().toISOString();
      const pepeId = 'pepe';
      const { data: existingPepe } = await sb.from('app_users').select('id').eq('id', pepeId).maybeSingle();
      if (existingPepe) {
        const { error } = await sb
          .from('app_users')
          .update({
            name,
            role: 'superadmin',
            email,
            auth_user_id: authUid,
            status: 'approved',
            updated_at: now,
          })
          .eq('id', pepeId);
        if (error) return json({ ok: false, error: error.message }, 500);
      } else {
        const { error } = await sb.from('app_users').insert({
          id: pepeId,
          name,
          role: 'superadmin',
          email,
          auth_user_id: authUid,
          status: 'approved',
          age: 0,
          height: 0,
          target_calories: 1500,
          settings: { servings: 1, freeDay: 5, freeDayEnabled: false, weighInDay: 4 },
          created_at: now,
          updated_at: now,
        });
        if (error) return json({ ok: false, error: error.message }, 500);
      }

      // Opcional: semilla María sin Auth (solo datos locales migrados)
      const menusByUser = (payload.menusByUser || {}) as Record<string, unknown>;
      const measurementsByUser = (payload.measurementsByUser || {}) as Record<string, unknown>;
      const meta = (payload.meta || {}) as Record<string, string>;
      for (const uid of Object.keys(menusByUser)) {
        await sb.from('user_menus').upsert({
          user_id: uid,
          weeks: menusByUser[uid],
          edited: meta[`menus_edited_${uid}`] === '1',
          updated_at: now,
        });
      }
      for (const uid of Object.keys(measurementsByUser)) {
        await sb.from('user_measurements').upsert({
          user_id: uid,
          payload: measurementsByUser[uid],
          updated_at: now,
        });
      }

      const { data: admin } = await sb.from('app_admin').select('gemini_api_key').eq('id', 1).maybeSingle();
      const { data: pepe } = await sb.from('app_users').select('*').eq('id', pepeId).maybeSingle();
      return json({
        ok: true,
        message: 'Administrador creado. Entra con tu email y contraseña.',
        hasGemini: Boolean(admin?.gemini_api_key),
        authUser: pepe ? publicUser(pepe as UserRow) : null,
        needsSignIn: true,
      });
    }

    if (action === 'logout') {
      const ctx = await loadContext(sb, jwt);
      if (ctx) {
        await sb.from('app_acting').delete().eq('auth_user_id', ctx.authUid);
      }
      return json({ ok: true });
    }

    const ctx = await loadContext(sb, jwt);

    if (action === 'getMyProfile') {
      if (!ctx) return json({ ok: false, error: 'Inicia sesión.' }, 401);
      return json({
        ok: true,
        authUser: publicUser(ctx.auth),
        actingUser: publicUser(ctx.acting),
        status: ctx.auth.status,
      });
    }

    if (action === 'openAsUser') {
      if (!ctx) return json({ ok: false, error: 'Inicia sesión.' }, 401);
      const blocked = requireApproved(ctx);
      if (blocked) return blocked;
      if (ctx.auth.role !== 'superadmin') {
        return json({ ok: false, error: 'Solo el administrador puede abrir otros perfiles.' }, 401);
      }
      const targetUserId = String(payload.targetUserId || '');
      const { data: target } = await sb.from('app_users').select('*').eq('id', targetUserId).maybeSingle();
      if (!target) return json({ ok: false, error: 'Perfil no encontrado.' }, 404);
      if ((target as UserRow).status !== 'approved') {
        return json({ ok: false, error: 'Ese perfil aún no está aprobado.' }, 400);
      }
      await sb.from('app_acting').upsert({
        auth_user_id: ctx.authUid,
        acting_user_id: target.id,
        updated_at: new Date().toISOString(),
      });
      return json({
        ok: true,
        actingUserId: target.id,
        actingUser: publicUser(target as UserRow),
        authUser: publicUser(ctx.auth),
      });
    }

    if (action === 'createUser') {
      if (!ctx) return json({ ok: false, error: 'Inicia sesión.' }, 401);
      const blocked = requireApproved(ctx);
      if (blocked) return blocked;
      if (ctx.auth.role !== 'superadmin') {
        return json({ ok: false, error: 'Solo el administrador puede crear perfiles.' }, 401);
      }
      const name = String(payload.name || '').trim();
      const email = String(payload.email || '')
        .trim()
        .toLowerCase();
      const password = String(payload.password || '');
      if (!name) return json({ ok: false, error: 'Falta el nombre.' }, 400);
      if (!email || !email.includes('@')) return json({ ok: false, error: 'Falta un email válido.' }, 400);
      if (password.length < 6) return json({ ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' }, 400);

      const { data: created, error: createErr } = await sb.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (createErr || !created.user) {
        return json({ ok: false, error: createErr?.message || 'No se pudo crear la cuenta.' }, 500);
      }

      const authUid = created.user.id;
      await new Promise((r) => setTimeout(r, 400));
      let { data: row } = await sb.from('app_users').select('*').eq('auth_user_id', authUid).maybeSingle();
      const now = new Date().toISOString();
      const preferredId = String(payload.id || '').trim();

      // Si el wizard pide un id concreto distinto al del trigger, reasignamos la fila
      if (row && preferredId && preferredId !== row.id) {
        await sb.from('app_users').delete().eq('id', row.id);
        row = null;
      }

      const userId = preferredId || row?.id || `usr_${authUid.replace(/-/g, '')}`;
      const fields = {
        name,
        role: 'member' as const,
        email,
        auth_user_id: authUid,
        status: 'approved',
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
        updated_at: now,
      };

      if (row) {
        const { error } = await sb.from('app_users').update(fields).eq('id', row.id);
        if (error) return json({ ok: false, error: error.message }, 500);
      } else {
        const { error } = await sb.from('app_users').insert({ id: userId, ...fields, created_at: now });
        if (error) return json({ ok: false, error: error.message }, 500);
      }

      const finalId = row?.id || userId;

      if (payload.weeks) {
        await sb.from('user_menus').upsert({
          user_id: finalId,
          weeks: payload.weeks,
          edited: false,
          updated_at: now,
        });
      }
      if (payload.measurements) {
        await sb.from('user_measurements').upsert({
          user_id: finalId,
          payload: payload.measurements,
          updated_at: now,
        });
      }

      const { data: saved } = await sb.from('app_users').select('*').eq('id', finalId).maybeSingle();
      return json({ ok: true, user: saved ? publicUser(saved as UserRow) : null });
    }

    if (action === 'setUserStatus') {
      if (!ctx) return json({ ok: false, error: 'Inicia sesión.' }, 401);
      const blocked = requireApproved(ctx);
      if (blocked) return blocked;
      if (ctx.auth.role !== 'superadmin') {
        return json({ ok: false, error: 'Solo el administrador puede aprobar cuentas.' }, 401);
      }
      const targetId = String(payload.userId || '');
      const status = String(payload.status || '');
      if (!['approved', 'rejected', 'pending'].includes(status)) {
        return json({ ok: false, error: 'Estado no válido.' }, 400);
      }
      if (targetId === ctx.auth.id && status !== 'approved') {
        return json({ ok: false, error: 'No puedes desaprobarte a ti mismo.' }, 400);
      }
      const { error } = await sb
        .from('app_users')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', targetId);
      if (error) return json({ ok: false, error: error.message }, 500);
      const { data } = await sb.from('app_users').select('*').eq('id', targetId).maybeSingle();
      return json({ ok: true, user: data ? publicUser(data as UserRow) : null });
    }

    if (action === 'listPendingUsers') {
      if (!ctx) return json({ ok: false, error: 'Inicia sesión.' }, 401);
      const blocked = requireApproved(ctx);
      if (blocked) return blocked;
      if (ctx.auth.role !== 'superadmin') {
        return json({ ok: false, error: 'Solo el administrador.' }, 401);
      }
      const { data } = await sb
        .from('app_users')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      return json({
        ok: true,
        users: (data || []).map((row) => publicUser(row as UserRow)),
      });
    }

    if (action === 'updateProfile') {
      if (!ctx) return json({ ok: false, error: 'Inicia sesión.' }, 401);
      const blocked = requireApproved(ctx);
      if (blocked) return blocked;
      const targetId = String(payload.userId || ctx.acting.id);
      if (ctx.auth.role !== 'superadmin' && targetId !== ctx.auth.id) {
        return json({ ok: false, error: 'No puedes editar otro perfil.' }, 403);
      }
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (payload.name != null) patch.name = String(payload.name).trim();
      if (payload.age != null) patch.age = Number(payload.age);
      if (payload.height != null) patch.height = Number(payload.height);
      if (payload.targetCalories != null) patch.target_calories = Number(payload.targetCalories);
      if (payload.gender !== undefined) patch.gender = payload.gender;
      if (payload.activityLevel !== undefined) patch.activity_level = payload.activityLevel;
      if (payload.goal !== undefined) patch.goal = payload.goal;
      if (payload.settings && typeof payload.settings === 'object') {
        const { data: targetRow } = await sb.from('app_users').select('settings').eq('id', targetId).maybeSingle();
        const current = (targetRow?.settings as Record<string, unknown>) || {};
        const incoming = { ...(payload.settings as Record<string, unknown>) };
        delete incoming.passwordRecovery;
        patch.settings = { ...current, ...incoming };
      }
      const { error } = await sb.from('app_users').update(patch).eq('id', targetId);
      if (error) return json({ ok: false, error: error.message }, 500);
      const { data } = await sb.from('app_users').select('*').eq('id', targetId).maybeSingle();
      return json({ ok: true, user: data ? publicUser(data as UserRow) : null });
    }

    if (action === 'getState') {
      if (!ctx) return json({ ok: false, error: 'Inicia sesión.' }, 401);
      if (ctx.auth.status !== 'approved') {
        return json({
          ok: true,
          pending: true,
          status: ctx.auth.status,
          authUser: publicUser(ctx.auth),
          actingUser: publicUser(ctx.auth),
          users: [publicUser(ctx.auth)],
          hasGemini: false,
        });
      }
      const uid = ctx.acting.id;
      const { data: menus } = await sb.from('user_menus').select('*').eq('user_id', uid).maybeSingle();
      const { data: meas } = await sb.from('user_measurements').select('*').eq('user_id', uid).maybeSingle();
      const { data: admin } = await sb.from('app_admin').select('gemini_api_key').eq('id', 1).maybeSingle();
      const users =
        ctx.auth.role === 'superadmin'
          ? await listUsers(sb)
          : [publicUser(ctx.auth)];
      return json({
        ok: true,
        hasGemini: Boolean(admin?.gemini_api_key),
        authUser: publicUser(ctx.auth),
        actingUser: publicUser(ctx.acting),
        users,
        menus: menus?.weeks ?? null,
        menusEdited: Boolean(menus?.edited),
        menusUpdatedAt: menus?.updated_at ?? null,
        measurements: meas?.payload ?? null,
        measurementsUpdatedAt: meas?.updated_at ?? null,
      });
    }

    if (action === 'saveMenus') {
      if (!ctx) return json({ ok: false, error: 'Inicia sesión.' }, 401);
      const blocked = requireApproved(ctx);
      if (blocked) return blocked;
      const uid = String(payload.userId || ctx.acting.id);
      if (ctx.auth.role !== 'superadmin' && uid !== ctx.auth.id) {
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
      if (!ctx) return json({ ok: false, error: 'Inicia sesión.' }, 401);
      const blocked = requireApproved(ctx);
      if (blocked) return blocked;
      const uid = String(payload.userId || ctx.acting.id);
      if (ctx.auth.role !== 'superadmin' && uid !== ctx.auth.id) {
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
      if (!ctx) return json({ ok: false, error: 'Inicia sesión.' }, 401);
      const blocked = requireApproved(ctx);
      if (blocked) return blocked;
      if (ctx.auth.role !== 'superadmin') {
        return json({ ok: false, error: 'Sesión de superadmin no válida.' }, 401);
      }
      const apiKey = normalizeGeminiKey(String(payload.apiKey || ''));
      if (!isLikelyGeminiKey(apiKey)) {
        return json(
          {
            ok: false,
            error:
              'Esa no parece una clave de Google AI Studio. Debe empezar por AIza o por AQ. (las nuevas).',
          },
          400
        );
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
      if (!ctx) return json({ ok: false, error: 'Inicia sesión para usar la IA.' }, 401);
      const blocked = requireApproved(ctx);
      if (blocked) return blocked;
      const { data } = await sb.from('app_admin').select('gemini_api_key').eq('id', 1).maybeSingle();
      const apiKey = data?.gemini_api_key;
      if (!apiKey) {
        return json({ ok: false, error: 'NO_GEMINI_KEY' }, 503);
      }
      const profile = {
        name: ctx.acting.name,
        age: ctx.acting.age,
        targetCalories: ctx.acting.target_calories,
      };
      if (action === 'ask') {
        const question = String(payload.question || '').slice(0, 2000);
        if (!question.trim()) return json({ ok: false, error: 'Falta la pregunta.' }, 400);
        const prompt = `Pregunta de ${profile.name} (dieta ${profile.targetCalories} kcal): "${question}"

Responde en español, 3-6 frases, sin markdown recargado.
Humor seco e inteligente; nada de mimos ni "de mi alma".
Si pregunta por calorías de algo concreto, da una estimación razonable.
Si implica alcohol, azúcar, miel o cerveza sin alcohol: prohíbelo con claridad y ofrece una alternativa.`;
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
  "message": "Comentario breve, elegante y con ironía fina explicando el cambio (sin cursilerías)",
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
        message: parsed.message || 'Cambio aplicado.',
        recipeName: parsed.recipeName,
        recipeUrl: parsed.recipeUrl ?? null,
        items: parsed.items,
      });
    }

    if (action === 'personalizeMenu' || action === 'importMenu') {
      if (!ctx) return json({ ok: false, error: 'Inicia sesión.' }, 401);
      const blocked = requireApproved(ctx);
      if (blocked) return blocked;
      if (ctx.acting.id === 'maria_ignacia') {
        return json({ ok: false, error: 'El menú de María Ignacia no se sustituye: es la pauta hospitalaria.' }, 403);
      }
      const { data } = await sb.from('app_admin').select('gemini_api_key').eq('id', 1).maybeSingle();
      const apiKey = data?.gemini_api_key;
      if (!apiKey) return json({ ok: false, error: 'NO_GEMINI_KEY' }, 503);
      const profile = {
        name: ctx.acting.name,
        age: ctx.acting.age,
        targetCalories: ctx.acting.target_calories,
      };

      let prompt = '';
      if (action === 'importMenu') {
        const pdfText = String(payload.pdfText || '').slice(0, 24000);
        if (pdfText.length < 40) return json({ ok: false, error: 'El PDF no tiene texto suficiente.' }, 400);
        prompt = `Extrae SOLO comidas (almuerzo) y cenas del siguiente menú. Ignora límites calóricos. Si hay una semana, saca 7 comidas y 7 cenas; si hay más días, hasta 14 de cada.

Texto del PDF:
${pdfText}

Devuelve JSON exacto:
{
  "estimatedDailyKcal": 2200,
  "lunches": [{ "recipeName": "...", "items": [{ "name": "...", "quantity": "...", "notes": null }] }],
  "dinners": [{ "recipeName": "...", "items": [{ "name": "...", "quantity": "...", "notes": null }] }]
}`;
      } else {
        const intake = (payload.intake || {}) as Record<string, unknown>;
        prompt = `Diseña un ciclo de 7 comidas y 7 cenas para ${profile.name}.
NO fuerces 1500 kcal. Adapta a hábitos reales.
Tomas habituales: ${JSON.stringify(intake.mealsEaten || [])}
Deporte: ${intake.sport || 'none'} (${intake.sportDays || 0} días/semana)
Le gusta: ${JSON.stringify(intake.likes || [])}
Evita: ${JSON.stringify(intake.dislikes || [])}
Alergias: ${intake.allergies || 'ninguna'}
Notas: ${intake.notes || '—'}
Cocina española / murciana, cantidades caseras claras (g o cucharadas). Thermomix si encaja.

JSON exacto:
{
  "estimatedDailyKcal": 2000,
  "lunches": [{ "recipeName": "...", "items": [{ "name": "...", "quantity": "...", "notes": null }] }],
  "dinners": [{ "recipeName": "...", "items": [{ "name": "...", "quantity": "...", "notes": null }] }]
}`;
      }

      const rawText = await callGemini(apiKey, prompt, true, profile, true);
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return json({ ok: false, error: 'No pude interpretar el menú. Prueba de nuevo.' }, 500);
      const parsed = JSON.parse(jsonMatch[0]);
      return json({
        ok: true,
        lunches: Array.isArray(parsed.lunches) ? parsed.lunches : [],
        dinners: Array.isArray(parsed.dinners) ? parsed.dinners : [],
        estimatedDailyKcal: Number(parsed.estimatedDailyKcal) || null,
      });
    }

    if (
      action === 'bootstrapUsers' ||
      action === 'login' ||
      action === 'setUserPassword' ||
      action === 'bootstrap' ||
      action === 'loginAdmin'
    ) {
      return json(
        {
          ok: false,
          error:
            'Auth actualizado: usa email/contraseña de Supabase (registro, entrar u olvidé mi contraseña).',
        },
        400
      );
    }

    return json({ ok: false, error: 'Acción desconocida' }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ ok: false, error: message }, 500);
  }
});
