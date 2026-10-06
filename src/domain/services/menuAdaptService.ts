import { buildCookidooSearchUrl } from '@/data/hospitalMenuSeed';
import type { Meal, MealItem, MealType, WeekMenu } from '../models/types';

export function mealFromParts(
  type: MealType,
  recipeName: string,
  items: Array<{ name?: string; quantity?: string | null; notes?: string | null }>
): Meal {
  const clean: MealItem[] = (items || [])
    .filter((i) => i && i.name)
    .map((i) => ({
      name: String(i.name),
      quantity: i.quantity ? String(i.quantity) : null,
      notes: i.notes ? String(i.notes) : null,
    }));
  return {
    type,
    recipeName: recipeName || 'Plato',
    recipeUrl: buildCookidooSearchUrl(recipeName || clean[0]?.name || 'receta'),
    items: clean.length ? clean : [{ name: recipeName || 'Plato', quantity: null, notes: null }],
    totalCalories: null,
  };
}

export function applyLunchDinnerLists(
  base: WeekMenu[],
  lunches: Meal[],
  dinners: Meal[]
): WeekMenu[] {
  if (!base.length || (!lunches.length && !dinners.length)) return base;
  return base.map((week, wi) => ({
    ...week,
    days: week.days.map((day, di) => {
      const idx = (wi * 7 + di) % Math.max(lunches.length || dinners.length, 1);
      const lunch = lunches.length ? lunches[idx % lunches.length] : day.meals.lunch;
      const dinner = dinners.length ? dinners[idx % dinners.length] : day.meals.dinner;
      return {
        ...day,
        meals: {
          ...day.meals,
          lunch: { ...lunch, type: 'lunch' as const },
          dinner: { ...dinner, type: 'dinner' as const },
        },
      };
    }),
  }));
}
