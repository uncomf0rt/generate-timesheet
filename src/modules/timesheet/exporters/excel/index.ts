import { DayRecord, EmployeeInfo, SignatureData } from '@/lib/types';
import { generateEnigmaExcel } from './companies/enigma';

export type CompanyId = 'ENIGMA';

export interface IExcelExporter {
  generate(
    records: DayRecord[],
    employeeInfo: EmployeeInfo,
    signatureData?: SignatureData,
    startDateStr?: string,
    endDateStr?: string
  ): Promise<void>;
}

export function getExcelExporter(company: CompanyId): IExcelExporter {
  switch (company) {
    case 'ENIGMA':
      return { generate: generateEnigmaExcel };
  }
}
