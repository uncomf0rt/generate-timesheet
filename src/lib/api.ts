import axios from 'axios';
import { Config, OAuthToken } from './types';

// Jira OAuth endpoints
export const initiateJiraOAuth = async () => {
  const { data } = await axios.get('/api/auth/jira/authorize-url');
  console.log('data: ', data);
  return data.url;
};

export const exchangeJiraAuthCode = async (code: string, state: string) => {
  const { data } = await axios.post('/api/auth/jira/callback', { code, state });
  console.log('data: ', data);
  return data.token as OAuthToken;
};

export const refreshJiraToken = async (refreshToken: string) => {
  const { data } = await axios.post('/api/auth/jira/refresh', { refreshToken });
  return data.token as OAuthToken;
};

// Azure DevOps API (using PAT)
export const getAdoRepos = async (config: Config) => {
  const { data } = await axios.post('/api/ado/repos', {
    organization: config.adoOrg,
    project: config.adoProject,
    pat: config.azurePat
  });
  return data.value;
};

export const getAdoCommits = async (config: Config, repoId: string, fromDate: string, toDate: string) => {
  const { data } = await axios.post('/api/ado/commits', {
    organization: config.adoOrg,
    project: config.adoProject,
    repoId,
    pat: config.azurePat,
    searchCriteria: {
      author: config.adoEmail,
      fromDate,
      toDate
    }
  });
  return data.value;
};

// Jira API (using OAuth)
export const getJiraTasks = async (config: Config, fromDateStr: string, toDateStr: string) => {
  if (!config.jiraToken) return [];
  
  // Format dates for JQL: YYYY-MM-DD (without quotes per Jira REST API v3 specification)
  const jql = `assignee = currentUser() AND updated >= ${fromDateStr} AND updated <= ${toDateStr}`;
  
  try {
    const { data } = await axios.post('/api/jira/search', {
      token: config.jiraToken,
      jql
    });
    return data.issues;
  } catch (error) {
    console.error("Failed to fetch Jira tasks", error);
    return [];
  }
};

export const getHolidays = async (year: number, month: number) => {
  try {
    const { data } = await axios.get(`/api/holidays/${year}/${month+1}`);
    return data;
  } catch (error) {
    return [];
  }
};
