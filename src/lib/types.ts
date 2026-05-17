export interface OAuthToken {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
}

export interface JiraOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationServerUrl: string; // e.g. https://auth.atlassian.com
}

export interface Config {
  adoOrg: string;
  adoProject: string;
  adoEmail: string;
  azurePat: string;
  startDate: string;
  endDate: string;
  jiraToken?: OAuthToken;
}

export interface DayRecord {
  date: Date;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  commits: string[];
  tasks: string[];
  editableActivity?: string;
  status: "Hari kerja" | "Libur";
}

export interface ADOProject {
  id: string;
  name: string;
}
