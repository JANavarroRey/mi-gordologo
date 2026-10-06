import type { FoodIntake } from '../models/types';
import { applyLunchDinnerLists, mealFromParts } from './menuAdaptService';
import { backendService } from './backendService';
import { extractPdfText } from './pdfTextService';
import { storageService } from './storageService';

type RawMeal = { recipeName?: string; items?: Array<{ name?: string; quantity?: string; notes?: string | null }> };

function applyLists(lunches: RawMeal[] | undefined, dinners: RawMeal[] | undefined): void {
  const lunchMeals = (lunches || []).map((l) => mealFromParts('lunch', l.recipeName || 'Comida', l.items || []));
  const dinnerMeals = (dinners || []).map((d) => mealFromParts('dinner', d.recipeName || 'Cena', d.items || []));
  if (!lunchMeals.length && !dinnerMeals.length) {
    throw new Error('No he sacado comidas ni cenas. Prueba de nuevo.');
  }
  const next = applyLunchDinnerLists(storageService.getMenus(), lunchMeals, dinnerMeals);
  storageService.replaceUserMenus(next);
}

export async function personalizeFromIntake(intake: FoodIntake): Promise<string> {
  if (storageService.getActiveUserId() === 'maria_ignacia') {
    throw new Error('El menú de María Ignacia no se sustituye.');
  }
  const res = await backendService.personalizeMenu(intake);
  if (!res.ok) throw new Error(res.error || 'No se pudo adaptar el menú.');
  applyLists(res.lunches, res.dinners);
  storageService.setFoodIntake(intake);
  return 'Comidas y cenas adaptadas a tus hábitos.';
}

export async function importMenuFromPdf(file: File): Promise<string> {
  if (storageService.getActiveUserId() === 'maria_ignacia') {
    throw new Error('El menú de María Ignacia no se sustituye.');
  }
  const pdfText = await extractPdfText(file);
  const res = await backendService.importMenu(pdfText);
  if (!res.ok) throw new Error(res.error || 'No se pudo leer el menú del PDF.');
  applyLists(res.lunches, res.dinners);
  const current = storageService.getActiveProfile().foodIntake;
  storageService.setFoodIntake({
    completedAt: new Date().toISOString(),
    mealsEaten: current?.mealsEaten || ['lunch', 'dinner'],
    sport: current?.sport || 'none',
    sportDays: current?.sportDays || 0,
    likes: current?.likes || [],
    dislikes: current?.dislikes || [],
    allergies: current?.allergies || '',
    notes: current?.notes || '',
    importedFromPdf: true,
  });
  return 'Comidas y cenas sustituidas por el PDF, sin recortar calorías. Desayunos y meriendas se mantienen.';
}
