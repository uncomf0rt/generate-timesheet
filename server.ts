import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

dotenv.config();

// Store for OAuth states and tokens (in production, use a session store or database)
const oauthStates = new Map<string, { timestamp: number; service: string }>();
const userTokens = new Map<string, { azure?: any; jira?: any }>();

function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { codeVerifier, codeChallenge };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // OAuth Endpoints

  // Azure OAuth - Get Authorization URL
  app.get("/api/auth/azure/authorize-url", (req, res) => {
    const clientId = process.env.AZURE_CLIENT_ID;
    const redirectUri = process.env.AZURE_REDIRECT_URI || "http://localhost:3000/auth/azure/callback";

    if (!clientId) {
      return res.status(500).json({ error: "AZURE_CLIENT_ID not configured" });
    }

    const state = uuidv4();
    const { codeChallenge, codeVerifier } = generatePKCE();

    oauthStates.set(state, { timestamp: Date.now(), service: 'azure' });
    // In production, store codeVerifier in session/database with state

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      scope: 'offline_access https://management.azure.com/user_impersonation',
      redirect_uri: redirectUri,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
    res.json({ url });
  });

  // Azure OAuth - Callback
  app.post("/api/auth/azure/callback", async (req, res) => {
    const { code, state } = req.body;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    const redirectUri = process.env.AZURE_REDIRECT_URI || "http://localhost:3000/auth/azure/callback";

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: "Azure OAuth credentials not configured" });
    }

    if (!oauthStates.has(state)) {
      return res.status(400).json({ error: "Invalid state parameter" });
    }

    try {
      const tokenResponse = await axios.post(
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        {
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
          scope: "offline_access https://management.azure.com/user_impersonation"
        }
      );

      const token = {
        accessToken: tokenResponse.data.access_token,
        refreshToken: tokenResponse.data.refresh_token,
        expiresIn: tokenResponse.data.expires_in,
        expiresAt: Date.now() + tokenResponse.data.expires_in * 1000,
        tokenType: tokenResponse.data.token_type
      };

      oauthStates.delete(state);
      res.json({ token });
    } catch (error: any) {
      res.status(400).json({ error: error.response?.data || error.message });
    }
  });

  // Azure Token Refresh
  app.post("/api/auth/azure/refresh", async (req, res) => {
    const { refreshToken } = req.body;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: "Azure OAuth credentials not configured" });
    }

    try {
      const tokenResponse = await axios.post(
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        {
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
          scope: "offline_access https://management.azure.com/user_impersonation"
        }
      );

      const token = {
        accessToken: tokenResponse.data.access_token,
        refreshToken: tokenResponse.data.refresh_token || refreshToken,
        expiresIn: tokenResponse.data.expires_in,
        expiresAt: Date.now() + tokenResponse.data.expires_in * 1000,
        tokenType: tokenResponse.data.token_type
      };

      res.json({ token });
    } catch (error: any) {
      res.status(400).json({ error: error.response?.data || error.message });
    }
  });

  // Jira OAuth - Get Authorization URL
  app.get("/api/auth/jira/authorize-url", (req, res) => {
    const clientId = process.env.JIRA_CLIENT_ID;
    const redirectUri = process.env.JIRA_REDIRECT_URI || "http://localhost:3000/auth/jira/callback";

    if (!clientId) {
      return res.status(500).json({ error: "JIRA_CLIENT_ID not configured" });
    }

    const state = uuidv4();
    const scope = 'read:jira-work write:jira-work read:jira-user offline_access';

    oauthStates.set(state, { timestamp: Date.now(), service: 'jira' });

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope,
      state
    });

    const url = `https://auth.atlassian.com/authorize?${params.toString()}`;
    console.log('url: ', url);
    res.json({ url });
  });

  // Jira OAuth - Callback
  app.post("/api/auth/jira/callback", async (req, res) => {
    const { code, state } = req.body;
    const clientId = process.env.JIRA_CLIENT_ID;
    const clientSecret = process.env.JIRA_CLIENT_SECRET;
    const redirectUri = process.env.JIRA_REDIRECT_URI || "http://localhost:3000/auth/jira/callback";

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: "Jira OAuth credentials not configured" });
    }

    if (!oauthStates.has(state)) {
      return res.status(400).json({ error: "Invalid state parameter" });
    }

    try {
      const tokenResponse = await axios.post(
        "https://auth.atlassian.com/oauth/token",
        {
          grant_type: "authorization_code",
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri
        }
      );

      const token = {
        accessToken: tokenResponse.data.access_token,
        refreshToken: tokenResponse.data.refresh_token,
        expiresIn: tokenResponse.data.expires_in,
        expiresAt: Date.now() + tokenResponse.data.expires_in * 1000,
        tokenType: tokenResponse.data.token_type
      };

      oauthStates.delete(state);
      res.json({ token });
    } catch (error: any) {
      res.status(400).json({ error: error.response?.data || error.message });
    }
  });

  // Jira Token Refresh
  app.post("/api/auth/jira/refresh", async (req, res) => {
    const { refreshToken } = req.body;
    const clientId = process.env.JIRA_CLIENT_ID;
    const clientSecret = process.env.JIRA_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: "Jira OAuth credentials not configured" });
    }

    try {
      const tokenResponse = await axios.post(
        "https://auth.atlassian.com/oauth/token",
        {
          grant_type: "refresh_token",
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken
        }
      );

      const token = {
        accessToken: tokenResponse.data.access_token,
        refreshToken: tokenResponse.data.refresh_token || refreshToken,
        expiresIn: tokenResponse.data.expires_in,
        expiresAt: Date.now() + tokenResponse.data.expires_in * 1000,
        tokenType: tokenResponse.data.token_type
      };

      res.json({ token });
    } catch (error: any) {
      res.status(400).json({ error: error.response?.data || error.message });
    }
  });

  // API Endpoints with OAuth

  // Proxy for Azure DevOps API
  app.post("/api/ado/repos", async (req, res) => {
    try {
      const { organization, project, pat } = req.body;

      if (!pat) {
        return res.status(401).json({ error: "Azure PAT is required" });
      }

      const url = `https://dev.azure.com/${organization}/${project}/_apis/git/repositories?api-version=7.1`;
      const auth = Buffer.from(`:${pat}`).toString('base64');

      const response = await axios.get(url, {
        headers: { Authorization: `Basic ${auth}` }
      });
      res.json(response.data);
    } catch (error: any) {
      res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
  });

  app.post("/api/ado/commits", async (req, res) => {
    try {
      const { organization, project, repoId, searchCriteria, pat } = req.body;

      if (!pat) {
        return res.status(401).json({ error: "Azure PAT is required" });
      }

      let url = `https://dev.azure.com/${organization}/${project}/_apis/git/repositories/${repoId}/commits?api-version=7.1`;

      const params = new URLSearchParams();
      if (searchCriteria?.author) params.append('searchCriteria.author', searchCriteria.author);
      if (searchCriteria?.fromDate) params.append('searchCriteria.fromDate', searchCriteria.fromDate);
      if (searchCriteria?.toDate) params.append('searchCriteria.toDate', searchCriteria.toDate);

      if (params.toString()) {
        url += `&${params.toString()}`;
      }

      const auth = Buffer.from(`:${pat}`).toString('base64');

      const response = await axios.get(url, {
        headers: { Authorization: `Basic ${auth}` }
      });
      res.json(response.data);
    } catch (error: any) {
      res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
  });

  // Proxy for Jira API
  app.post("/api/jira/search", async (req, res) => {
    try {
      const { token, jql, cloudId, maxResults = 50 } = req.body;

      if (!token) {
        return res.status(401).json({ error: "Not authenticated with Jira" });
      }

      if (!token.accessToken) {
        return res.status(401).json({ error: "Invalid token: missing accessToken" });
      }

      let resolvedCloudId = cloudId;

      // If cloudId not provided, fetch it from the accessible resources endpoint
      if (!resolvedCloudId) {
        const resourcesResponse = await axios.get(
          "https://api.atlassian.com/oauth/token/accessible-resources",
          {
            headers: {
              Authorization: `Bearer ${token.accessToken}`,
              Accept: "application/json",
            },
          }
        );

        const resources: Array<{ id: string; url: string; name: string }> =
          resourcesResponse.data;

        if (!resources || resources.length === 0) {
          return res.status(404).json({ error: "No accessible Jira resources found for this token" });
        }

        resolvedCloudId = resources[0].id;
      }

      // Correct Jira Cloud OAuth API URL - use new enhanced search endpoint per CHANGE-2046
      const url = `https://api.atlassian.com/ex/jira/${resolvedCloudId}/rest/api/3/search/jql`;

      const response = await axios.post(
        url,
        {
          jql,
          maxResults,
          fields: ['key', 'fields', 'summary', 'updated'],
          fieldsByKeys: true,
        },
        {
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      res.json({
        ...response.data,
        _meta: { cloudId: resolvedCloudId },
      });

    } catch (error: any) {
      const status = error.response?.status || 500;
      const data = error.response?.data;

      // Surface actionable error messages
      if (status === 401) {
        return res.status(401).json({ error: "Jira token is invalid or expired. Re-authenticate.", detail: data });
      }
      if (status === 403) {
        return res.status(403).json({ error: "Insufficient Jira scopes. Ensure read:jira-work is granted.", detail: data });
      }
      if (status === 400) {
        return res.status(400).json({ error: "Invalid JQL query.", detail: data });
      }

      res.status(status).json(data || { error: error.message });
    }
  });

  // Proxy for Holidays API
  app.get("/api/holidays/:year/:month", async (req, res) => {
    try {
      const { year, month } = req.params;
      const url = `https://api-hari-libur.vercel.app/api?year=${year}&month=${month}`;
      const response = await axios.get(url);

      if (response.data && response.data.data) {
        res.json(response.data.data);
      } else {
        res.json(response.data);
      }
    } catch (error: any) {
      // Fallback
      res.status(200).json([]);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Couldn't start the server: ", error?.message);
})