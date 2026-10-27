import * as api from './api';
import * as crypto from './crypto';
import * as secureStorage from './secureStorage';
import type { OAuthToken } from './types';

const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes before actual expiry

/**
 * Check if a token is expired or about to expire
 */
export function isTokenExpired(token?: OAuthToken): boolean {
  if (!token?.expires_in) return true;
  return Date.now() > token.expires_in - TOKEN_EXPIRY_BUFFER;
}

/**
 * Ensure Jira token is valid, refresh if needed
 */
export async function ensureJiraTokenValid(token?: OAuthToken): Promise<OAuthToken | null> {
  if (!token) return null;

  if (isTokenExpired(token)) {
    if (!token.refresh_token) return null;
    try {
      return await api.refreshJiraToken(token.refresh_token);
    } catch (error) {
      console.error('Failed to refresh Jira token:', error);
      return null;
    }
  }

  return token;
}

/**
 * Get formatted token for authorization header
 */
export function getAuthorizationHeader(token: OAuthToken): string {
  return `${token.token_type || 'Bearer'} ${token.access_token}`;
}

/**
 * Internal helper: load the current payload, apply a mutation, and re-save.
 * Throws if no envelope exists or the key does not match.
 */
async function mutatePayload(
  key: CryptoKey,
  mutator: (payload: secureStorage.SecurePayload) => void
): Promise<secureStorage.SecurePayload> {
  const envelope = secureStorage.loadEnvelope();
  if (!envelope) throw new Error('No encrypted envelope exists. Set up a passphrase first.');
  const payloadJson = await crypto.decrypt(key, envelope.payload);
  const payload = JSON.parse(payloadJson) as secureStorage.SecurePayload;
  mutator(payload);
  await secureStorage.savePayload(key, payload);
  return payload;
}

/**
 * Store Jira OAuth token inside the encrypted envelope.
 */
export async function storeJiraToken(key: CryptoKey, token: OAuthToken): Promise<void> {
  await mutatePayload(key, (payload) => {
    payload.jiraToken = token;
  });
}

/**
 * Retrieve Jira OAuth token from the encrypted envelope.
 */
export async function retrieveJiraToken(key: CryptoKey): Promise<OAuthToken | undefined> {
  const envelope = secureStorage.loadEnvelope();
  if (!envelope) return undefined;
  const payloadJson = await crypto.decrypt(key, envelope.payload);
  const payload = JSON.parse(payloadJson) as secureStorage.SecurePayload;
  return payload.jiraToken;
}

/**
 * Clear Jira OAuth token from the encrypted envelope.
 */
export async function clearJiraToken(key: CryptoKey): Promise<void> {
  await mutatePayload(key, (payload) => {
    payload.jiraToken = undefined;
  });
}

export function getJiraRedirectUri(): string {
  if (process.env.JIRA_REDIRECT_URI) return process.env.JIRA_REDIRECT_URI;
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/auth/jira/callback`;
  }
  return 'http://localhost:3000/api/auth/jira/callback';
}
