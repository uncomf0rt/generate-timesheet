// ============================================================
// Shared types for timesheet exporters
// ============================================================

export interface CompanyBranding {
  logo?: Buffer | Uint8Array | string;
}

export type EntryType = 'WORKDAY' | 'WEEKEND' | 'HOLIDAY' | 'LEAVE';

export interface TimesheetEntry {
  date: string;
  tasks: string[];
  startTime?: string;
  endTime?: string;
  remarks?: string;
  type: EntryType;
}

export interface TimesheetExport {
  branding: CompanyBranding;
  vendorName: string;
  consultantName: string;
  consultantRole: string;
  supervisorName: string;
  employeeName: string;
  reviewerName: string;
  approverName: string;
  entries: TimesheetEntry[];
  employeeSignature?: string; // base64 data URL
}

// ============================================================
// Exporter interface — allows adding new companies without
// modifying existing exporters (Acceptance Criteria #16)
// ============================================================

export interface ITimesheetExporter {
  generate(payload: TimesheetExport): Promise<void>;
}
