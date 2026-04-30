import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy for Azure DevOps API
  app.post("/api/ado/repos", async (req, res) => {
    try {
      const { organization, project, pat } = req.body;
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
      const { organization, project, repoId, pat, searchCriteria } = req.body;
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
      const { domain, email, token, jql } = req.body;
      const url = `https://${domain}/rest/api/3/search`;
      const auth = Buffer.from(`${email}:${token}`).toString('base64');
      const response = await axios.get(url, {
        params: { jql },
        headers: { Authorization: `Basic ${auth}` }
      });
      res.json(response.data);
    } catch (error: any) {
      res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
  });

  // Proxy for Holidays API
  app.get("/api/holidays/:year/:month", async (req, res) => {
    try {
      // Free public API for Indonesian holidays
      const url = `https://api-harilibur.vercel.app/api`;
      const response = await axios.get(url);
      const { year, month } = req.params;
      
      // Filter for specific month and year if needed, or just return all and let frontend handle
      res.json(response.data);
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

startServer();
