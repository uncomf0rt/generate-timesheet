import crypto from 'crypto';

function getJiraRedirectUri() {
  if (process.env.JIRA_REDIRECT_URI) return process.env.JIRA_REDIRECT_URI;
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/auth/jira/callback`;
  }
  return 'http://localhost:3000/api/auth/jira/callback';
}

export async function GET() {
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: process.env.JIRA_CLIENT_ID ?? '',
    response_type: 'code',
    redirect_uri: getJiraRedirectUri(),
    scope: 'read:jira-work read:jira-user offline_access',
    state,
  });

  return Response.json({
    url: `https://auth.atlassian.com/authorize?${params.toString()}`,
  });
}
