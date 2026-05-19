import axios from 'axios';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { token, jql } = await req.json();

    if (!token) {
      return Response.json({ error: 'Invalid token' }, { status: 401 });
    }

    let cloudId = '';
    try {
      const { data } = await axios.get(
        'https://api.atlassian.com/oauth/token/accessible-resources',
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );
      if (!data || data.length === 0) {
        return Response.json({ error: 'No Jira resources found' }, { status: 401 });
      }
      cloudId = data[0].id;
    } catch (error: any) {
      // Return 401 for auth errors (expired/invalid token)
      if (error.response?.status === 401 || error.response?.status === 403) {
        return Response.json({ error: 'Token expired or invalid' }, { status: 401 });
      }
      return Response.json(
        { error: 'Failed to fetch cloud ID' },
        { status: error.response?.status || 500 }
      );
    }

    const urlJira = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search/jql`;

    const response = await axios.post(
      urlJira,
      {
        jql,
        fields: ['summary', 'assignee', 'updated', 'created'],
        fieldsByKeys: true,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );
    return Response.json(response.data);
  } catch (err: any) {
    return Response.json(err.response?.data || { error: err.message }, {
      status: err.response?.status || 500,
    });
  }
}
