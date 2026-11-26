import { getAccessToken, getSupabase, isSupabaseConfigured } from './supabaseClient';
import { storageService } from './storageService';

const AUTH_USER_KEY = 'migordologo_auth_user_id';
const AUTH_STATUS_KEY = 'migordologo_auth_status';
const AUTH_IS_ADMIN_KEY = 'migordologo_auth_is_admin';
const AUTH_PENDING_COUNT_KEY = 'migordologo_auth_pending_count';

function getEnv() {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
  const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';
  return { url, anon };
}

export type RemoteUser = {
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
  linkedMenuUserId?: string | null;
  createdAt?: string;
  settings?: Record<string, unknown>;
};

export type GordologoResponse = {
  ok: boolean;
  error?: string;
  backend?: boolean;
  needsBootstrap?: boolean;
  isAdmin?: boolean;
  pendingCount?: number;
  needsVaultSync?: boolean;
  tempPassword?: string;
  pending?: boolean;
  status?: string;
  text?: string;
  message?: string;
  recipeName?: string;
  recipeUrl?: string | null;
  items?: Array<{ name: string; quantity?: string; notes?: string | null }>;
  users?: RemoteUser[];
  authUser?: RemoteUser;
  actingUser?: RemoteUser;
  actingUserId?: string;
  user?: RemoteUser;
  menus?: unknown;
  menusEdited?: boolean;
  menusUpdatedAt?: string | null;
  measurements?: unknown;
  lunches?: Array<{
    recipeName?: string;
    items?: Array<{ name?: string; quantity?: string; notes?: string | null }>;
  }>;
  dinners?: Array<{
    recipeName?: string;
    items?: Array<{ name?: string; quantity?: string; notes?: string | null }>;
  }>;
  estimatedDailyKcal?: number;
  needsSignIn?: boolean;
};

export const backendService = {
  isConfigured(): boolean {
    return isSupabaseConfigured();
  },

  getAuthUserId(): string {
    return localStorage.getItem(AUTH_USER_KEY) || '';
  },

  setAuthUserId(id: string | null): void {
    if (id) localStorage.setItem(AUTH_USER_KEY, id);
    else localStorage.removeItem(AUTH_USER_KEY);
  },

  getAuthStatus(): string {
    return localStorage.getItem(AUTH_STATUS_KEY) || '';
  },

  setAuthStatus(status: string | null): void {
    if (status) localStorage.setItem(AUTH_STATUS_KEY, status);
    else localStorage.removeItem(AUTH_STATUS_KEY);
  },

  setVerifiedAdmin(isAdmin: boolean): void {
    if (isAdmin) localStorage.setItem(AUTH_IS_ADMIN_KEY, '1');
    else localStorage.removeItem(AUTH_IS_ADMIN_KEY);
  },

  /** Solo true si el servidor confirmó rol superadmin + email administrador + aprobado. */
  isVerifiedAdmin(): boolean {
    return localStorage.getItem(AUTH_IS_ADMIN_KEY) === '1' && this.isApproved();
  },

  getPendingCount(): number {
    return parseInt(localStorage.getItem(AUTH_PENDING_COUNT_KEY) || '0', 10) || 0;
  },

  setPendingCount(count: number): void {
    if (count > 0) localStorage.setItem(AUTH_PENDING_COUNT_KEY, String(count));
    else localStorage.removeItem(AUTH_PENDING_COUNT_KEY);
  },

  isLoggedIn(): boolean {
    return Boolean(this.getAuthUserId());
  },

  isApproved(): boolean {
    return this.getAuthStatus() === 'approved';
  },

  isImpersonating(): boolean {
    const authId = this.getAuthUserId();
    const activeId = storageService.getActiveUserId();
    return this.isVerifiedAdmin() && Boolean(authId) && Boolean(activeId) && authId !== activeId;
  },

  async hasActiveSession(): Promise<boolean> {
    const token = await getAccessToken();
    return Boolean(token);
  },

  clearAuthFlags(): void {
    this.setAuthUserId(null);
    this.setAuthStatus(null);
    this.setVerifiedAdmin(false);
    this.setPendingCount(0);
    localStorage.removeItem('migordologo_auth_role');
  },

  async call(body: Record<string, unknown>): Promise<GordologoResponse> {
    const { url, anon } = getEnv();
    if (!url || !anon) {
      return { ok: false, error: 'NO_BACKEND' };
    }
    const accessToken = await getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: anon,
      Authorization: `Bearer ${accessToken || anon}`,
    };

    try {
      const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/gordologo`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      try {
        return (await res.json()) as GordologoResponse;
      } catch {
        return { ok: false, error: `HTTP ${res.status}` };
      }
    } catch {
      return { ok: false, error: 'Sin conexión con el servidor.' };
    }
  },

  status() {
    return this.call({ action: 'status' });
  },

  bootstrapAdmin(email: string, password: string, name: string) {
    return this.call({ action: 'bootstrapAdmin', email, password, name });
  },

  register(name: string, email: string, password: string) {
    return this.call({ action: 'register', name, email, password });
  },

  getMyProfile() {
    return this.call({ action: 'getMyProfile' });
  },

  async logout() {
    const { authSyncService } = await import('./authSyncService');
    authSyncService.cancelPendingPush();
    await this.call({ action: 'logout' }).catch(() => null);
    const sb = getSupabase();
    if (sb) await sb.auth.signOut().catch(() => null);
    this.clearAuthFlags();
    storageService.clearSessionData();
  },

  updateProfile(body: Record<string, unknown>) {
    return this.call({ action: 'updateProfile', ...body });
  },

  getState() {
    return this.call({ action: 'getState' });
  },

  saveMenus(weeks: unknown, userId?: string, edited = true) {
    return this.call({ action: 'saveMenus', weeks, userId, edited });
  },

  saveMeasurements(measurements: unknown, userId?: string) {
    return this.call({ action: 'saveMeasurements', measurements, userId });
  },

  requestPasswordReset(email: string) {
    return this.call({ action: 'requestPasswordReset', email });
  },

  confirmPasswordReset(email: string, code: string, newPassword: string) {
    return this.call({ action: 'confirmPasswordReset', email, code, newPassword });
  },

  changeOwnPassword(password: string) {
    return this.call({ action: 'changeOwnPassword', password });
  },

  syncOwnPasswordVault(password: string) {
    return this.call({ action: 'syncOwnPasswordVault', password });
  },

  personalizeMenu(intake: unknown) {
    return this.call({ action: 'personalizeMenu', intake });
  },

  importMenu(pdfText: string) {
    return this.call({ action: 'importMenu', pdfText });
  },
};
