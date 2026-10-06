import type { Meal, WeekMenu } from '../models/types';

function parseGrams(qty: string | null | undefined): number | null {
  if (!qty) return null;
  const m = qty.replace(',', '.').match(/(\d+(?:\.\d+)?)\s*g\b/i);
  if (!m) return null;
  return parseFloat(m[1]);
}

function estimateMealKcal(meal: Meal | undefined | null): number {
  if (!meal) return 0;
  if (meal.totalCalories && meal.totalCalories > 0) return meal.totalCalories;

  let kcal = 0;
  for (const item of meal.items || []) {
    const name = (item.name || '').toLowerCase();
    const g = parseGrams(item.quantity);
    if (/aceite|aove/.test(name)) {
      const oil = g ?? (/1[,.]?5|1½|1,5/.test(item.quantity || '') ? 15 : 10);
      kcal += oil * 9;
      continue;
    }
    if (/pan|biscote/.test(name)) {
      kcal += (g ?? 20) * 2.5;
      continue;
    }
    if (/arroz|pasta|couscous|cuscús/.test(name)) {
      kcal += (g ?? 60) * 3.5; // crudo aprox
      continue;
    }
    if (/lenteja|garbanzo|alubia|legumbre/.test(name)) {
      kcal += (g ?? 60) * 3.3;
      continue;
    }
    if (/pato|pollo|pavo|ternera|carne|conejo|jamón|jamon/.test(name)) {
      kcal += (g ?? 100) * 1.2;
      continue;
    }
    if (/pescado|merluza|dorada|lubina|salmón|salmon|atún|atun|bacalao|rape|sepia|calamar/.test(name)) {
      kcal += (g ?? 150) * 1.0;
      continue;
    }
    if (/huevo/.test(name)) {
      kcal += /clara/.test(name) ? 20 : 75;
      continue;
    }
    if (/yogur|leche|queso/.test(name)) {
      kcal += g ? g * 0.5 : 60;
      continue;
    }
    if (/fruta|manzana|naranja|pera|kiwi|plátano|platano|melón|melon|sandía|sandia/.test(name)) {
      kcal += (g ?? 150) * 0.5;
      continue;
    }
    if (/verdura|ensalada|tomate|lechuga|judía|judia|calabacín|calabacin|espinaca|patata/.test(name)) {
      if (/patata/.test(name)) kcal += (g ?? 100) * 0.8;
      else kcal += (g ?? 200) * 0.25;
      continue;
    }
    // genérico
    kcal += g ? Math.min(g * 1.2, 350) : 80;
  }
  // suelo mínimo por tipo de toma
  if (meal.type === 'lunch') return Math.max(kcal, 450);
  if (meal.type === 'dinner') return Math.max(kcal, 350);
  if (meal.type === 'breakfast') return Math.max(kcal, 200);
  return Math.max(kcal, 50);
}

/** Media diaria estimada del menú (días no libres), redondeada a 50 kcal. */
export function estimateAverageDailyKcal(menus: WeekMenu[]): number {
  let sum = 0;
  let days = 0;
  for (const week of menus) {
    for (const day of week.days) {
      if (day.isFreeDay) continue;
      let dayKcal = 0;
      for (const meal of Object.values(day.meals)) {
        dayKcal += estimateMealKcal(meal);
      }
      if (dayKcal > 0) {
        sum += dayKcal;
        days += 1;
      }
    }
  }
  if (!days) return 0;
  return Math.round(sum / days / 50) * 50;
}

export function formatKcalLabel(kcal: number): string {
  if (!kcal || kcal <= 0) return '— kcal';
  return `${kcal.toLocaleString('es-ES')} kcal`;
}
