const ADMIN_TOKEN_KEY = 'migordologo_admin_token';

function getEnv() {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
  const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';
  return { url, anon };
}

export type GordologoResponse = {
  ok: boolean;
  error?: string;
  backend?: boolean;
  hasAdmin?: boolean;
  hasGemini?: boolean;
  token?: string;
  text?: string;
  message?: string;
  recipeName?: string;
  recipeUrl?: string | null;
  items?: Array<{ name: string; quantity?: string; notes?: string | null }>;
};

export const backendService = {
  isConfigured(): boolean {
    const { url, anon } = getEnv();
    return Boolean(url && anon);
  },

  getAdminToken(): string {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY) || '';
  },

  setAdminToken(token: string | null): void {
    if (token) sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    else sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  },

  isSuperadminSession(): boolean {
    return Boolean(this.getAdminToken());
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
    const token = this.getAdminToken();
    if (token) headers['x-admin-token'] = token;

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

  bootstrap(password: string) {
    return this.call({ action: 'bootstrap', password });
  },

  login(password: string) {
    return this.call({ action: 'login', password });
  },

  async logout() {
    await this.call({ action: 'logout' });
    this.setAdminToken(null);
  },

  setGeminiKey(apiKey: string) {
    return this.call({ action: 'setGeminiKey', apiKey });
  },
};
