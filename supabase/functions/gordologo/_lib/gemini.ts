import type { AuthContext, ServiceSupabase } from './auth.ts';
import { json } from './http.ts';

export function normalizeGeminiKey(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .replace(/\s+/g, '');
}

export function isLikelyGeminiKey(apiKey: string): boolean {
  if (apiKey.length < 20 || apiKey.length > 512) return false;
  return apiKey.startsWith('AIza') || apiKey.startsWith('AQ.');
}

function systemInstruction(
  profile?: { name?: string; age?: number; targetCalories?: number },
  skipCalorieRules = false
) {
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
      if (!res.ok) continue;
      const text =
        raw?.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text || '')
          .join('') || '';
      if (text.trim()) return String(text).trim();
    } catch {
      continue;
    }
  }
  throw new Error('AI_UNAVAILABLE');
}

async function loadGeminiKey(sb: ServiceSupabase): Promise<string | null> {
  const { data } = await sb.from('app_admin').select('gemini_api_key').eq('id', 1).maybeSingle();
  return data?.gemini_api_key ? String(data.gemini_api_key) : null;
}

export async function handleAiAction(
  sb: ServiceSupabase,
  ctx: AuthContext,
  action: 'ask' | 'adjustMeal' | 'personalizeMenu' | 'importMenu',
  payload: Record<string, unknown>
): Promise<Response> {
  if ((action === 'personalizeMenu' || action === 'importMenu') && ctx.acting.id === 'maria_ignacia') {
    return json(
      { ok: false, error: 'El menú de este perfil no se sustituye: es la pauta hospitalaria.' },
      403
    );
  }

  const apiKey = await loadGeminiKey(sb);
  if (!apiKey) {
    // Error genérico sin revelar configuración interna de clave API a usuarios normales
    return json(
      { ok: false, error: 'AI_UNAVAILABLE' },
      503
    );
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

  if (action === 'adjustMeal') {
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
  if (!jsonMatch) {
    return json({ ok: false, error: 'No pude interpretar el menú. Prueba de nuevo.' }, 500);
  }
  const parsed = JSON.parse(jsonMatch[0]);
  return json({
    ok: true,
    lunches: Array.isArray(parsed.lunches) ? parsed.lunches : [],
    dinners: Array.isArray(parsed.dinners) ? parsed.dinners : [],
    estimatedDailyKcal: Number(parsed.estimatedDailyKcal) || null,
  });
}
