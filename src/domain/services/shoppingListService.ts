import type { WeekMenu, ShoppingCategory, MealType } from '@/domain/models/types';

export interface ShoppingListItem {
  id: string;
  name: string;
  baseQty: string;
  category: ShoppingCategory;
}

const SKIP_NAME = /^(postre|aceite de oliva|aceite de oliva virgen extra)$/i;

function categorize(name: string): ShoppingCategory {
  const n = name.toLowerCase();
  if (/yogur|leche|queso|quesito|burgos/.test(n)) return 'lacteos';
  if (/fruta|manzana|naranja|plátano|platano|pera|kiwi|fresa|melón|melon|sandía|sandia|uva|mandarina/.test(n)) return 'frutas';
  if (/pescado|merluza|dorada|lubina|salmón|salmon|atún|atun|caballa|sardina|calamar|sepia|marisco|gamba|mejillón|mejillon|rape|bacalao/.test(n)) return 'pescados';
  if (/pollo|pavo|ternera|carne|jamón|jamon|huevo|pechuga/.test(n)) return 'carnes';
  if (/garbanzo|lenteja|alubia|legumbre/.test(n)) return 'legumbres';
  if (/arroz|pasta|pan|biscote|cereal|avena|couscous|cuscús/.test(n)) return 'cereales';
  if (/atún al natural|conserva|lata|sardinilla/.test(n)) return 'conservas';
  if (/aceite|pimentón|pimenton|laurel|orégano|oregano|ajo|perejil|mostaza|especias|sal |vinagre/.test(n)) return 'condimentos';
  if (/patata|verdura|tomate|lechuga|pepino|judía|judia|apio|zanahoria|cebolla|calabacín|calabacin|berenjena|pimiento|champiñón|champinon|alcachofa|calabaza|col |espinaca|cardo/.test(n)) return 'verduras';
  return 'otros';
}

function normalizeKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Multiplica cantidades numéricas por el número de raciones */
export function scaleQuantity(qty: string, servings: number): string {
  if (servings === 1 || !qty) return qty;
  return qty.replace(
    /(\d+(?:[.,]\d+)?)\s*(g|ml|kg|l|unidad(?:es)?|pieza(?:s)?|cucharada(?:s)?|cdas?|biscote(?:s)?|lata(?:s)?|huevo(?:s)?|rebanada(?:s)?|taza(?:s)?|vaso(?:s)?)?/gi,
    (_, num, unit) => {
      const val = parseFloat(String(num).replace(',', '.'));
      const doubled = Math.round(val * servings * 10) / 10;
      const display = Number.isInteger(doubled) ? String(doubled) : String(doubled).replace('.', ',');
      return unit ? `${display} ${unit}` : display;
    }
  );
}

/**
 * Genera la lista de la compra agregando ingredientes del menú semanal
 * (omite día libre y postres/aceite genéricos ya cubiertos en despensa).
 */
export function buildShoppingListFromWeek(week: WeekMenu): ShoppingListItem[] {
  const aggregated = new Map<string, { name: string; quantities: string[]; category: ShoppingCategory }>();

  const mealOrder: MealType[] = ['breakfast', 'midMorning', 'lunch', 'snack', 'dinner', 'recena'];

  for (const day of week.days) {
    if (day.isFreeDay) continue;
    for (const type of mealOrder) {
      const meal = day.meals[type];
      if (!meal) continue;
      for (const item of meal.items) {
        if (SKIP_NAME.test(item.name)) continue;
        const key = normalizeKey(item.name);
        const existing = aggregated.get(key);
        const qty = item.quantity?.trim() || '';
        if (existing) {
          if (qty && !existing.quantities.includes(qty)) {
            existing.quantities.push(qty);
          }
        } else {
          aggregated.set(key, {
            name: item.name,
            quantities: qty ? [qty] : [],
            category: categorize(item.name),
          });
        }
      }
    }
  }

  // Despensa base siempre presente
  const baseItems: ShoppingListItem[] = [
    { id: `w${week.weekNumber}_oil`, name: 'Aceite de oliva virgen extra (AOVE)', baseQty: '1 botella (consumo medido)', category: 'condimentos' },
    { id: `w${week.weekNumber}_fruit`, name: 'Fruta fresca de temporada', baseQty: 'Según postres del menú (~2 piezas/día)', category: 'frutas' },
  ];

  const fromMenu: ShoppingListItem[] = Array.from(aggregated.entries()).map(([key, val], idx) => ({
    id: `w${week.weekNumber}_${idx}_${key.slice(0, 24).replace(/\s/g, '_')}`,
    name: val.name,
    baseQty: val.quantities.length > 0 ? val.quantities.join(' + ') : 'Según menú',
    category: val.category,
  }));

  // Evitar duplicar fruta genérica si ya hay entradas de fruta
  const hasFruit = fromMenu.some((i) => i.category === 'frutas');
  const extras = hasFruit ? baseItems.filter((i) => i.category !== 'frutas') : baseItems;

  return [...fromMenu, ...extras].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}
