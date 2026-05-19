import axios from 'axios';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json(
      { valid: false, error: 'Missing or invalid authorization header' },
      { status: 401 }
    );
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const { data } = await axios.get('https://api.atlassian.com/oauth/token/accessible-resources', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!data || data.length === 0) {
      return Response.json({ valid: false, error: 'No Jira resources found' }, { status: 401 });
    }

    return Response.json({ valid: true });
  } catch (error: any) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      return Response.json({ valid: false, error: 'Token expired or invalid' }, { status: 401 });
    }
    return Response.json(
      { valid: false, error: error.response?.data?.error || 'Failed to validate token' },
      { status: error.response?.status || 500 }
    );
  }
}
