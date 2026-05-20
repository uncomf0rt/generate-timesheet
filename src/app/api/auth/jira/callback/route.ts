import axios from 'axios';
import { NextRequest } from 'next/server';

function getJiraRedirectUri() {
  if (process.env.JIRA_REDIRECT_URI) return process.env.JIRA_REDIRECT_URI;
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/auth/jira/callback`;
  }
  return 'http://localhost:3000/api/auth/jira/callback';
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return Response.redirect(new URL(`/?error=${error}`, req.url));
  }

  if (!code) {
    return Response.redirect(new URL(`/?error=missing_code`, req.url));
  }

  try {
    const tokenResponse = await axios.post('https://auth.atlassian.com/oauth/token', {
      grant_type: 'authorization_code',
      client_id: process.env.JIRA_CLIENT_ID,
      client_secret: process.env.JIRA_CLIENT_SECRET,
      code,
      redirect_uri: getJiraRedirectUri(),
    });

    const token = tokenResponse.data;
    const encoded = encodeURIComponent(JSON.stringify(token));

    return Response.redirect(new URL(`/?jira_token=${encoded}`, req.url));
  } catch (err: any) {
    console.error(err.response?.data);
    return Response.redirect(new URL(`/?error=token_exchange_failed`, req.url));
  }
}
