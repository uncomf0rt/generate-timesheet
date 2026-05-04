import axios from 'axios';
import { Config } from './types';

export const getAdoRepos = async (config: Config) => {
  const { data } = await axios.post('/api/ado/repos', {
    organization: config.adoOrg,
    project: config.adoProject
  });
  return data.value;
};

export const getAdoCommits = async (config: Config, repoId: string, fromDate: string, toDate: string) => {
  const { data } = await axios.post('/api/ado/commits', {
    organization: config.adoOrg,
    project: config.adoProject,
    repoId,
    searchCriteria: {
      author: config.adoEmail,
      fromDate,
      toDate
    }
  });
  return data.value;
};

export const getJiraTasks = async (config: Config, fromDateStr: string, toDateStr: string) => {
  if (!config.jiraDomain || !config.jiraEmail) return [];
  
  // Format dates for JQL: YYYY-MM-DD
  const jql = `assignee=currentuser() AND updated >= "${fromDateStr}" AND updated <= "${toDateStr}"`;
  
  try {
    const { data } = await axios.post('/api/jira/search', {
      domain: config.jiraDomain,
      email: config.jiraEmail,
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
