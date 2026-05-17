import axios from 'axios';
import { Config, OAuthToken } from './types';
import { toDate } from 'date-fns';

// Jira OAuth endpoints
export const initiateJiraOAuth = async () => {
  const { data } = await axios.get('/api/auth/jira/authorize-url');
  return data.url;
};

export const retrieveJiraToken = async (state: string) => {
  const { data } = await axios.post('/api/auth/jira/token', { state });
  return data.token as OAuthToken;
};

export const refreshJiraToken = async (refreshToken: string) => {
  const { data } = await axios.post('/api/auth/jira/refresh', { refreshToken });
  return data.token as OAuthToken;
};

// Azure DevOps API (using PAT)
export const getAdoRepos = async (config: Config) => {
  const { data: { repositories } } = await axios.post('/api/ado/repos', {
    organization: config.adoOrg,
    project: config.adoProject,
    pat: config.azurePat
  }) as any;
  return repositories;
};

export const getAdoCommits = async (config: Omit<Config, 'jiraToken'> & { repoId: string }) => {
  const { data: { commits } } = await axios.post('/api/ado/commits', {
    organization: config.adoOrg,
    project: config.adoProject,
    repoId: config.repoId,
    pat: config.azurePat,
    searchCriteria: {
      author: config.adoEmail,
      fromDate: config.startDate,
      toDate: config.endDate
    }
  }) as any;
  return commits;
};

// Jira API (using OAuth)
export const getJiraTasks = async (config: Config) => {
  console.log('token: ', config.jiraToken?.access_token);
  if (!config.jiraToken?.access_token) {
    return [];
  }
  // Format dates for JQL: YYYY-MM-DD (without quotes per Jira REST API v3 specification)
  const jql = `assignee = currentUser() AND updated >= ${config.startDate} AND updated <= ${config.endDate}`;
  
  try {
    const { data } = await axios.post('/api/jira/search', {
      token: config.jiraToken.access_token,
      jql
    });
    return data.issues;
  } catch (error: any) {
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
