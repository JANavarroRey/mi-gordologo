import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_INSTRUCTION = `Eres "El Gordólogo", un asistente médico y nutricionista con chispa, empático, cómplice y un toque de sátira cariñosa pero con absoluto rigor clínico.
Estás asesorando principalmente a María Ignacia, una mujer de casi 70 años de Murcia que sigue una dieta de 1.500 kcal pautada por la Unidad de Endocrinología y Nutrición del Hospital Morales Meseguer.

Reglas clínicas inquebrantables del hospital:
1. Las carnes magras son de 100g en crudo (pollo, pavo, conejo, ternera).
2. Los pescados blancos son de 150g; azules/semigrasos son de 100g.
3. Legumbres: 60g crudas (unas 9 cucharadas soperas cocidas).
4. Arroz o pasta: 60g crudos en comida; 45g en cena.
5. Patatas: 200g (2 pequeñas) o 100g (1 pequeña) según plato.
6. Aceite de oliva virgen extra: máximo 1 - 1,5 cucharadas soperas por comida.
7. Pan integral: 20g (2 biscotes) en la mayoría de tomas.
8. Siempre que sugieras recetas elaboradas, prioriza preparaciones aptas para Thermomix.
9. Responde siempre en español, de forma muy clara, con frases directas, fácil de leer para personas mayores.
10. Tono: cariñoso, divertido, sin tecnicismos difíciles, motivador y nunca despectivo.`;

const SESSION_DAYS = 14;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(url, key, { auth: { persistSession: false } });
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
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
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

async function requireAdmin(sb: ReturnType<typeof serviceClient>, token: string | null) {
  if (!token) return false;
  const { data } = await sb.from('admin_sessions').select('token, expires_at').eq('token', token).maybeSingle();
  if (!data) return false;
  if (new Date(data.expires_at).getTime() < Date.now()) {
    await sb.from('admin_sessions').delete().eq('token', token);
    return false;
  }
  return true;
}

async function callGemini(apiKey: string, userText: string, jsonMode: boolean): Promise<string> {
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' +
    encodeURIComponent(apiKey);
  const body: Record<string, unknown> = {
    system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
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
  const sb = serviceClient();

  try {
    if (action === 'status') {
      const { data } = await sb.from('app_admin').select('id, gemini_api_key').eq('id', 1).maybeSingle();
      return json({
        ok: true,
        backend: true,
        hasAdmin: Boolean(data),
        hasGemini: Boolean(data?.gemini_api_key),
      });
    }

    if (action === 'bootstrap') {
      const password = String(payload.password || '');
      if (password.length < 8) {
        return json({ ok: false, error: 'La contraseña de superadmin debe tener al menos 8 caracteres.' }, 400);
      }
      const { data: existing } = await sb.from('app_admin').select('id').eq('id', 1).maybeSingle();
      if (existing) {
        return json({ ok: false, error: 'El superadmin ya está creado. Entra con tu contraseña.' }, 409);
      }
      const salt = new Uint8Array(16);
      crypto.getRandomValues(salt);
      const password_hash = await hashPassword(password, salt);
      const { error } = await sb.from('app_admin').insert({
        id: 1,
        password_salt: b64(salt),
        password_hash,
        gemini_api_key: null,
      });
      if (error) return json({ ok: false, error: error.message }, 500);
      const token = randomToken();
      const expires = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();
      await sb.from('admin_sessions').insert({ token, expires_at: expires });
      return json({ ok: true, token, hasGemini: false });
    }

    if (action === 'login') {
      const password = String(payload.password || '');
      const { data } = await sb.from('app_admin').select('password_salt, password_hash, gemini_api_key').eq('id', 1).maybeSingle();
      if (!data) {
        return json({ ok: false, error: 'Aún no hay superadmin. Crea primero la contraseña.' }, 404);
      }
      const hash = await hashPassword(password, fromB64(data.password_salt));
      if (hash !== data.password_hash) {
        return json({ ok: false, error: 'Contraseña incorrecta.' }, 401);
      }
      const token = randomToken();
      const expires = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();
      await sb.from('admin_sessions').insert({ token, expires_at: expires });
      return json({ ok: true, token, hasGemini: Boolean(data.gemini_api_key) });
    }

    if (action === 'logout') {
      if (adminToken) await sb.from('admin_sessions').delete().eq('token', adminToken);
      return json({ ok: true });
    }

    if (action === 'setGeminiKey') {
      const allowed = await requireAdmin(sb, adminToken);
      if (!allowed) return json({ ok: false, error: 'Sesión de superadmin no válida.' }, 401);
      const apiKey = String(payload.apiKey || '').trim();
      if (!apiKey.startsWith('AIza') || apiKey.length < 20) {
        return json({ ok: false, error: 'Esa no parece una clave de Google AI Studio (AIza…).' }, 400);
      }
      const { error } = await sb
        .from('app_admin')
        .update({ gemini_api_key: apiKey, updated_at: new Date().toISOString() })
        .eq('id', 1);
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true, hasGemini: true });
    }

    if (action === 'ask' || action === 'adjustMeal') {
      const { data } = await sb.from('app_admin').select('gemini_api_key').eq('id', 1).maybeSingle();
      const apiKey = data?.gemini_api_key;
      if (!apiKey) {
        return json({ ok: false, error: 'NO_GEMINI_KEY' }, 503);
      }
      if (action === 'ask') {
        const question = String(payload.question || '').slice(0, 2000);
        if (!question.trim()) return json({ ok: false, error: 'Falta la pregunta.' }, 400);
        const prompt = `Pregunta del paciente: "${question}"

Responde en español, 3-8 frases claras, sin markdown complejo.
Si pregunta por calorías de algo concreto, da una estimación razonable.
Si implica alcohol, azúcar, miel o cerveza sin alcohol: prohíbelo con firmeza pero cariño y sugiere alternativa.`;
        const text = await callGemini(apiKey, prompt, false);
        return json({ ok: true, text });
      }

      const mealType = String(payload.mealType || '');
      const userPrompt = String(payload.userPrompt || '').slice(0, 2000);
      const currentMeal = payload.currentMeal as Record<string, unknown> | undefined;
      if (!mealType || !userPrompt || !currentMeal) {
        return json({ ok: false, error: 'Faltan datos del plato.' }, 400);
      }
      const items = Array.isArray(currentMeal.items) ? currentMeal.items : [];
      const prompt = `El usuario quiere modificar el plato de "${mealType}".
Plato actual:
- Nombre: ${currentMeal.recipeName || 'Plato'}
- Ingredientes actuales: ${items.map((i: { name?: string; quantity?: string }) => `${i.name} (${i.quantity || ''})`).join(', ')}

Petición del usuario: "${userPrompt}"

Por favor, devuelve un JSON válido con el siguiente formato exacto:
{
  "message": "Comentario ingenioso y profesional del Gordólogo explicando el cambio",
  "recipeName": "Nuevo nombre del plato o receta",
  "recipeUrl": "URL de Cookidoo o Thermomix si aplica o null",
  "items": [
    { "name": "Nombre ingrediente", "quantity": "Cantidad recomendada", "notes": "opcional" }
  ]
}`;
      const rawText = await callGemini(apiKey, prompt, true);
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

    return json({ ok: false, error: 'Acción desconocida' }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ ok: false, error: message }, 500);
  }
});
