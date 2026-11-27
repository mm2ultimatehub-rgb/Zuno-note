const PIN_STORAGE_KEY = 'karanot_pin_hash_v1';

async function hashPin(pin: string): Promise<string> {
  const normalized = `karanot:${pin.trim()}`;
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const buf = new TextEncoder().encode(normalized);
      const digest = await crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fallback below if crypto.subtle unavailable
  }
  let h = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    h ^= normalized.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fnv_${(h >>> 0).toString(16)}`;
}

export function hasStoredPin(): boolean {
  try {
    return Boolean(localStorage.getItem(PIN_STORAGE_KEY));
  } catch {
    return false;
  }
}

export async function savePin(pin: string): Promise<void> {
  const hashed = await hashPin(pin);
  try {
    localStorage.setItem(PIN_STORAGE_KEY, hashed);
  } catch {
    // Ignore storage error
  }
}

export async function verifyPin(pin: string): Promise<boolean> {
  try {
    const stored = localStorage.getItem(PIN_STORAGE_KEY);
    if (!stored) return true;
    const candidate = await hashPin(pin);
    return candidate === stored;
  } catch {
    return false;
  }
}
