/**
 * Web Crypto API helpers for encrypting user settings at rest.
 *
 * - Key derivation: PBKDF2 with SHA-256, 210000 iterations (OWASP 2023+ recommendation)
 * - Cipher: AES-GCM, 256-bit key, 12-byte IV per encryption
 * - Salt: per-installation, generated once on first setup, stored alongside ciphertext
 *   (salt is not secret — its only job is to make rainbow tables useless)
 *
 * Browser-only. Throws on server-side import.
 */

const PBKDF2_ITERATIONS = 210000;
const KEY_LENGTH_BITS = 256;
const IV_LENGTH_BYTES = 12;
const SALT_LENGTH_BYTES = 16;

export interface EncryptedBlob {
  iv: string; // base64
  ct: string; // base64
}

/** Generate a cryptographically random salt. */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
}

/** Generate a fresh 12-byte IV. */
export function generateIv(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
}

/** Derive a non-extractable AES-GCM key from a passphrase + salt. */
export async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: KEY_LENGTH_BITS },
    false, // non-extractable
    ['encrypt', 'decrypt']
  );
}

/** Encrypt a UTF-8 string. Returns IV + ciphertext as base64. */
export async function encrypt(key: CryptoKey, plaintext: string): Promise<EncryptedBlob> {
  const iv = generateIv();
  const enc = new TextEncoder();
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  return { iv: b64encode(iv), ct: b64encode(new Uint8Array(ct)) };
}

/** Decrypt back to a UTF-8 string. Throws on wrong key / tampered ciphertext. */
export async function decrypt(key: CryptoKey, blob: EncryptedBlob): Promise<string> {
  const iv = b64decode(blob.iv);
  const ct = b64decode(blob.ct);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(pt);
}

/** Standard base64 (binary string → ASCII). */
export function b64encode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Reverse of b64encode. */
export function b64decode(s: string): Uint8Array {
  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
