import { NextRequest } from "next/server";
import axios from "axios";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return Response.redirect(new URL(`/?error=${error}`, req.url));
  }

  if (!code) {
    return Response.redirect(new URL(`/?error=missing_code`, req.url));
  }

  try {
    const tokenResponse = await axios.post(
      "https://auth.atlassian.com/oauth/token",
      {
        grant_type: "authorization_code",
        client_id: process.env.JIRA_CLIENT_ID,
        client_secret: process.env.JIRA_CLIENT_SECRET,
        code,
        redirect_uri: process.env.JIRA_REDIRECT_URI,
      }
    );

    const token = tokenResponse.data;
    const encoded = encodeURIComponent(JSON.stringify(token));

    return Response.redirect(new URL(`/?jira_token=${encoded}`, req.url));
  } catch (err: any) {
    console.error(err.response?.data);
    return Response.redirect(
      new URL(`/?error=token_exchange_failed`, req.url)
    );
  }
}
