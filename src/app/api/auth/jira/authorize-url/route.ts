import crypto from 'crypto';

import { getJiraRedirectUri } from '@/lib/oauthUtils';

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
