const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

async function deriveAesKey(seed: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(seed));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function getVaultSeedForVersion(version: 'v1' | 'v2'): string | null {
  if (version === 'v2') {
    const dedicated = (Deno.env.get('PASSWORD_VAULT_KEY') || '').trim();
    return dedicated || null;
  }
  const srk = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '').trim();
  return srk ? `${srk}::migordologo-vault-v1` : null;
}

function getActiveVaultConfig(): { version: 'v1' | 'v2'; seed: string } {
  const dedicated = getVaultSeedForVersion('v2');
  if (dedicated) return { version: 'v2', seed: dedicated };
  const fallback = getVaultSeedForVersion('v1');
  if (!fallback) {
    throw new Error('Falta clave de cifrado del servidor.');
  }
  return { version: 'v1', seed: fallback };
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const { version, seed } = getActiveVaultConfig();
  const key = await deriveAesKey(seed);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    textEncoder.encode(plaintext)
  );
  const cipherBytes = new Uint8Array(cipherBuffer);
  return `enc:${version}:${bytesToBase64(iv)}:${bytesToBase64(cipherBytes)}`;
}

export async function decryptSecret(stored: string | null | undefined): Promise<string | null> {
  if (!stored) return null;
  if (!stored.startsWith('enc:')) {
    // Compatibilidad transitoria con filas anteriores sin cifrar
    return stored;
  }
  const parts = stored.split(':');
  if (parts.length !== 4) return null;
  const version = parts[1];
  if (version !== 'v1' && version !== 'v2') return null;

  const seed = getVaultSeedForVersion(version);
  if (!seed) return null;

  try {
    const key = await deriveAesKey(seed);
    const iv = base64ToBytes(parts[2]);
    const cipherBytes = base64ToBytes(parts[3]);
    const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBytes);
    return textDecoder.decode(plainBuffer);
  } catch {
    return null;
  }
}

export async function hashResetCode(email: string, code: string): Promise<string> {
  const { seed } = getActiveVaultConfig();
  const input = `${seed}::reset::${email.trim().toLowerCase()}::${code.trim()}`;
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function generateSixDigitCode(): string {
  const limit = Math.floor(0x100000000 / 1000000) * 1000000;
  const buf = new Uint32Array(1);
  while (true) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) {
      return String(buf[0] % 1000000).padStart(6, '0');
    }
  }
}

export function randomTempPassword(len = 12): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const limit = Math.floor(256 / alphabet.length) * alphabet.length;
  const out: string[] = [];
  const buf = new Uint8Array(1);
  while (out.length < len) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) {
      out.push(alphabet[buf[0] % alphabet.length]);
    }
  }
  return out.join('');
}
