import axios from "axios";
import crypto from "crypto";

export default async function handler(req: any, res: any) {
    const { url, method } = req;

    // ========================
    // 🔐 JIRA AUTHORIZE
    // ========================
    if (url.startsWith("/api/auth/jira/authorize-url")) {
        const state = crypto.randomUUID();

        const params = new URLSearchParams({
            client_id: process.env.JIRA_CLIENT_ID!,
            response_type: "code",
            redirect_uri: process.env.JIRA_REDIRECT_URI!,
            scope: "read:jira-work write:jira-work read:jira-user offline_access",
            state,
        });

        return res.json({
            url: `https://auth.atlassian.com/authorize?${params.toString()}`
        });
    }

    // ========================
    // 🔁 JIRA CALLBACK (GET)
    // ========================
    if (url.startsWith("/api/auth/jira/callback")) {
        const parsed = new URL(req.url, `http://${req.headers.host}`);
        const code = parsed.searchParams.get("code");
        const error = parsed.searchParams.get("error");

        if (error) {
            return res.redirect(`/?error=${error}`);
        }

        if (!code) {
            return res.redirect(`/?error=missing_code`);
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

            // 🔥 QUICK FIX: kirim token ke frontend via URL (sementara)
            const encoded = encodeURIComponent(JSON.stringify(token));

            return res.redirect(`/?jira_token=${encoded}`);
        } catch (err: any) {
            console.error(err.response?.data);
            return res.redirect(`/?error=token_exchange_failed`);
        }
    }

    // ========================
    // 📡 JIRA SEARCH
    // ========================
    if (url.startsWith("/api/jira/search") && method === "POST") {
        try {
            let body = "";

            await new Promise((resolve) => {
                req.on("data", (chunk: any) => body += chunk);
                req.on("end", resolve);
            });

            const { token, jql, cloudId } = JSON.parse(body);

            if (!token?.accessToken) {
                return res.status(401).json({ error: "Invalid token" });
            }

            let resolvedCloudId = cloudId;

            if (!resolvedCloudId) {
                const resources = await axios.get(
                    "https://api.atlassian.com/oauth/token/accessible-resources",
                    {
                        headers: {
                            Authorization: `Bearer ${token.accessToken}`,
                        },
                    }
                );

                resolvedCloudId = resources.data[0]?.id;
            }

            const urlJira = `https://api.atlassian.com/ex/jira/${resolvedCloudId}/rest/api/3/search/jql`;

            const response = await axios.post(
                urlJira,
                { jql },
                {
                    headers: {
                        Authorization: `Bearer ${token.accessToken}`,
                    },
                }
            );

            return res.json(response.data);
        } catch (err: any) {
            return res.status(500).json(err.response?.data || err.message);
        }
    }

    // ========================
    // 📅 HOLIDAYS
    // ========================
    if (url.startsWith("/api/holidays")) {
        const parts = url.split("/");
        const year = parts[3];
        const month = parts[4];

        try {
            const response = await axios.get(
                `https://api-hari-libur.vercel.app/api?year=${year}&month=${month}`
            );

            return res.json(response.data?.data || []);
        } catch {
            return res.json([]);
        }
    }

    return res.status(404).json({ error: "Not found" });
}