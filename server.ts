import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import * as dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy for Azure DevOps API
  app.post("/api/ado/repos", async (req, res) => {
    try {
      const { organization, project } = req.body;
      const pat = process.env.AZURE_PAT_KEY;
      
      if (!pat) {
        return res.status(500).json({ error: "AZURE_PAT_KEY environment variable is not configured" });
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
      const { organization, project, repoId, searchCriteria } = req.body;
      const pat = process.env.AZURE_PAT_KEY;
      
      if (!pat) {
        return res.status(500).json({ error: "AZURE_PAT_KEY environment variable is not configured" });
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
      const { domain, email, jql } = req.body;
      const token = process.env.API_JIRA_KEY;
      
      if (!token) {
        return res.status(500).json({ error: "API_JIRA_KEY environment variable is not configured" });
      }
      
      // Clean domain in case user inputted https:// or trailing slashes
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const url = `https://${cleanDomain}/rest/api/3/search/jql`;
      
      const auth = Buffer.from(`${email}:${token}`).toString('base64');
      const response = await axios.post(url, { jql }, {
        headers: { 
          Authorization: `Basic ${auth}`,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      });
      res.json(response.data);
    } catch (error: any) {
      res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
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

startServer();
