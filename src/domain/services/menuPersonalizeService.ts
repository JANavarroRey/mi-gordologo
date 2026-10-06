import type { FoodIntake } from '../models/types';
import { applyLunchDinnerLists, mealFromParts } from './menuAdaptService';
import { backendService } from './backendService';
import { extractPdfText } from './pdfTextService';
import { storageService } from './storageService';
import { authSyncService } from './authSyncService';
import { estimateAverageDailyKcal, formatKcalLabel } from './calorieEstimateService';

type RawMeal = { recipeName?: string; items?: Array<{ name?: string; quantity?: string; notes?: string | null }> };

export type MenuImportResult = {
  message: string;
  estimatedDailyKcal: number;
  lunchCount: number;
  dinnerCount: number;
};

function friendlyError(raw?: string): string {
  const t = (raw || '').toLowerCase();
  if (/acci[oó]n desconocida/.test(t)) {
    return 'El servidor aún no tiene esta función. Prueba de nuevo en un minuto; si sigue igual, recarga la app.';
  }
  if (t.includes('no_gemini_key') || t.includes('gemini')) {
    return 'Falta la clave de IA o está saturada. Revisa Superadmin o prueba más tarde.';
  }
  return raw || 'No se pudo adaptar el menú.';
}

function applyLists(lunches: RawMeal[] | undefined, dinners: RawMeal[] | undefined): void {
  const lunchMeals = (lunches || []).map((l) => mealFromParts('lunch', l.recipeName || 'Comida', l.items || []));
  const dinnerMeals = (dinners || []).map((d) => mealFromParts('dinner', d.recipeName || 'Cena', d.items || []));
  if (!lunchMeals.length && !dinnerMeals.length) {
    throw new Error('No he sacado comidas ni cenas. Prueba de nuevo.');
  }
  const next = applyLunchDinnerLists(storageService.getMenus(), lunchMeals, dinnerMeals);
  storageService.replaceUserMenus(next);
}

function finalizeMenuChange(intake: FoodIntake, estimatedFromServer?: number | null): number {
  const estimated =
    estimatedFromServer && estimatedFromServer > 800
      ? Math.round(estimatedFromServer / 50) * 50
      : estimateAverageDailyKcal(storageService.getMenus());
  storageService.setMenuDisplayKcal(estimated);
  storageService.setFoodIntake({ ...intake, estimatedDailyKcal: estimated });
  storageService.resetShoppingListsForMenuChange();
  return estimated;
}

function pick(likes: readonly string[], options: Array<{ tags: string[]; meal: RawMeal }>, fallback: RawMeal[]): RawMeal[] {
  const liked = options.filter((o) => o.tags.some((tag) => likes.includes(tag)));
  const pool = liked.length ? liked.map((o) => o.meal) : fallback;
  const out: RawMeal[] = [];
  for (let i = 0; i < 7; i++) out.push(pool[i % pool.length]);
  return out;
}

function localMenuFromIntake(intake: FoodIntake): { lunches: RawMeal[]; dinners: RawMeal[] } {
  const lunchBank: Array<{ tags: string[]; meal: RawMeal }> = [
    {
      tags: ['Pescado'],
      meal: {
        recipeName: 'Merluza al vapor con verduras',
        items: [
          { name: 'Merluza', quantity: '150 g', notes: 'en crudo' },
          { name: 'Judías verdes', quantity: '200 g', notes: null },
          { name: 'Patata cocida', quantity: '100 g', notes: null },
          { name: 'AOVE', quantity: '1,5 cdas', notes: null },
        ],
      },
    },
    {
      tags: ['Carne'],
      meal: {
        recipeName: 'Pollo a la plancha con ensalada',
        items: [
          { name: 'Pechuga de pollo', quantity: '100 g', notes: 'en crudo' },
          { name: 'Ensalada mixta', quantity: '250 g', notes: null },
          { name: 'Pan integral', quantity: '20 g', notes: null },
          { name: 'AOVE', quantity: '1,5 cdas', notes: null },
        ],
      },
    },
    {
      tags: ['Legumbres'],
      meal: {
        recipeName: 'Lentejas estofadas',
        items: [
          { name: 'Lentejas', quantity: '60 g', notes: 'en crudo' },
          { name: 'Verdura de guiso', quantity: '150 g', notes: null },
          { name: 'Ensalada', quantity: '100 g', notes: null },
        ],
      },
    },
    {
      tags: ['Pasta/arroz'],
      meal: {
        recipeName: 'Arroz con verduras',
        items: [
          { name: 'Arroz', quantity: '60 g', notes: 'en crudo' },
          { name: 'Verduras', quantity: '200 g', notes: null },
          { name: 'AOVE', quantity: '1 cda', notes: null },
        ],
      },
    },
    {
      tags: ['Huevos'],
      meal: {
        recipeName: 'Tortilla francesa con ensalada',
        items: [
          { name: 'Huevo', quantity: '1 + 1 clara', notes: null },
          { name: 'Ensalada', quantity: '300 g', notes: null },
          { name: 'Pan integral', quantity: '20 g', notes: null },
        ],
      },
    },
    {
      tags: ['Guisos', 'Verduras'],
      meal: {
        recipeName: 'Hervido murciano de verduras con pescado',
        items: [
          { name: 'Pescado blanco', quantity: '150 g', notes: null },
          { name: 'Judía verde y patata', quantity: '300 g', notes: null },
        ],
      },
    },
  ];
  const dinnerBank: Array<{ tags: string[]; meal: RawMeal }> = [
    {
      tags: ['Pescado', 'Plancha'],
      meal: {
        recipeName: 'Dorada a la plancha',
        items: [
          { name: 'Dorada', quantity: '150 g', notes: null },
          { name: 'Verduras a la plancha', quantity: '250 g', notes: null },
          { name: 'AOVE', quantity: '1 cda', notes: null },
        ],
      },
    },
    {
      tags: ['Ensaladas', 'Huevos'],
      meal: {
        recipeName: 'Ensalada completa con huevo',
        items: [
          { name: 'Ensalada mixta', quantity: '300 g', notes: null },
          { name: 'Huevo duro', quantity: '1 unidad', notes: null },
          { name: 'Atún al natural', quantity: '60 g', notes: null },
        ],
      },
    },
    {
      tags: ['Verduras'],
      meal: {
        recipeName: 'Crema de calabacín con merluza',
        items: [
          { name: 'Crema de calabacín', quantity: '300 g', notes: null },
          { name: 'Merluza', quantity: '150 g', notes: null },
        ],
      },
    },
    {
      tags: ['Carne', 'Plancha'],
      meal: {
        recipeName: 'Pavo a la plancha con calabacín',
        items: [
          { name: 'Pavo', quantity: '100 g', notes: null },
          { name: 'Calabacín a la plancha', quantity: '250 g', notes: null },
        ],
      },
    },
    {
      tags: ['Lácteos', 'Verduras'],
      meal: {
        recipeName: 'Revuelto de claras con verdura',
        items: [
          { name: 'Claras', quantity: '2', notes: null },
          { name: 'Espinacas', quantity: '200 g', notes: null },
          { name: 'Queso fresco 0%', quantity: '35 g', notes: null },
        ],
      },
    },
  ];
  const avoid = new Set((intake.dislikes || []).map((d) => d.toLowerCase()));
  const filterAvoid = (meals: RawMeal[]) =>
    meals.filter((m) => ![m.recipeName, ...(m.items || []).map((i) => i.name || '')].join(' ').toLowerCase().split(/\s+/).some((w) => avoid.has(w)));
  const lunches = filterAvoid(pick(intake.likes, lunchBank, lunchBank.map((b) => b.meal)));
  const dinners = filterAvoid(pick(intake.likes, dinnerBank, dinnerBank.map((b) => b.meal)));
  return {
    lunches: lunches.length ? lunches : lunchBank.map((b) => b.meal).slice(0, 7),
    dinners: dinners.length ? dinners : dinnerBank.map((b) => b.meal).slice(0, 7),
  };
}

function parseMenuPayload(res: {
  lunches?: RawMeal[];
  dinners?: RawMeal[];
  text?: string;
  message?: string;
  estimatedDailyKcal?: number;
}): { lunches: RawMeal[]; dinners: RawMeal[]; estimatedDailyKcal?: number } | null {
  if ((res.lunches && res.lunches.length) || (res.dinners && res.dinners.length)) {
    return {
      lunches: res.lunches || [],
      dinners: res.dinners || [],
      estimatedDailyKcal: typeof res.estimatedDailyKcal === 'number' ? res.estimatedDailyKcal : undefined,
    };
  }
  const blob = res.text || res.message || '';
  const match = blob.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as {
      lunches?: RawMeal[];
      dinners?: RawMeal[];
      estimatedDailyKcal?: number;
    };
    if ((parsed.lunches && parsed.lunches.length) || (parsed.dinners && parsed.dinners.length)) {
      return {
        lunches: parsed.lunches || [],
        dinners: parsed.dinners || [],
        estimatedDailyKcal: parsed.estimatedDailyKcal,
      };
    }
  } catch {
    return null;
  }
  return null;
}

async function requestAdaptedMenu(intake: FoodIntake): Promise<{ lunches: RawMeal[]; dinners: RawMeal[]; estimatedDailyKcal?: number }> {
  const primary = await backendService.personalizeMenu(intake);
  const parsed = parseMenuPayload(primary);
  if (primary.ok && parsed) return parsed;
  if (primary.error && !/acci[oó]n desconocida/i.test(primary.error) && primary.error !== 'NO_BACKEND') {
    throw new Error(friendlyError(primary.error));
  }
  return localMenuFromIntake(intake);
}

export async function personalizeFromIntake(intake: FoodIntake): Promise<string> {
  if (storageService.getActiveUserId() === 'maria_ignacia') {
    throw new Error('El menú de María Ignacia no se sustituye.');
  }
  const lists = await requestAdaptedMenu(intake);
  applyLists(lists.lunches, lists.dinners);
  const estimated = finalizeMenuChange({ ...intake, importedFromPdf: false }, lists.estimatedDailyKcal);
  await authSyncService.flushNow();
  return `Comidas y cenas adaptadas (~${formatKcalLabel(estimated)}/día). Lista de la compra actualizada.`;
}

export async function importMenuFromPdf(file: File): Promise<MenuImportResult> {
  if (storageService.getActiveUserId() === 'maria_ignacia') {
    throw new Error('El menú de María Ignacia no se sustituye.');
  }
  const pdfText = await extractPdfText(file);
  const res = await backendService.importMenu(pdfText);
  const parsed = parseMenuPayload(res);
  if (!res.ok || !parsed) throw new Error(friendlyError(res.error) || 'No se pudo leer el menú del PDF.');
  applyLists(parsed.lunches, parsed.dinners);
  const current = storageService.getActiveProfile().foodIntake;
  const estimated = finalizeMenuChange(
    {
      completedAt: new Date().toISOString(),
      mealsEaten: current?.mealsEaten || ['lunch', 'dinner'],
      sport: current?.sport || 'none',
      sportDays: current?.sportDays || 0,
      likes: current?.likes || [],
      dislikes: current?.dislikes || [],
      allergies: current?.allergies || '',
      notes: current?.notes || '',
      importedFromPdf: true,
    },
    parsed.estimatedDailyKcal ?? (typeof res.estimatedDailyKcal === 'number' ? res.estimatedDailyKcal : null)
  );
  await authSyncService.flushNow();
  return {
    estimatedDailyKcal: estimated,
    lunchCount: parsed.lunches.length,
    dinnerCount: parsed.dinners.length,
    message: `Menú del PDF cargado: ${parsed.lunches.length} comidas y ${parsed.dinners.length} cenas. Estimación ~${formatKcalLabel(estimated)}/día. Lista de la compra regenerada.`,
  };
}
