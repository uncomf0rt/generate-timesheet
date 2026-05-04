export interface Config {
  adoOrg: string;
  adoProject: string;
  adoEmail: string;
  jiraDomain: string; // e.g. "mycompany.atlassian.net"
  jiraEmail: string;
  startDate: string;
  endDate: string;
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
