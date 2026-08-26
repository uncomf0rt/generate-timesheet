import { format } from 'date-fns';
import { DayRecord, EmployeeInfo } from '@/lib/types';
import { EntryType, TimesheetEntry, TimesheetExport } from '../../../types';

// ============================================================
// Signature background removal — used by KOBUS
// ============================================================

export async function processSignatureForTransparentBg(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      const threshold = 240;

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        if (r >= threshold && g >= threshold && b >= threshold) {
          pixels[i + 3] = 0;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
}

// ============================================================
// KOBUS logo loader
// ============================================================

const KOBUS_LOGO_PATH = '/Logo-KSS.png';

export async function loadKobusLogo(): Promise<string | undefined> {
  try {
    const res = await fetch(KOBUS_LOGO_PATH);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

// ============================================================
// Status → EntryType mapping
// ============================================================

function toEntryType(record: DayRecord): EntryType {
  if (record.status === 'Hari kerja') return 'WORKDAY';
  if (record.status === 'Libur') {
    if (record.isHoliday) return 'HOLIDAY';
    if (record.isWeekend) return 'WEEKEND';
    return 'LEAVE';
  }
  return 'LEAVE';
}

// ============================================================
// DayRecord → TimesheetEntry
// ============================================================

function mapEntry(record: DayRecord): TimesheetEntry {
  const dateStr = format(record.date, 'dd/MM/yyyy');
  const tasks: string[] =
    record.editableActivity !== undefined
      ? record.editableActivity.split('\n').filter(Boolean)
      : [...record.tasks, ...record.commits].filter(Boolean);

  const remarks: string | undefined =
    record.status === 'Hari kerja'
      ? 'Implementation & Testing'
      : record.isHoliday && record.holidayName
        ? record.holidayName
        : undefined;

  return {
    date: dateStr,
    tasks,
    startTime: record.jamMulai,
    endTime: record.jamBerakhir,
    remarks,
    type: toEntryType(record),
  };
}

// ============================================================
// KOBUS export payload builder
// ============================================================

async function buildKobusExport(
  records: DayRecord[],
  employeeInfo: EmployeeInfo,
  logo?: string,
  signatureData?: string
): Promise<TimesheetExport> {
  const processedSignature = signatureData
    ? await processSignatureForTransparentBg(signatureData)
    : undefined;

  return {
    branding: { logo },
    vendorName: 'Kobus Smart Service',
    consultantName: employeeInfo.nama,
    consultantRole: employeeInfo.consultantRole,
    supervisorName: employeeInfo.disetujuiOleh,
    employeeName: employeeInfo.nama,
    reviewerName: employeeInfo.diketahuiOleh,
    approverName: employeeInfo.disetujuiOleh,
    entries: records.map(mapEntry),
    employeeSignature: processedSignature,
  };
}

// ============================================================
// Factory
// ============================================================

export type CompanyId = 'KOBUS';

export async function buildExportPayload(
  _company: 'KOBUS',
  records: DayRecord[],
  employeeInfo: EmployeeInfo,
  logo?: string,
  signatureData?: string
): Promise<TimesheetExport> {
  return buildKobusExport(records, employeeInfo, logo, signatureData);
}
