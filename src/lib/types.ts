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

export type KeteranganType = 'Hari kerja' | 'Libur' | 'Sakit' | 'Izin' | 'Cuti';

export interface DayRecord {
  date: Date;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  commits: string[];
  tasks: string[];
  editableActivity?: string;
  status: KeteranganType;
  jamMulai?: string;
  jamBerakhir?: string;
}

export interface EmployeeInfo {
  nik: string;
  nama: string;
  diketahuiOleh: string;
  disetujuiOleh: string;
}

export interface SignatureData {
  imageData: string; // base64 data URL
  type: 'draw' | 'upload';
}

export interface ADOProject {
  id: string;
  name: string;
}
