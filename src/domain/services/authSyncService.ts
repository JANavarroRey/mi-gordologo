import { backendService } from './backendService';
import { storageService } from './storageService';
import type { BodyMeasurement, UserProfile, WeekMenu } from '../models/types';

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let hydrating = false;

function toLocalProfile(u: {
  id: string;
  name: string;
  role?: string;
  age?: number;
  height?: number;
  targetCalories?: number;
  gender?: string | null;
  activityLevel?: string | null;
  goal?: string | null;
  createdAt?: string;
}): UserProfile {
  return {
    id: u.id,
    name: u.name,
    age: u.age ?? 0,
    height: u.height ?? 0,
    targetCalories: u.targetCalories ?? 1500,
    linkedMenuUserId: null,
    createdAt: u.createdAt || new Date().toISOString(),
    role: u.role === 'superadmin' ? 'superadmin' : 'member',
    gender: u.gender === 'male' || u.gender === 'female' ? u.gender : null,
    activityLevel:
      u.activityLevel === 'sedentary' || u.activityLevel === 'moderate' || u.activityLevel === 'active'
        ? u.activityLevel
        : null,
    goal: u.goal === 'lose_weight' || u.goal === 'maintain' ? u.goal : null,
  };
}

function applySettings(userId: string, settings: Record<string, unknown> | undefined) {
  if (!settings) return;
  if (settings.servings != null) storageService.setServings(Number(settings.servings), userId);
  if (settings.freeDay != null) storageService.setFreeDay(Number(settings.freeDay), userId);
  if (settings.freeDayEnabled != null) storageService.setFreeDayEnabled(Boolean(settings.freeDayEnabled), userId);
  if (settings.weighInDay != null) storageService.setWeighInDay(Number(settings.weighInDay), userId);
}

export const authSyncService = {
  applyLogin(res: {
    token?: string;
    authUser?: { id: string; name: string; role?: string };
    actingUserId?: string;
    users?: Array<{ id: string; name: string; role?: string; age?: number; height?: number; targetCalories?: number; createdAt?: string }>;
  }) {
    if (res.token) backendService.setUserToken(res.token);
    if (res.authUser?.id) backendService.setAuthUserId(res.authUser.id);
    if (res.users?.length) {
      storageService.replaceProfiles(res.users.map(toLocalProfile));
    } else if (res.authUser) {
      storageService.upsertProfile(toLocalProfile(res.authUser));
    }
    const acting = res.actingUserId || res.authUser?.id;
    if (acting) storageService.setActiveUserId(acting);
    storageService.setHasCompletedOnboarding(true);
    window.dispatchEvent(new Event('storage'));
  },

  async hydrateFromServer(): Promise<boolean> {
    if (!backendService.getUserToken()) return false;
    hydrating = true;
    try {
      const state = await backendService.getState();
      if (!state.ok) {
        if (state.error && /sesión|inicia/i.test(state.error)) {
          backendService.setUserToken(null);
          backendService.setAuthUserId(null);
        }
        return false;
      }
      if (state.authUser?.id) backendService.setAuthUserId(state.authUser.id);
      if (state.users?.length) {
        storageService.replaceProfiles(state.users.map(toLocalProfile));
      }
      if (state.actingUser) {
        storageService.upsertProfile(toLocalProfile(state.actingUser));
        storageService.setActiveUserId(state.actingUser.id);
        applySettings(state.actingUser.id, state.actingUser.settings as Record<string, unknown> | undefined);
      }
      const uid = state.actingUser?.id || storageService.getActiveUserId();
      if (Array.isArray(state.menus) && state.menus.length) {
        storageService.saveMenus(state.menus as WeekMenu[], uid);
        if (state.menusEdited) {
          localStorage.setItem(`migordologo_menus_${uid}_edited`, '1');
        }
      } else {
        await this.migrateLocalForUser(uid);
      }
      if (Array.isArray(state.measurements)) {
        storageService.replaceMeasurements(state.measurements as BodyMeasurement[], uid);
      }
      window.dispatchEvent(new Event('storage'));
      return true;
    } finally {
      hydrating = false;
    }
  },

  async migrateLocalForUser(userId: string): Promise<void> {
    const menus = storageService.getMenus(userId);
    if (menus.length) {
      await backendService.saveMenus(menus, userId, localStorage.getItem(`migordologo_menus_${userId}_edited`) === '1');
    }
    const measurements = storageService.getMeasurements(userId);
    if (measurements.length) {
      await backendService.saveMeasurements(measurements, userId);
    }
  },

  collectMigrationPayload() {
    const profiles = storageService.getProfiles();
    const menusByUser: Record<string, WeekMenu[]> = {};
    const measurementsByUser: Record<string, BodyMeasurement[]> = {};
    const meta: Record<string, string> = {};
    for (const p of profiles) {
      menusByUser[p.id] = storageService.getMenus(p.id);
      measurementsByUser[p.id] = storageService.getMeasurements(p.id);
      if (localStorage.getItem(`migordologo_menus_${p.id}_edited`) === '1') {
        meta[`menus_edited_${p.id}`] = '1';
      }
    }
    return { menusByUser, measurementsByUser, meta };
  },

  schedulePush() {
    if (hydrating || !backendService.getUserToken()) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      void this.flushNow();
    }, 800);
  },

  async flushNow() {
    if (!backendService.getUserToken()) return;
    const uid = storageService.getActiveUserId();
    const menus = storageService.getMenus(uid);
    const measurements = storageService.getMeasurements(uid);
    await backendService.saveMenus(menus, uid, localStorage.getItem(`migordologo_menus_${uid}_edited`) === '1');
    await backendService.saveMeasurements(measurements, uid);
    const p = storageService.getActiveProfile();
    await backendService.updateProfile({
      userId: uid,
      age: p.age,
      height: p.height,
      targetCalories: p.targetCalories,
      gender: p.gender,
      activityLevel: p.activityLevel,
      goal: p.goal,
      settings: {
        servings: storageService.getServings(uid),
        freeDay: storageService.getFreeDay(uid),
        freeDayEnabled: storageService.isFreeDayEnabled(uid),
        weighInDay: storageService.getWeighInDay(uid),
      },
    });
  },
};
