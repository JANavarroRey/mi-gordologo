import { backendService, type RemoteUser } from './backendService';
import { storageService } from './storageService';
import { getAccessToken, getSupabase } from './supabaseClient';
import type { BodyMeasurement, FoodIntake, UserProfile, WeekMenu } from '../models/types';

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let hydrating = false;

function toLocalProfile(u: RemoteUser): UserProfile {
  const settings = u.settings || {};
  const rawIntake = settings.foodIntake as FoodIntake | undefined;
  const linkedFromSettings =
    typeof settings.linkedMenuUserId === 'string' ? settings.linkedMenuUserId : null;
  const isAdmin = u.role === 'superadmin';
  return {
    id: u.id,
    name: u.name,
    age: u.age ?? 0,
    height: u.height ?? 0,
    targetCalories: u.targetCalories ?? 1500,
    linkedMenuUserId: isAdmin ? null : linkedFromSettings,
    createdAt: u.createdAt || new Date().toISOString(),
    role: isAdmin ? 'superadmin' : 'member',
    email: u.email ?? null,
    status:
      u.status === 'approved' || u.status === 'rejected' || u.status === 'pending'
        ? u.status
        : 'pending',
    gender: u.gender === 'male' || u.gender === 'female' ? u.gender : null,
    activityLevel:
      u.activityLevel === 'sedentary' ||
      u.activityLevel === 'moderate' ||
      u.activityLevel === 'active'
        ? u.activityLevel
        : null,
    goal: u.goal === 'lose_weight' || u.goal === 'maintain' ? u.goal : null,
    foodIntake: rawIntake?.completedAt ? rawIntake : null,
  };
}

function applySettings(userId: string, settings: Record<string, unknown> | undefined) {
  if (!settings) return;
  if (settings.servings != null) storageService.setServings(Number(settings.servings), userId, false);
  if (settings.freeDay != null) storageService.setFreeDay(Number(settings.freeDay), userId, false);
  if (settings.freeDayEnabled != null) {
    storageService.setFreeDayEnabled(Boolean(settings.freeDayEnabled), userId, false);
  }
  if (settings.weighInDay != null) {
    storageService.setWeighInDay(Number(settings.weighInDay), userId, false);
  }
}

export const authSyncService = {
  cancelPendingPush(): void {
    if (pushTimer) {
      clearTimeout(pushTimer);
      pushTimer = null;
    }
  },

  /**
   * Hidrata sesión, rol verificado por servidor, perfiles y datos del usuario activo
   * en una única llamada a `getState()`.
   */
  async syncAfterAuth(): Promise<{
    ok: boolean;
    status?: string;
    isAdmin?: boolean;
    needsVaultSync?: boolean;
    error?: string;
  }> {
    storageService.purgeLegacySecrets();
    const token = await getAccessToken();
    if (!token) {
      backendService.clearAuthFlags();
      return { ok: false, error: 'Sin sesión' };
    }

    hydrating = true;
    try {
      const state = await backendService.getState();
      if (!state.ok && !state.authUser) {
        if (state.error && /sesión|inicia/i.test(state.error)) {
          backendService.clearAuthFlags();
          storageService.clearSessionData();
        }
        return { ok: false, error: state.error || 'No se pudo cargar el perfil' };
      }

      const status = state.status || state.authUser?.status || 'pending';
      const isAdmin = Boolean(state.isAdmin);
      const prevAuthId = backendService.getAuthUserId();

      // Si cambió de cuenta autenticada en el mismo navegador, limpiamos el caché local previo
      if (state.authUser?.id && prevAuthId && prevAuthId !== state.authUser.id) {
        storageService.clearSessionData();
      }

      backendService.setAuthStatus(status);
      backendService.setAuthUserId(state.authUser?.id || null);
      backendService.setVerifiedAdmin(isAdmin);
      backendService.setPendingCount(isAdmin ? state.pendingCount || 0 : 0);

      if (status !== 'approved') {
        if (state.authUser) {
          storageService.replaceProfiles([toLocalProfile(state.authUser)]);
          storageService.setActiveUserId(state.authUser.id);
        }
        window.dispatchEvent(new Event('storage'));
        return { ok: true, status, isAdmin: false, needsVaultSync: Boolean(state.needsVaultSync) };
      }

      // Aislamiento estricto: un miembro solo tiene su propio perfil en localStorage
      if (isAdmin && state.users?.length) {
        storageService.replaceProfiles(state.users.map(toLocalProfile));
      } else if (state.authUser) {
        storageService.replaceProfiles([toLocalProfile(state.authUser)]);
      }

      const acting = state.actingUser || state.authUser;
      if (acting) {
        storageService.upsertProfile(toLocalProfile(acting));
        storageService.setActiveUserId(acting.id);
        applySettings(acting.id, acting.settings);
      }

      const uid = acting?.id || storageService.getActiveUserId();
      if (uid) {
        if (Array.isArray(state.menus) && state.menus.length) {
          storageService.saveMenus(state.menus as WeekMenu[], uid);
          if (state.menusEdited) {
            localStorage.setItem(`migordologo_menus_${uid}_edited`, '1');
          }
        } else {
          // Inicializa semilla hospitalaria para el usuario si aún no tenía menú en servidor
          const initial = storageService.getMenus(uid);
          if (initial.length) {
            await backendService.saveMenus(initial, uid, false);
          }
        }

        if (Array.isArray(state.measurements)) {
          storageService.replaceMeasurements(state.measurements as BodyMeasurement[], uid);
        } else {
          storageService.replaceMeasurements([], uid);
        }
      }

      storageService.setHasCompletedOnboarding(true);
      window.dispatchEvent(new Event('storage'));
      return {
        ok: true,
        status: 'approved',
        isAdmin,
        needsVaultSync: Boolean(state.needsVaultSync),
      };
    } finally {
      hydrating = false;
    }
  },

  async hydrateFromServer(): Promise<boolean> {
    const res = await this.syncAfterAuth();
    return res.ok && res.status === 'approved';
  },

  schedulePush(): void {
    if (hydrating) return;
    void getAccessToken().then((token) => {
      if (!token || !backendService.isApproved()) return;
      this.cancelPendingPush();
      pushTimer = setTimeout(() => {
        void this.flushNow();
      }, 800);
    });
  },

  async flushNow(): Promise<void> {
    const token = await getAccessToken();
    if (!token || !backendService.isApproved()) return;
    const uid = storageService.getActiveUserId();
    if (!uid) return;

    const menus = storageService.getMenus(uid);
    const measurements = storageService.getMeasurements(uid);
    const p = storageService.getActiveProfile();
    if (!p.id || p.id !== uid) return;

    const [rMenus, rMeas, rProf] = await Promise.all([
      backendService.saveMenus(
        menus,
        uid,
        localStorage.getItem(`migordologo_menus_${uid}_edited`) === '1'
      ),
      backendService.saveMeasurements(measurements, uid),
      backendService.updateProfile({
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
      }),
    ]);

    if (!rMenus.ok || !rMeas.ok || !rProf.ok) {
      console.warn('Error sincronizando cambios con el servidor:', {
        menus: rMenus.error,
        measurements: rMeas.error,
        profile: rProf.error,
      });
    }
  },

  async resetAllMenusToHospitalSeed(): Promise<void> {
    if (!backendService.isVerifiedAdmin()) return;
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

    this.cancelPendingPush();
    storageService.clearSessionData();
    backendService.clearAuthFlags();

    const { error } = await sb.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      return {
        ok: false as const,
        error:
          /invalid login credentials/i.test(error.message)
            ? 'Email o contraseña incorrectos.'
            : error.message,
      };
    }

    const synced = await this.syncAfterAuth();
    // Si la cuenta existía antes de la bóveda cifrada, sincronizamos silenciosamente en servidor
    if (synced.ok && synced.needsVaultSync) {
      void backendService.syncOwnPasswordVault(password).catch(() => null);
    }
    return synced;
  },

  async signUp(email: string, password: string, name: string) {
    const cleanEmail = email.trim().toLowerCase();
    const res = await backendService.register(name.trim(), cleanEmail, password);
    if (!res.ok) {
      return { ok: false as const, error: res.error || 'No se pudo completar el registro.' };
    }

    // Iniciamos sesión para dejar visible el estado "pendiente de aprobación" en pantalla
    const sb = getSupabase();
    if (sb) {
      await sb.auth.signInWithPassword({ email: cleanEmail, password }).catch(() => null);
      await this.syncAfterAuth();
    }

    return {
      ok: true as const,
      status: 'pending' as const,
      message:
        res.message ||
        'Solicitud enviada. Cuando el administrador apruebe tu cuenta podrás entrar.',
    };
  },

  async requestPasswordReset(email: string) {
    const res = await backendService.requestPasswordReset(email.trim().toLowerCase());
    if (!res.ok) return { ok: false as const, error: res.error || 'No se pudo enviar el email.' };
    return {
      ok: true as const,
      message:
        res.message ||
        'Si ese email está registrado, recibirás un correo con tu código de 6 dígitos.',
    };
  },

  async confirmPasswordReset(email: string, code: string, newPassword: string) {
    const res = await backendService.confirmPasswordReset(
      email.trim().toLowerCase(),
      code.trim(),
      newPassword
    );
    if (!res.ok) {
      return { ok: false as const, error: res.error || 'No se pudo cambiar la contraseña.' };
    }
    return {
      ok: true as const,
      message: res.message || 'Contraseña actualizada correctamente.',
    };
  },
};
