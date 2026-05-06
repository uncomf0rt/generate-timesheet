import { OAuthToken } from './types';
import * as api from './api';

const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes before actual expiry

/**
 * Check if a token is expired or about to expire
 */
export function isTokenExpired(token?: OAuthToken): boolean {
  if (!token || !token.expiresAt) return true;
  return Date.now() > token.expiresAt - TOKEN_EXPIRY_BUFFER;
}

/**
 * Ensure Azure token is valid, refresh if needed
 */
// export async function ensureAzureTokenValid(token?: OAuthToken): Promise<OAuthToken | null> {
//   if (!token) return null;
  
//   if (isTokenExpired(token)) {
//     if (!token.refreshToken) return null;
//     try {
//       return await api.refreshAzureToken(token.refreshToken);
//     } catch (error) {
//       console.error('Failed to refresh Azure token:', error);
//       return null;
//     }
//   }
  
//   return token;
// }

/**
 * Ensure Jira token is valid, refresh if needed
 */
export async function ensureJiraTokenValid(token?: OAuthToken): Promise<OAuthToken | null> {
  if (!token) return null;
  
  if (isTokenExpired(token)) {
    if (!token.refreshToken) return null;
    try {
      return await api.refreshJiraToken(token.refreshToken);
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
  return `${token.tokenType || 'Bearer'} ${token.accessToken}`;
}

/**
 * Store tokens in localStorage
 */
export function storeTokens(azureToken?: OAuthToken, jiraToken?: OAuthToken): void {
  if (azureToken) {
    localStorage.setItem('azure_token', JSON.stringify(azureToken));
  }
  if (jiraToken) {
    localStorage.setItem('jira_token', JSON.stringify(jiraToken));
  }
}

/**
 * Retrieve tokens from localStorage
 */
export function retrieveTokens(): { azureToken?: OAuthToken; jiraToken?: OAuthToken } {
  const azureTokenStr = localStorage.getItem('azure_token');
  const jiraTokenStr = localStorage.getItem('jira_token');
  
  return {
    azureToken: azureTokenStr ? JSON.parse(azureTokenStr) : undefined,
    jiraToken: jiraTokenStr ? JSON.parse(jiraTokenStr) : undefined
  };
}

/**
 * Clear tokens from localStorage
 */
export function clearTokens(): void {
  localStorage.removeItem('azure_token');
  localStorage.removeItem('jira_token');
}
