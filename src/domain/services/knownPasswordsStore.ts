/** Solo en este navegador: recordatorio de claves que el admin acaba de fijar.
 *  El servidor NUNCA puede devolver la contraseña actual (va cifrada). */
const KEY = 'gordologo_known_passwords_v1';

function read(): Record<string, string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function write(map: Record<string, string>) {
  localStorage.setItem(KEY, JSON.stringify(map));
}

export const knownPasswordsStore = {
  getAll(): Record<string, string> {
    return read();
  },

  get(userId: string): string | null {
    const v = read()[userId];
    return v ? String(v) : null;
  },

  set(userId: string, password: string) {
    const next = { ...read(), [userId]: password };
    write(next);
  },

  clear(userId: string) {
    const next = { ...read() };
    delete next[userId];
    write(next);
  },
};
