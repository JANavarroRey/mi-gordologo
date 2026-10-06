import type { DayMenu, MealItem, WeekMenu } from '../models/types';
import { TARGET_CALORIES } from '../models/types';

export function calorieScaleFactor(targetCalories: number): number {
  if (!targetCalories || targetCalories <= 0) return 1;
  const factor = targetCalories / TARGET_CALORIES;
  if (Math.abs(factor - 1) < 0.04) return 1;
  return factor;
}

export function scaleQuantityString(qty: string | null | undefined, factor: number): string | null {
  if (!qty) return qty ?? null;
  if (factor === 1) return qty;
  return qty.replace(/(\d+(?:[.,]\d+)?)/g, (match) => {
    const num = parseFloat(match.replace(',', '.'));
    if (Number.isNaN(num)) return match;
    const multiplied = num * factor;
    const rounded = Number.isInteger(multiplied) ? multiplied : Math.round(multiplied * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace('.', ',');
  });
}

function scaleItems(items: readonly MealItem[], factor: number): MealItem[] {
  return items.map((item) => ({
    ...item,
    quantity: scaleQuantityString(item.quantity, factor),
  }));
}

export function scaleWeekMenusByFactor(menus: WeekMenu[], factor: number): WeekMenu[] {
  if (Math.abs(factor - 1) < 0.04) return menus;
  return menus.map((week) => ({
    ...week,
    days: week.days.map((day) => ({
      ...day,
      meals: Object.fromEntries(
        Object.entries(day.meals).map(([type, meal]) => [
          type,
          {
            ...meal,
            items: scaleItems(meal.items, factor),
            totalCalories:
              meal.totalCalories != null ? Math.round(meal.totalCalories * factor) : null,
          },
        ])
      ) as unknown as DayMenu['meals'],
    })),
  }));
}

export function scaleWeekMenus(menus: WeekMenu[], targetCalories: number): WeekMenu[] {
  return scaleWeekMenusByFactor(menus, calorieScaleFactor(targetCalories));
}

export function computeTargetCalories(data: {
  age: number;
  height: number;
  weight: number;
  gender?: 'male' | 'female';
  activityLevel: 'sedentary' | 'moderate' | 'active';
  goal: 'lose_weight' | 'maintain';
}): number {
  const genderOffset = data.gender === 'female' ? -161 : 5;
  const bmr = 10 * data.weight + 6.25 * data.height - 5 * data.age + genderOffset;
  const factor = data.activityLevel === 'sedentary' ? 1.2 : data.activityLevel === 'moderate' ? 1.4 : 1.6;
  const maintenance = Math.round(bmr * factor);
  return data.goal === 'lose_weight' ? Math.max(1400, maintenance - 450) : maintenance;
}
