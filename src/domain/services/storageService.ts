import type { UserProfile, BodyMeasurement, WeekMenu, DayMenu, ShoppingItem } from '../models/types';
import { getHospitalMenuSeed } from '@/data/hospitalMenuSeed';
import { computeTargetCalories, scaleWeekMenus, scaleWeekMenusByFactor } from './menuScaleService';

const STORAGE_KEYS = {
  PROFILES: 'migordologo_profiles',
  ACTIVE_USER: 'migordologo_active_user',
  ONBOARDING_DONE: 'migordologo_onboarding_done',
  MENUS: 'migordologo_menus',
  MEASUREMENTS: 'migordologo_measurements',
  SHOPPING: 'migordologo_shopping',
  SERVINGS: 'migordologo_servings',
  FREE_DAY: 'migordologo_free_day',
  GEMINI_KEY: 'migordologo_gemini_key',
  ALERT_SETTINGS: 'migordologo_alert_settings',
  DISMISSED_ALERT: 'migordologo_dismissed_alert',
  SEED_VERSION: 'migordologo_seed_version',
};

export const SUPERADMIN_PROFILE_ID = 'pepe';

export const DEFAULT_PROFILES: UserProfile[] = [
  {
    id: 'maria_ignacia',
    name: 'María Ignacia',
    age: 68,
    height: 167,
    targetCalories: 1500,
    linkedMenuUserId: null,
    createdAt: '2026-09-10T10:00:00Z',
    role: 'member',
    gender: 'female',
    activityLevel: 'sedentary',
    goal: 'lose_weight',
  },
  {
    id: SUPERADMIN_PROFILE_ID,
    name: 'Pepe',
    age: 0,
    height: 0,
    targetCalories: 1500,
    linkedMenuUserId: null,
    createdAt: '2026-10-06T10:00:00Z',
    role: 'superadmin',
  },
];

function ensureBuiltinProfiles(profiles: UserProfile[]): UserProfile[] {
  const hasMaria = profiles.some((p) => p.id === 'maria_ignacia');
  const hasPepe = profiles.some((p) => p.id === SUPERADMIN_PROFILE_ID);
  let next = [...profiles];
  if (!hasMaria) {
    next.unshift(DEFAULT_PROFILES[0]);
  }
  if (!hasPepe) {
    const pepe = DEFAULT_PROFILES.find((p) => p.id === SUPERADMIN_PROFILE_ID);
    if (pepe) next.push(pepe);
  }
  next = next.map((p) => {
    if (p.id === SUPERADMIN_PROFILE_ID) {
      return { ...p, linkedMenuUserId: null, role: 'superadmin' as const };
    }
    return p.role ? p : { ...p, role: 'member' as const };
  });
  return next;
}

function scheduleServerPush() {
  void import('./authSyncService').then(({ authSyncService }) => authSyncService.schedulePush());
}

// Mediciones reales extraídas del informe clínico del Hospital Morales Meseguer
export const INITIAL_MEASUREMENTS: BodyMeasurement[] = [
  {
    id: 'm1',
    userId: 'maria_ignacia',
    date: '2026-09-10',
    weight: 78.9,
    bmi: 28.3,
    fatMass: 33.9,
    fatPercent: 43.0,
    freeFatMass: 45.0,
    leanMass: 42.7,
    skeletalMuscle: 25.5,
    totalWater: 31.5,
    waterPercent: 39.9,
    boneMinerals: 2.3,
    proteins: 11.2,
    visceralFat: 11,
    metabolicRate: 9,
    metabolicAge: 77,
    basalMetabolism: 1377,
  },
  {
    id: 'm2',
    userId: 'maria_ignacia',
    date: '2026-09-22',
    weight: 77.8,
    bmi: 27.9,
    fatMass: 33.3,
    fatPercent: 42.8,
    freeFatMass: 44.5,
    leanMass: 42.2,
    skeletalMuscle: 25.2,
    totalWater: 31.1,
    waterPercent: 40.0,
    boneMinerals: 2.3,
    proteins: 11.1,
    visceralFat: 11,
    metabolicRate: 9,
    metabolicAge: 77,
    basalMetabolism: 1362,
  },
];

export interface EmailAlertSettings {
  email: string;
  enabled: boolean;
  dayOfWeek: number; // 0=Lunes, 6=Domingo
  time: string; // '09:00'
}

export const storageService = {
  // Onboarding inicial
  hasCompletedOnboarding(): boolean {
    return localStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE) === 'true';
  },

  setHasCompletedOnboarding(val: boolean): void {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, val ? 'true' : 'false');
  },

  // Perfiles
  getProfiles(): UserProfile[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(DEFAULT_PROFILES));
      return DEFAULT_PROFILES;
    }
    try {
      const parsed: UserProfile[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const withBuiltins = ensureBuiltinProfiles(parsed);
        const changed =
          withBuiltins.length !== parsed.length ||
          withBuiltins.some((p, i) => p.linkedMenuUserId !== parsed[i]?.linkedMenuUserId || p.role !== parsed[i]?.role);
        if (changed) {
          localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(withBuiltins));
        }
        return withBuiltins;
      }
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(DEFAULT_PROFILES));
      return DEFAULT_PROFILES;
    } catch {
      return DEFAULT_PROFILES;
    }
  },

  getActiveUserId(): string {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_USER) || 'maria_ignacia';
  },

  setActiveUserId(id: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, id);
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, 'true');
    // El evento nativo `storage` no se dispara en la misma pestaña.
    window.dispatchEvent(new Event('storage'));
  },

  getProfileById(id: string): UserProfile | undefined {
    return this.getProfiles().find((p) => p.id === id);
  },

  getActiveProfile(): UserProfile {
    const profiles = this.getProfiles();
    const activeId = this.getActiveUserId();
    return profiles.find((p) => p.id === activeId) || profiles[0];
  },

  isSuperadmin(userId?: string): boolean {
    const id = userId || this.getActiveUserId();
    const profile = this.getProfileById(id);
    return id === SUPERADMIN_PROFILE_ID || profile?.role === 'superadmin';
  },

  replaceProfiles(profiles: UserProfile[]): void {
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(ensureBuiltinProfiles(profiles)));
  },

  upsertProfile(updated: UserProfile): void {
    const profiles = this.getProfiles();
    const idx = profiles.findIndex((p) => p.id === updated.id);
    if (idx >= 0) profiles[idx] = { ...profiles[idx], ...updated };
    else profiles.push(updated);
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
  },

  updateProfile(updated: UserProfile): void {
    this.upsertProfile(updated);
    scheduleServerPush();
  },

  setLinkedMenuUser(userId: string, targetUserId: string | null): void {
    const profiles = this.getProfiles().map((p) => {
      if (p.id === userId) {
        return { ...p, linkedMenuUserId: targetUserId };
      }
      return p;
    });
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
  },

  createNewProfileWithIntake(data: {
    name: string;
    age: number;
    height: number;
    weight: number;
    gender?: 'male' | 'female';
    activityLevel: 'sedentary' | 'moderate' | 'active';
    goal: 'lose_weight' | 'maintain';
    linkedMenuUserId: string | null;
    weighInDay?: number;
    id?: string;
  }): UserProfile {
    const targetCalories = computeTargetCalories({
      age: data.age,
      height: data.height,
      weight: data.weight,
      gender: data.gender,
      activityLevel: data.activityLevel,
      goal: data.goal,
    });
    const genderOffset = data.gender === 'female' ? -161 : 5;
    const bmr = 10 * data.weight + 6.25 * data.height - 5 * data.age + genderOffset;

    const id = data.id || `usr_${Date.now()}`;
    const newProfile: UserProfile = {
      id,
      name: data.name.trim(),
      age: data.age,
      height: data.height,
      targetCalories,
      linkedMenuUserId: null,
      createdAt: new Date().toISOString(),
      role: 'member',
      gender: data.gender ?? null,
      activityLevel: data.activityLevel,
      goal: data.goal,
    };

    const profiles = this.getProfiles();
    profiles.push(newProfile);
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));

    // Si especificó día de pesaje, configurarlo
    if (data.weighInDay !== undefined) {
      this.setWeighInDay(data.weighInDay, id);
    }

    // Si tiene peso inicial, crear primera medición en su báscula privada
    if (data.weight > 0) {
      this.addMeasurement({
        userId: id,
        date: new Date().toISOString().split('T')[0],
        weight: data.weight,
        bmi: parseFloat((data.weight / ((data.height / 100) * (data.height / 100))).toFixed(1)),
        fatMass: null,
        fatPercent: null,
        freeFatMass: null,
        leanMass: null,
        skeletalMuscle: null,
        totalWater: null,
        waterPercent: null,
        boneMinerals: null,
        proteins: null,
        visceralFat: null,
        metabolicRate: null,
        metabolicAge: data.age,
        basalMetabolism: Math.round(bmr),
      }, id);
    }

    this.setActiveUserId(id);
    const scaled = scaleWeekMenus(getHospitalMenuSeed(), targetCalories);
    this.saveMenus(scaled, id);
    scheduleServerPush();
    return newProfile;
  },

  addProfile(name: string, age: number, height: number): UserProfile {
    return this.createNewProfileWithIntake({
      name,
      age,
      height,
      weight: 70,
      activityLevel: 'moderate',
      goal: 'lose_weight',
      linkedMenuUserId: null,
    });
  },

  // Raciones (1 o 2 personas)
  getServings(userId?: string): number {
    const targetUser = userId || this.getActiveUserId();
    const raw = localStorage.getItem(`${STORAGE_KEYS.SERVINGS}_${targetUser}`);
    if (raw) return parseInt(raw, 10);
    // Para María Ignacia por defecto son 2 (madre + padre)
    return targetUser === 'maria_ignacia' ? 2 : 1;
  },

  setServings(count: number, userId?: string): void {
    const targetUser = userId || this.getActiveUserId();
    localStorage.setItem(`${STORAGE_KEYS.SERVINGS}_${targetUser}`, count.toString());
    scheduleServerPush();
  },

  // Día libre: desactivado por defecto. Si se habilita, se elige el día (0=Lun…6=Dom).
  isFreeDayEnabled(userId?: string): boolean {
    const targetUser = userId || this.getActiveUserId();
    return localStorage.getItem(`${STORAGE_KEYS.FREE_DAY}_${targetUser}_enabled`) === '1';
  },

  setFreeDayEnabled(enabled: boolean, userId?: string): void {
    const targetUser = userId || this.getActiveUserId();
    localStorage.setItem(`${STORAGE_KEYS.FREE_DAY}_${targetUser}_enabled`, enabled ? '1' : '0');
  },

  getFreeDay(userId?: string): number {
    const targetUser = userId || this.getActiveUserId();
    const raw = localStorage.getItem(`${STORAGE_KEYS.FREE_DAY}_${targetUser}`);
    if (raw === null || raw === undefined || raw === '') return 5; // Preferencia al habilitar: sábado
    const parsed = parseInt(raw, 10);
    return Number.isNaN(parsed) ? 5 : parsed;
  },

  setFreeDay(dayIndex: number, userId?: string): void {
    const targetUser = userId || this.getActiveUserId();
    localStorage.setItem(`${STORAGE_KEYS.FREE_DAY}_${targetUser}`, dayIndex.toString());
  },

  // Menús Semanales (con soporte de menú enlazado / compartido)
  getMenus(userId?: string): WeekMenu[] {
    const targetUser = userId || this.getActiveUserId();
    const profile = this.getProfileById(targetUser);
    const menuOwnerId = profile?.linkedMenuUserId || targetUser;
    const freeEnabled = this.isFreeDayEnabled(targetUser);
    const freeDay = this.getFreeDay(targetUser);

    const applyFreeDay = (menus: WeekMenu[]): WeekMenu[] =>
      menus.map((w) => ({
        ...w,
        days: w.days.map((d) => ({
          ...d,
          isFreeDay: freeEnabled && d.dayOfWeek === freeDay,
        })),
      }));

    const storedVersion = localStorage.getItem(STORAGE_KEYS.SEED_VERSION);
    const CURRENT_VERSION = 'v2026_nutri_enrich_v5';
    const scaledSeed = () => scaleWeekMenus(getHospitalMenuSeed(), profile?.targetCalories || 1500);

    const raw = localStorage.getItem(`${STORAGE_KEYS.MENUS}_${menuOwnerId}`);
    if (!raw || storedVersion !== CURRENT_VERSION) {
      const initial = scaledSeed();
      const existingRaw = localStorage.getItem(`${STORAGE_KEYS.MENUS}_${menuOwnerId}`);
      if (existingRaw && storedVersion && storedVersion.startsWith('v2026_')) {
        try {
          const existing: WeekMenu[] = JSON.parse(existingRaw);
          const hasUserEdits = localStorage.getItem(`${STORAGE_KEYS.MENUS}_${menuOwnerId}_edited`) === '1';
          if (!hasUserEdits) {
            this.saveMenus(initial, menuOwnerId);
            localStorage.setItem(STORAGE_KEYS.SEED_VERSION, CURRENT_VERSION);
            localStorage.setItem(`${STORAGE_KEYS.MENUS}_${menuOwnerId}_kcal`, String(profile?.targetCalories || 1500));
            return applyFreeDay(initial);
          }
          localStorage.setItem(STORAGE_KEYS.SEED_VERSION, CURRENT_VERSION);
          return applyFreeDay(existing);
        } catch {
          /* fallthrough */
        }
      }
      this.saveMenus(initial, menuOwnerId);
      localStorage.setItem(STORAGE_KEYS.SEED_VERSION, CURRENT_VERSION);
      return applyFreeDay(initial);
    }

    try {
      const parsed: WeekMenu[] = JSON.parse(raw);
      // Sanitización preventiva: Si alguna comida tiene URLs obsoletas /r..., se limpia automáticamente
      let hasLegacyUrls = false;
      const sanitized: WeekMenu[] = parsed.map((w) => ({
        ...w,
        days: w.days.map((d) => ({
          ...d,
          meals: Object.fromEntries(
            Object.entries(d.meals).map(([type, m]) => {
              if (m.recipeUrl && m.recipeUrl.includes('/recipes/recipe/es-ES/r')) {
                hasLegacyUrls = true;
                const query = m.recipeName || m.items[0]?.name || '';
                return [
                  type,
                  {
                    ...m,
                    recipeUrl: `https://cookidoo.es/search/es-ES?query=${encodeURIComponent(query)}`,
                  },
                ];
              }
              return [type, m];
            })
          ) as unknown as DayMenu['meals'],
        })),
      }));

      if (hasLegacyUrls) {
        this.saveMenus(sanitized, menuOwnerId);
      }
      return applyFreeDay(sanitized);
    } catch {
      const initial = scaleWeekMenus(getHospitalMenuSeed(), profile?.targetCalories || 1500);
      this.saveMenus(initial, menuOwnerId);
      return applyFreeDay(initial);
    }
  },

  saveMenus(menus: WeekMenu[], userId?: string): void {
    const targetUser = userId || this.getActiveUserId();
    const profile = this.getProfileById(targetUser);
    const menuOwnerId = profile?.linkedMenuUserId || targetUser;
    localStorage.setItem(`${STORAGE_KEYS.MENUS}_${menuOwnerId}`, JSON.stringify(menus));
  },

  updateDayMenu(weekIndex: number, dayIndex: number, updatedDay: WeekMenu['days'][0], userId?: string): void {
    const targetUser = userId || this.getActiveUserId();
    const profile = this.getProfileById(targetUser);
    const menuOwnerId = profile?.linkedMenuUserId || targetUser;

    const menus = this.getMenus(menuOwnerId);
    if (menus[weekIndex] && menus[weekIndex].days[dayIndex]) {
      const updatedDays = [...menus[weekIndex].days];
      updatedDays[dayIndex] = updatedDay;
      menus[weekIndex] = { ...menus[weekIndex], days: updatedDays };
      this.saveMenus(menus, menuOwnerId);
      localStorage.setItem(`${STORAGE_KEYS.MENUS}_${menuOwnerId}_edited`, '1');
      scheduleServerPush();
    }
  },

  // Mediciones corporales
  getMeasurements(userId?: string): BodyMeasurement[] {
    const targetUser = userId || this.getActiveUserId();
    const raw = localStorage.getItem(`${STORAGE_KEYS.MEASUREMENTS}_${targetUser}`);
    if (!raw) {
      if (targetUser === 'maria_ignacia') {
        localStorage.setItem(`${STORAGE_KEYS.MEASUREMENTS}_${targetUser}`, JSON.stringify(INITIAL_MEASUREMENTS));
        return INITIAL_MEASUREMENTS;
      }
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  addMeasurement(m: Omit<BodyMeasurement, 'id'>, userId?: string): BodyMeasurement {
    const targetUser = userId || this.getActiveUserId();
    const list = this.getMeasurements(targetUser);
    const newMeasurement: BodyMeasurement = {
      ...m,
      id: `m_${Date.now()}`,
      userId: targetUser,
    };
    const updated = [...list, newMeasurement].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    localStorage.setItem(`${STORAGE_KEYS.MEASUREMENTS}_${targetUser}`, JSON.stringify(updated));
    scheduleServerPush();
    return newMeasurement;
  },

  deleteMeasurement(id: string, userId?: string): void {
    const targetUser = userId || this.getActiveUserId();
    const list = this.getMeasurements(targetUser);
    const updated = list.filter((m) => m.id !== id);
    localStorage.setItem(`${STORAGE_KEYS.MEASUREMENTS}_${targetUser}`, JSON.stringify(updated));
    scheduleServerPush();
  },

  replaceMeasurements(list: BodyMeasurement[], userId?: string): void {
    const targetUser = userId || this.getActiveUserId();
    localStorage.setItem(`${STORAGE_KEYS.MEASUREMENTS}_${targetUser}`, JSON.stringify(list));
  },

  rescaleMenusToCalories(userId?: string): WeekMenu[] {
    const targetUser = userId || this.getActiveUserId();
    const profile = this.getProfileById(targetUser);
    const nextKcal = profile?.targetCalories || 1500;
    const lastKcal = Number(localStorage.getItem(`${STORAGE_KEYS.MENUS}_${targetUser}_kcal`) || 1500);
    const factor = nextKcal / (lastKcal || 1500);
    const menus = this.getMenus(targetUser);
    const scaled = scaleWeekMenusByFactor(menus, factor);
    this.saveMenus(scaled, targetUser);
    localStorage.setItem(`${STORAGE_KEYS.MENUS}_${targetUser}_kcal`, String(nextKcal));
    localStorage.setItem(`${STORAGE_KEYS.MENUS}_${targetUser}_edited`, '1');
    scheduleServerPush();
    return scaled;
  },

  // Configuración del día de pesaje semanal (0=Domingo, 1=Lunes, ..., 4=Jueves)
  getWeighInDay(userId?: string): number {
    const targetUser = userId || this.getActiveUserId();
    const raw = localStorage.getItem(`migordologo_weighin_day_${targetUser}`);
    if (raw !== null) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 6) return parsed;
    }
    return 4; // Por defecto: Jueves por la mañana (4)
  },

  setWeighInDay(day: number, userId?: string): void {
    const targetUser = userId || this.getActiveUserId();
    localStorage.setItem(`migordologo_weighin_day_${targetUser}`, day.toString());
  },

  // Detección de alerta de pesaje semanal pendiente (sólo en el día configurado)
  needsWeeklyWeighIn(userId?: string): { needed: boolean; daysSinceLast: number; lastDate: string | null } {
    const targetUser = userId || this.getActiveUserId();
    const list = this.getMeasurements(targetUser);
    const now = new Date();
    const currentDayOfWeek = now.getDay();
    const configuredDay = this.getWeighInDay(targetUser);

    // Si hoy NO es el día configurado de pesaje, no mostrar la alerta
    if (currentDayOfWeek !== configuredDay) {
      return {
        needed: false,
        daysSinceLast: 0,
        lastDate: list.length > 0 ? list[list.length - 1].date : null,
      };
    }

    if (list.length === 0) {
      return { needed: true, daysSinceLast: 999, lastDate: null };
    }

    const last = list[list.length - 1];
    const todayStr = now.toISOString().split('T')[0];

    // Si ya se ha pesado hoy, no mostrar
    if (last.date === todayStr) {
      return { needed: false, daysSinceLast: 0, lastDate: last.date };
    }

    const lastTime = new Date(last.date).getTime();
    const nowTime = now.getTime();
    const diffDays = Math.floor((nowTime - lastTime) / (1000 * 60 * 60 * 24));

    // Si ya se pesó hace menos de 6 días, no mostrar
    if (diffDays < 6) {
      return { needed: false, daysSinceLast: diffDays, lastDate: last.date };
    }

    // Si la alerta ya fue descartada hoy, no molestar más
    const dismissedToday = localStorage.getItem(`${STORAGE_KEYS.DISMISSED_ALERT}_${targetUser}_${todayStr}`) === 'true';
    return {
      needed: !dismissedToday,
      daysSinceLast: diffDays,
      lastDate: last.date,
    };
  },

  dismissWeighInAlert(userId?: string): void {
    const targetUser = userId || this.getActiveUserId();
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(`${STORAGE_KEYS.DISMISSED_ALERT}_${targetUser}_${today}`, 'true');
  },

  // Ajustes de alertas por email
  getEmailAlertSettings(userId?: string): EmailAlertSettings {
    const targetUser = userId || this.getActiveUserId();
    const raw = localStorage.getItem(`${STORAGE_KEYS.ALERT_SETTINGS}_${targetUser}`);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // fallback
      }
    }
    return {
      email: '',
      enabled: false,
      dayOfWeek: 0, // Lunes
      time: '09:00',
    };
  },

  saveEmailAlertSettings(settings: EmailAlertSettings, userId?: string): void {
    const targetUser = userId || this.getActiveUserId();
    localStorage.setItem(`${STORAGE_KEYS.ALERT_SETTINGS}_${targetUser}`, JSON.stringify(settings));
  },

  // Lista de compras
  getShoppingChecked(weekNum: number): Record<string, boolean> {
    const raw = localStorage.getItem(`${STORAGE_KEYS.SHOPPING}_checked_${weekNum}`);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  },

  setShoppingChecked(weekNum: number, checkedMap: Record<string, boolean>): void {
    localStorage.setItem(`${STORAGE_KEYS.SHOPPING}_checked_${weekNum}`, JSON.stringify(checkedMap));
  },

  getCustomShoppingItems(weekNum: number): ShoppingItem[] {
    const raw = localStorage.getItem(`${STORAGE_KEYS.SHOPPING}_custom_${weekNum}`);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveCustomShoppingItems(weekNum: number, items: ShoppingItem[]): void {
    localStorage.setItem(`${STORAGE_KEYS.SHOPPING}_custom_${weekNum}`, JSON.stringify(items));
  },

  // Gemini API Key
  getGeminiApiKey(): string {
    return localStorage.getItem(STORAGE_KEYS.GEMINI_KEY) || import.meta.env.VITE_GEMINI_API_KEY || '';
  },

  setGeminiApiKey(key: string): void {
    localStorage.setItem(STORAGE_KEYS.GEMINI_KEY, key.trim());
  },

  // === CONTROL TEMPORAL Y AVANCE DEL PLAN (8 SEMANAS) ===

  getPlanStartDate(userId?: string): Date {
    const targetUser = userId || this.getActiveUserId();
    const raw = localStorage.getItem(`migordologo_plan_start_${targetUser}`);
    if (raw) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return d;
    }
    // Lunes de la semana actual como punto de partida
    const now = new Date();
    const dayOfWeek = (now.getDay() + 6) % 7; // 0=Lunes
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek);
    monday.setHours(0, 0, 0, 0);
    localStorage.setItem(`migordologo_plan_start_${targetUser}`, monday.toISOString());
    return monday;
  },

  getCurrentWeekIndex(userId?: string): number {
    const start = this.getPlanStartDate(userId);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    if (diffMs <= 0) return 0;
    const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
    return diffWeeks % 8; // Ciclo rotativo de 8 semanas
  },

  getCurrentDayIndex(): number {
    return (new Date().getDay() + 6) % 7; // 0=Lunes, ..., 6=Domingo
  },
};
