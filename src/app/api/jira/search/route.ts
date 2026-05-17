import { NextRequest } from "next/server";
import axios from "axios";

export async function POST(req: NextRequest) {
  try {
    const { token, jql } = await req.json();

    if (!token) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }

    let cloudId = '';
    try {
      const { data } = await axios.get('https://api.atlassian.com/oauth/token/accessible-resources', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        }
      });
      cloudId = data[0].id;
    } catch (error: any) {
      return Response.json({ error: "Failed to fetch cloud ID" }, { status: error.response?.status || 500 });
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
          'Content-Type': 'application/json'
        },
      }
    );
    return Response.json(response.data);
  } catch (err: any) {
    return Response.json(
      err.response?.data || { error: err.message },
      { status: err.response?.status || 500 }
    );
  }
}
