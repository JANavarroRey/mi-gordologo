import { backendService } from './backendService';
import { storageService } from './storageService';
import { getAccessToken, getSupabase } from './supabaseClient';
import type { BodyMeasurement, FoodIntake, UserProfile, WeekMenu } from '../models/types';

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let hydrating = false;

function toLocalProfile(u: {
  id: string;
  name: string;
  role?: string;
  email?: string | null;
  status?: string;
  age?: number;
  height?: number;
  targetCalories?: number;
  gender?: string | null;
  activityLevel?: string | null;
  goal?: string | null;
  createdAt?: string;
  settings?: Record<string, unknown>;
}): UserProfile {
  const settings = u.settings || {};
  const rawIntake = settings.foodIntake as FoodIntake | undefined;
  const existing = storageService.getProfileById(u.id);
  const linkedFromSettings =
    typeof settings.linkedMenuUserId === 'string' ? settings.linkedMenuUserId : null;
  return {
    id: u.id,
    name: u.name,
    age: u.age ?? 0,
    height: u.height ?? 0,
    targetCalories: u.targetCalories ?? 1500,
    linkedMenuUserId:
      u.id === 'pepe' ? null : linkedFromSettings ?? existing?.linkedMenuUserId ?? null,
    createdAt: u.createdAt || new Date().toISOString(),
    role: u.role === 'superadmin' ? 'superadmin' : 'member',
    email: u.email ?? existing?.email ?? null,
    status:
      u.status === 'approved' || u.status === 'rejected' || u.status === 'pending'
        ? u.status
        : existing?.status ?? 'pending',
    gender: u.gender === 'male' || u.gender === 'female' ? u.gender : null,
    activityLevel:
      u.activityLevel === 'sedentary' || u.activityLevel === 'moderate' || u.activityLevel === 'active'
        ? u.activityLevel
        : null,
    goal: u.goal === 'lose_weight' || u.goal === 'maintain' ? u.goal : null,
    foodIntake: rawIntake?.completedAt ? rawIntake : existing?.foodIntake ?? null,
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
    authUser?: {
      id: string;
      name: string;
      role?: string;
      status?: string;
      email?: string | null;
    };
    actingUserId?: string;
    users?: Array<{
      id: string;
      name: string;
      role?: string;
      status?: string;
      email?: string | null;
      age?: number;
      height?: number;
      targetCalories?: number;
      createdAt?: string;
    }>;
  }) {
    if (res.authUser?.id) backendService.setAuthUserId(res.authUser.id);
    if (res.authUser?.status) backendService.setAuthStatus(res.authUser.status);
    if (res.authUser?.role) backendService.setAuthRole(res.authUser.role);
    if (res.users?.length) {
      storageService.replaceProfiles(res.users.map(toLocalProfile));
    } else if (res.authUser) {
      storageService.upsertProfile(toLocalProfile(res.authUser));
    }
    const acting = res.actingUserId || res.authUser?.id;
    if (acting) storageService.setActiveUserId(acting);
    if (res.authUser?.status === 'approved') {
      storageService.setHasCompletedOnboarding(true);
    }
    window.dispatchEvent(new Event('storage'));
  },

  async syncAfterAuth(): Promise<{ ok: boolean; status?: string; error?: string }> {
    const token = await getAccessToken();
    if (!token) return { ok: false, error: 'Sin sesión' };

    const state = await backendService.getState();
    if (!state.ok && !state.authUser) {
      return { ok: false, error: state.error || 'No se pudo cargar el perfil' };
    }

    const status = state.status || state.authUser?.status || 'pending';
    backendService.setAuthStatus(status);

    if (state.authUser?.id) backendService.setAuthUserId(state.authUser.id);

    if (state.authUser?.role) backendService.setAuthRole(state.authUser.role);

    if (status !== 'approved') {
      if (state.authUser) storageService.upsertProfile(toLocalProfile(state.authUser));
      window.dispatchEvent(new Event('storage'));
      return { ok: true, status };
    }

    this.applyLogin({
      authUser: state.authUser,
      actingUserId: state.actingUser?.id,
      users: state.users,
    });
    await this.hydrateFromServer();
    return { ok: true, status: 'approved' };
  },

  async hydrateFromServer(): Promise<boolean> {
    const token = await getAccessToken();
    if (!token) return false;
    hydrating = true;
    try {
      const state = await backendService.getState();
      if (!state.ok && !state.authUser) {
        if (state.error && /sesión|inicia/i.test(state.error || '')) {
          backendService.setAuthUserId(null);
          backendService.setAuthStatus(null);
        }
        return false;
      }

      const status = state.status || state.authUser?.status || '';
      backendService.setAuthStatus(status);

      if (status && status !== 'approved') {
        if (state.authUser) storageService.upsertProfile(toLocalProfile(state.authUser));
        return true;
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
      storageService.setHasCompletedOnboarding(true);
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
    if (hydrating) return;
    void getAccessToken().then((token) => {
      if (!token || backendService.getAuthStatus() !== 'approved') return;
      if (pushTimer) clearTimeout(pushTimer);
      pushTimer = setTimeout(() => {
        void this.flushNow();
      }, 800);
    });
  },

  async flushNow() {
    const token = await getAccessToken();
    if (!token || backendService.getAuthStatus() !== 'approved') return;
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
        foodIntake: p.foodIntake || null,
        linkedMenuUserId: p.linkedMenuUserId,
      },
    });
  },

  async resetAllMenusToHospitalSeed(): Promise<void> {
    const ids = storageService.forceHospitalSeedOnAllProfiles();
    const token = await getAccessToken();
    if (!token) return;
    for (const id of ids) {
      const weeks = storageService.getMenus(id);
      await backendService.saveMenus(weeks, id, false);
      const p = storageService.getProfileById(id);
      if (p) {
        await backendService.updateProfile({
          userId: id,
          targetCalories: p.targetCalories,
          settings: {
            servings: storageService.getServings(id),
            freeDay: storageService.getFreeDay(id),
            freeDayEnabled: storageService.isFreeDayEnabled(id),
            weighInDay: storageService.getWeighInDay(id),
            foodIntake: p.foodIntake || null,
            linkedMenuUserId: p.linkedMenuUserId,
          },
        });
      }
    }
    window.dispatchEvent(new Event('storage'));
  },

  async signInWithPassword(email: string, password: string) {
    const sb = getSupabase();
    if (!sb) return { ok: false as const, error: 'Servidor no configurado' };
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { ok: false as const, error: error.message };
    return this.syncAfterAuth();
  },

  async signUp(email: string, password: string, name: string) {
    const sb = getSupabase();
    if (!sb) return { ok: false as const, error: 'Servidor no configurado' };
    const { data, error } = await sb.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() } },
    });
    if (error) return { ok: false as const, error: error.message };
    if (!data.session) {
      return {
        ok: true as const,
        status: 'confirm_email' as const,
        message: 'Revisa tu email para confirmar la cuenta. Luego podrás entrar; un admin te aprobará.',
      };
    }
    return this.syncAfterAuth();
  },

  async requestPasswordReset(email: string) {
    const sb = getSupabase();
    if (!sb) return { ok: false as const, error: 'Servidor no configurado' };
    const { passwordResetRedirectUrl } = await import('./supabaseClient');
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: passwordResetRedirectUrl(),
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  },

  async updatePassword(newPassword: string) {
    const sb = getSupabase();
    if (!sb) return { ok: false as const, error: 'Servidor no configurado' };
    const { error } = await sb.auth.updateUser({ password: newPassword });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  },
};
