import { getAccessToken, getSupabase, isSupabaseConfigured } from './supabaseClient';

const AUTH_USER_KEY = 'migordologo_auth_user_id';
const AUTH_STATUS_KEY = 'migordologo_auth_status';
const AUTH_ROLE_KEY = 'migordologo_auth_role';

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
  hasAdmin?: boolean;
  hasUsers?: boolean;
  needsBootstrap?: boolean;
  hasGemini?: boolean;
  pending?: boolean;
  status?: string;
  token?: string;
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
  lunches?: Array<{ recipeName?: string; items?: Array<{ name?: string; quantity?: string; notes?: string | null }> }>;
  dinners?: Array<{ recipeName?: string; items?: Array<{ name?: string; quantity?: string; notes?: string | null }> }>;
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

  getAuthRole(): string {
    return localStorage.getItem(AUTH_ROLE_KEY) || '';
  },

  setAuthRole(role: string | null): void {
    if (role) localStorage.setItem(AUTH_ROLE_KEY, role);
    else localStorage.removeItem(AUTH_ROLE_KEY);
  },

  isAuthSuperadmin(): boolean {
    return this.getAuthRole() === 'superadmin' || this.getAuthUserId() === 'pepe';
  },

  /** @deprecated Token custom eliminado; la sesión vive en Supabase Auth. */
  getUserToken(): string {
    return '';
  },

  setUserToken(_token: string | null): void {
    // no-op (compat)
  },

  getAdminToken(): string {
    return '';
  },

  setAdminToken(_token: string | null): void {
    // no-op
  },

  isLoggedIn(): boolean {
    return Boolean(this.getAuthUserId());
  },

  isApproved(): boolean {
    return this.getAuthStatus() === 'approved';
  },

  async hasActiveSession(): Promise<boolean> {
    const token = await getAccessToken();
    return Boolean(token);
  },

  isSuperadminSession(): boolean {
    return this.isAuthSuperadmin() && Boolean(this.getAuthUserId());
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

    const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/gordologo`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    try {
      const data = (await res.json()) as GordologoResponse;
      return data;
    } catch {
      return { ok: false, error: `HTTP ${res.status}` };
    }
  },

  status() {
    return this.call({ action: 'status' });
  },

  bootstrapAdmin(email: string, password: string, name: string, extra?: Record<string, unknown>) {
    return this.call({ action: 'bootstrapAdmin', email, password, name, ...extra });
  },

  getMyProfile() {
    return this.call({ action: 'getMyProfile' });
  },

  async logout() {
    await this.call({ action: 'logout' });
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    this.setAuthUserId(null);
    this.setAuthStatus(null);
    this.setAuthRole(null);
  },

  openAsUser(targetUserId: string) {
    return this.call({ action: 'openAsUser', targetUserId });
  },

  createUser(body: Record<string, unknown>) {
    return this.call({ action: 'createUser', ...body });
  },

  setUserStatus(userId: string, status: 'approved' | 'rejected' | 'pending') {
    return this.call({ action: 'setUserStatus', userId, status });
  },

  listPendingUsers() {
    return this.call({ action: 'listPendingUsers' });
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

  setGeminiKey(apiKey: string) {
    return this.call({ action: 'setGeminiKey', apiKey });
  },

  personalizeMenu(intake: unknown) {
    return this.call({ action: 'personalizeMenu', intake });
  },

  importMenu(pdfText: string) {
    return this.call({ action: 'importMenu', pdfText });
  },
};
