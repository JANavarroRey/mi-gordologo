// === TIPOS DEL DOMINIO Mi Gordólogo ===

export interface UserProfile {
  readonly id: string;
  readonly name: string;
  readonly age: number;
  readonly height: number; // cm
  readonly targetCalories: number;
  readonly linkedMenuUserId: string | null;
  readonly createdAt: string;
  readonly role?: 'superadmin' | 'member';
  readonly gender?: 'male' | 'female' | null;
  readonly activityLevel?: 'sedentary' | 'moderate' | 'active' | null;
  readonly goal?: 'lose_weight' | 'maintain' | null;
}

export interface BodyMeasurement {
  readonly id: string;
  readonly userId: string;
  readonly date: string;
  readonly weight: number; // kg
  readonly bmi: number | null;
  readonly fatMass: number | null; // kg
  readonly fatPercent: number | null;
  readonly freeFatMass: number | null; // kg
  readonly leanMass: number | null; // kg
  readonly skeletalMuscle: number | null; // kg
  readonly totalWater: number | null; // kg
  readonly waterPercent: number | null;
  readonly boneMinerals: number | null; // kg
  readonly proteins: number | null; // kg
  readonly visceralFat: number | null;
  readonly metabolicRate: number | null;
  readonly metabolicAge: number | null;
  readonly basalMetabolism: number | null; // kcal
}

export type MealType = 'breakfast' | 'midMorning' | 'lunch' | 'snack' | 'dinner' | 'recena';

export interface MealItem {
  readonly name: string;
  readonly quantity: string | null; // '150g', '2 cucharadas', etc.
  readonly notes: string | null;
}

export interface Meal {
  readonly type: MealType;
  readonly items: readonly MealItem[];
  readonly recipeUrl: string | null; // Preferiblemente Thermomix/Cookidoo
  readonly recipeName: string | null;
  readonly totalCalories: number | null;
  /** Identificador hospitalario (ej: comida_07, cena_11) */
  readonly menuId?: string | null;
}

export interface DayMenu {
  readonly dayOfWeek: number; // 0=Lunes, 6=Domingo
  readonly dayLabel: string; // 'Lunes', 'Martes'...
  readonly isFreeDay: boolean;
  readonly meals: Record<MealType, Meal>;
}

export interface WeekMenu {
  readonly weekNumber: number; // 1-8 (ciclo de 8 semanas)
  readonly days: readonly DayMenu[];
}

export interface MonthlyMenu {
  readonly id: string;
  readonly userId: string;
  readonly yearMonth: string; // '2026-10'
  readonly weeks: readonly WeekMenu[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ShoppingItem {
  readonly id: string;
  readonly name: string;
  readonly quantity: string;
  readonly unit: string;
  readonly category: ShoppingCategory;
  readonly checked: boolean;
}

export type ShoppingCategory =
  | 'frutas'
  | 'verduras'
  | 'carnes'
  | 'pescados'
  | 'lacteos'
  | 'cereales'
  | 'legumbres'
  | 'conservas'
  | 'condimentos'
  | 'otros';

export interface ShoppingList {
  readonly id: string;
  readonly userId: string;
  readonly weekMenuId: string;
  readonly items: readonly ShoppingItem[];
}

// Constantes de la app
export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Desayuno',
  midMorning: 'Media Mañana',
  lunch: 'Comida',
  snack: 'Merienda',
  dinner: 'Cena',
  recena: 'Antes de Dormir',
} as const;

export const DAY_LABELS = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
] as const;

export const DEFAULT_FREE_DAY = 5; // Sábado (0-indexed from Lunes)
export const TARGET_CALORIES = 1500;
