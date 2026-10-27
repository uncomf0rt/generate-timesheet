/**
 * Encrypted localStorage wrapper.
 *
 * Single key `timesheet-secure` holds a JSON envelope:
 *   { version, kdf, cipher, iterations, salt, verification, payload }
 *
 * `verification` is the literal "timesheet-ok-v1" encrypted with the user's
 * passphrase-derived key — decrypting it successfully proves the passphrase
 * is correct without storing a hash.
 *
 * `payload` is the JSON-serialized SecurePayload (credentials, signature,
 * employee info, ADO config, Jira tokens, email templates) encrypted with
 * the same key.
 */

import * as crypto from './crypto';
import type { CompanyName, EmployeeInfo, OAuthToken, SignatureData } from './types';

const ENVELOPE_KEY = 'timesheet-secure';
const VERIFICATION_PLAINTEXT = 'timesheet-ok-v1';

// Old plaintext keys (pre-encryption versions) we migrate away from.
const PLAINTEXT_KEYS_TO_MIGRATE = [
  'timesheet-config',
  'jira_token',
  'azure_token',
  'timesheet-signature',
  'timesheet-employee-info',
  'timesheet-email-templates',
] as const;

export interface SecurePayload {
  // ADO config (encrypted)
  adoOrg: string;
  adoProject: string;
  adoEmail: string;
  azurePat: string;
  autoFillFromExternal: boolean;
  company: CompanyName;
  // Jira
  jiraToken?: OAuthToken;
  // Signature
  signatureData?: SignatureData;
  // Employee info
  employeeInfo: EmployeeInfo;
  // Email templates (text + the syncHash that pairs each template with a date range)
  emailTemplates: Record<string, { text: string; syncHash: string }>;
}

export interface SecureEnvelope {
  version: 1;
  kdf: 'PBKDF2-SHA256';
  cipher: 'AES-GCM';
  iterations: number;
  salt: string; // base64
  verification: crypto.EncryptedBlob;
  payload: crypto.EncryptedBlob;
}

export const EMPTY_PAYLOAD: SecurePayload = {
  adoOrg: '',
  adoProject: '',
  adoEmail: '',
  azurePat: '',
  autoFillFromExternal: true,
  company: 'ENIGMA',
  jiraToken: undefined,
  signatureData: undefined,
  employeeInfo: {
    company: 'ENIGMA',
    nik: '',
    nama: '',
    consultantRole: '',
    diketahuiOleh: '',
    disetujuiOleh: '',
  },
  emailTemplates: {},
};

// =============================================================================
// Envelope CRUD
// =============================================================================

export function hasEnvelope(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ENVELOPE_KEY) !== null;
}

export function loadEnvelope(): SecureEnvelope | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(ENVELOPE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SecureEnvelope;
  } catch {
    return null;
  }
}

function writeEnvelope(envelope: SecureEnvelope): void {
  localStorage.setItem(ENVELOPE_KEY, JSON.stringify(envelope));
}

export function clearEnvelope(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ENVELOPE_KEY);
}

// =============================================================================
// Setup / Unlock / Save
// =============================================================================

/**
 * Create a new envelope from a freshly-chosen passphrase. Returns the derived
 * key so the caller can immediately encrypt the initial payload without
 * re-deriving.
 */
export async function createEnvelope(passphrase: string): Promise<{
  key: CryptoKey;
  envelope: SecureEnvelope;
}> {
  const salt = crypto.generateSalt();
  const key = await crypto.deriveKey(passphrase, salt);
  const verification = await crypto.encrypt(key, VERIFICATION_PLAINTEXT);
  const payloadBlob = await crypto.encrypt(key, JSON.stringify(EMPTY_PAYLOAD));
  const envelope: SecureEnvelope = {
    version: 1,
    kdf: 'PBKDF2-SHA256',
    cipher: 'AES-GCM',
    iterations: 210000,
    salt: crypto.b64encode(salt),
    verification,
    payload: payloadBlob,
  };
  writeEnvelope(envelope);
  return { key, envelope };
}

/**
 * Verify passphrase, then decrypt and return the payload + key.
 * Returns null if passphrase is wrong or envelope is missing.
 */
export async function unlockWithPassphrase(
  passphrase: string
): Promise<{ key: CryptoKey; payload: SecurePayload } | null> {
  const envelope = loadEnvelope();
  if (!envelope) return null;
  try {
    const salt = crypto.b64decode(envelope.salt);
    const key = await crypto.deriveKey(passphrase, salt, envelope.iterations);
    const vt = await crypto.decrypt(key, envelope.verification);
    if (vt !== VERIFICATION_PLAINTEXT) return null;
    const payloadJson = await crypto.decrypt(key, envelope.payload);
    return { key, payload: JSON.parse(payloadJson) as SecurePayload };
  } catch {
    // AES-GCM throws on wrong key / tampered ciphertext
    return null;
  }
}

/**
 * Re-encrypt the current payload with a new passphrase. Requires the current
 * passphrase to decrypt first. Salt is regenerated.
 */
export async function changePassphrase(
  currentPassphrase: string,
  newPassphrase: string,
  currentPayload: SecurePayload
): Promise<{ envelope: SecureEnvelope; key: CryptoKey } | null> {
  const unlocked = await unlockWithPassphrase(currentPassphrase);
  if (!unlocked) return null;

  const salt = crypto.generateSalt();
  const newKey = await crypto.deriveKey(newPassphrase, salt);
  const verification = await crypto.encrypt(newKey, VERIFICATION_PLAINTEXT);
  const payloadBlob = await crypto.encrypt(newKey, JSON.stringify(currentPayload));
  const envelope: SecureEnvelope = {
    version: 1,
    kdf: 'PBKDF2-SHA256',
    cipher: 'AES-GCM',
    iterations: 210000,
    salt: crypto.b64encode(salt),
    verification,
    payload: payloadBlob,
  };
  writeEnvelope(envelope);
  return { envelope, key: newKey };
}

/**
 * Persist the payload re-encrypted under the existing envelope's key.
 * Verifies the key first by decrypting the verification blob.
 */
export async function savePayload(key: CryptoKey, payload: SecurePayload): Promise<void> {
  const envelope = loadEnvelope();
  if (!envelope) throw new Error('No envelope to save into');
  // Confirm the key matches this envelope
  try {
    const vt = await crypto.decrypt(key, envelope.verification);
    if (vt !== VERIFICATION_PLAINTEXT) throw new Error('Key does not match envelope');
  } catch {
    throw new Error('Key does not match envelope');
  }
  const payloadBlob = await crypto.encrypt(key, JSON.stringify(payload));
  const updated: SecureEnvelope = { ...envelope, payload: payloadBlob };
  writeEnvelope(updated);
}

// =============================================================================
// Migration from pre-encryption plaintext keys
// =============================================================================

export function detectPlaintextMigrationNeeded(): boolean {
  if (typeof window === 'undefined') return false;
  if (hasEnvelope()) return false;
  return PLAINTEXT_KEYS_TO_MIGRATE.some((k) => localStorage.getItem(k) !== null);
}

export function readPlaintextForMigration(): SecurePayload {
  const configRaw = localStorage.getItem('timesheet-config');
  const configParsed = configRaw ? safeJson(configRaw) : {};

  const jiraTokenRaw = localStorage.getItem('jira_token');
  const jiraToken = jiraTokenRaw ? safeJson<OAuthToken>(jiraTokenRaw) : undefined;

  const signatureRaw = localStorage.getItem('timesheet-signature');
  const signatureData = signatureRaw ? safeJson<SignatureData>(signatureRaw) : undefined;

  const employeeRaw = localStorage.getItem('timesheet-employee-info');
  const employeeInfo: EmployeeInfo = employeeRaw
    ? safeJson<EmployeeInfo>(employeeRaw)
    : { ...EMPTY_PAYLOAD.employeeInfo };

  const templatesRaw = localStorage.getItem('timesheet-email-templates');
  const emailTemplates = templatesRaw
    ? safeJson<SecurePayload['emailTemplates']>(templatesRaw)
    : {};

  return {
    adoOrg: configParsed.adoOrg ?? '',
    adoProject: configParsed.adoProject ?? '',
    adoEmail: configParsed.adoEmail ?? '',
    azurePat: configParsed.azurePat ?? '',
    autoFillFromExternal: configParsed.autoFillFromExternal ?? true,
    company: configParsed.company ?? 'ENIGMA',
    jiraToken,
    signatureData,
    employeeInfo: { ...employeeInfo, consultantRole: employeeInfo.consultantRole ?? '' },
    emailTemplates,
  };
}

export function deletePlaintextKeys(): void {
  for (const k of PLAINTEXT_KEYS_TO_MIGRATE) {
    localStorage.removeItem(k);
  }
}

function safeJson<T>(s: string): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return {} as T;
  }
}
