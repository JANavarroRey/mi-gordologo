const USER_TOKEN_KEY = 'migordologo_user_token';
const AUTH_USER_KEY = 'migordologo_auth_user_id';
const ADMIN_TOKEN_KEY = 'migordologo_admin_token';

function getEnv() {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
  const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';
  return { url, anon };
}

export type RemoteUser = {
  id: string;
  name: string;
  role?: string;
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
  hasGemini?: boolean;
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
  measurementsUpdatedAt?: string | null;
};

export const backendService = {
  isConfigured(): boolean {
    const { url, anon } = getEnv();
    return Boolean(url && anon);
  },

  getUserToken(): string {
    return localStorage.getItem(USER_TOKEN_KEY) || '';
  },

  setUserToken(token: string | null): void {
    if (token) localStorage.setItem(USER_TOKEN_KEY, token);
    else localStorage.removeItem(USER_TOKEN_KEY);
  },

  getAuthUserId(): string {
    return localStorage.getItem(AUTH_USER_KEY) || '';
  },

  setAuthUserId(id: string | null): void {
    if (id) localStorage.setItem(AUTH_USER_KEY, id);
    else localStorage.removeItem(AUTH_USER_KEY);
  },

  isAuthSuperadmin(): boolean {
    return this.getAuthUserId() === 'pepe';
  },

  getAdminToken(): string {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY) || '';
  },

  setAdminToken(token: string | null): void {
    if (token) sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    else sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  },

  isLoggedIn(): boolean {
    return Boolean(this.getUserToken());
  },

  isSuperadminSession(): boolean {
    return Boolean(this.getUserToken() || this.getAdminToken());
  },

  async call(body: Record<string, unknown>): Promise<GordologoResponse> {
    const { url, anon } = getEnv();
    if (!url || !anon) {
      return { ok: false, error: 'NO_BACKEND' };
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: anon,
      Authorization: `Bearer ${anon}`,
    };
    const userToken = this.getUserToken();
    if (userToken) headers['x-user-token'] = userToken;
    const adminToken = this.getAdminToken();
    if (adminToken) headers['x-admin-token'] = adminToken;

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

  bootstrapUsers(pepePassword: string, mariaPassword: string, extra?: Record<string, unknown>) {
    return this.call({ action: 'bootstrapUsers', pepePassword, mariaPassword, ...extra });
  },

  login(userId: string, password: string) {
    return this.call({ action: 'login', userId, password });
  },

  async logout() {
    await this.call({ action: 'logout' });
    this.setUserToken(null);
    this.setAdminToken(null);
    this.setAuthUserId(null);
  },

  openAsUser(targetUserId: string) {
    return this.call({ action: 'openAsUser', targetUserId });
  },

  createUser(body: Record<string, unknown>) {
    return this.call({ action: 'createUser', ...body });
  },

  setUserPassword(userId: string, password: string) {
    return this.call({ action: 'setUserPassword', userId, password });
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
};
