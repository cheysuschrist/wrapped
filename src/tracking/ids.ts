/** Id helpers. Ids are opaque strings; only their stability matters. */

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

function randomToken(length: number): string {
  const bytes = new Uint8Array(length);
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i]! % ALPHABET.length];
  return out;
}

/** `createId('visitor')` -> `visitor_8f29a3b1`. */
export function createId(prefix: string, length = 10): string {
  return `${prefix}_${randomToken(length)}`;
}

/** Deterministic id factory, for tests and replayable fixtures. */
export function sequentialIds(start = 1): (prefix: string) => string {
  let n = start;
  return (prefix: string) => `${prefix}_${String(n++).padStart(4, '0')}`;
}

/** Lowercase + trim. Used to match a visitor to an existing attendee record. */
export function normalizeEmail(email: string | undefined): string | undefined {
  const value = email?.trim().toLowerCase();
  return value ? value : undefined;
}

/**
 * Digits only, so `(415) 555-0100` and `415-555-0100` match. Country codes are
 * kept as typed, which means `+14155550100` and `4155550100` are two different
 * keys — normalise to E.164 upstream if you need them to meet.
 */
export function normalizePhone(phone: string | undefined): string | undefined {
  const digits = phone?.replace(/\D/g, '');
  return digits ? digits : undefined;
}
