const PIN_STORAGE_KEY = 'karanot_pin_hash_v1';
const PIN_ITERATIONS = 150_000;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(Math.floor(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function legacyHash(pin: string): string {
  const normalized = `karanot:${pin.trim()}`;
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      // Keep compatibility with PINs created by earlier app versions.
      const bytes = new TextEncoder().encode(normalized);
      return '';
    }
  } catch { /* old fallback below */ }
  let h = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    h ^= normalized.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fnv_${(h >>> 0).toString(16)}`;
}

async function legacySha256(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`karanot:${pin.trim()}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(digest));
}

async function derivePin(pin: string, salt: Uint8Array, iterations: number): Promise<string> {
  if (!crypto?.subtle) throw new Error('Bu cihazda güvenli PIN koruması desteklenmiyor.');
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin.trim()), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, material, 256);
  return bytesToHex(new Uint8Array(bits));
}

export function hasStoredPin(): boolean {
  try { return Boolean(localStorage.getItem(PIN_STORAGE_KEY)); } catch { return false; }
}

export async function savePin(pin: string): Promise<void> {
  if (!/^[0-9]{4}$/.test(pin)) throw new Error('PIN dört rakamdan oluşmalı.');
  if (!globalThis.crypto?.subtle || !crypto.getRandomValues) {
    // Preserve usability on older WebViews; modern Android builds use PBKDF2.
    localStorage.setItem(PIN_STORAGE_KEY, legacyHash(pin));
    return;
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await derivePin(pin, salt, PIN_ITERATIONS);
  localStorage.setItem(PIN_STORAGE_KEY, `pbkdf2$${PIN_ITERATIONS}$${bytesToHex(salt)}$${derived}`);
}

export async function verifyPin(pin: string): Promise<boolean> {
  try {
    const stored = localStorage.getItem(PIN_STORAGE_KEY);
    if (!stored) return true;
    if (stored.startsWith('pbkdf2$')) {
      const [, iterationsText, saltHex, expected] = stored.split('$');
      const iterations = Number(iterationsText);
      if (!Number.isFinite(iterations) || iterations < 10000 || iterations > 1000000) return false;
      const actual = await derivePin(pin, hexToBytes(saltHex), iterations);
      return actual === expected;
    }

    let matches = false;
    if (stored.startsWith('fnv_')) matches = legacyHash(pin) === stored;
    else if (globalThis.crypto?.subtle) matches = (await legacySha256(pin)) === stored;

    // Upgrade older fast hashes to salted PBKDF2 after successful unlock.
    if (matches && globalThis.crypto?.subtle) {
      try { await savePin(pin); } catch { /* successful unlock must not be blocked by migration */ }
    }
    return matches;
  } catch {
    return false;
  }
}
