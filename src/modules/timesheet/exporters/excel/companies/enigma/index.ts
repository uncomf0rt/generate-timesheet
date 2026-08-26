import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { DayRecord, EmployeeInfo, KeteranganType, SignatureData } from '@/lib/types';

const HEADER_ROW = 5;
const DATA_START_ROW = 6;
const YELLOW_FILL = 'FFFFC000';
const THIN_BORDER = { style: 'thin' as const };

function isLeaveType(status: KeteranganType): boolean {
  return status !== 'Hari kerja';
}

function timeStringToHours(timeStr: string): number {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + minutes / 60;
}

// ============================================================
// ENIGMA Excel exporter
// Full 10-column layout with summary, signature, and Holiday sheet
// ============================================================

export async function generateEnigmaExcel(
  records: DayRecord[],
  employeeInfo: EmployeeInfo,
  signatureData?: SignatureData,
  startDateStr?: string,
  endDateStr?: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Timesheet');
  sheet.views = [{ showGridLines: false }];

  // Set column widths (mimicking template)
  sheet.getColumn('A').width = 5; // margin
  sheet.getColumn('B').width = 14; // NIK
  sheet.getColumn('C').width = 17; // Nama
  sheet.getColumn('D').width = 20; // Tanggal
  sheet.getColumn('E').width = 13; // Jam Mulai
  sheet.getColumn('F').width = 18; // Jam Berakhir
  sheet.getColumn('G').width = 16; // Durasi Kerja
  sheet.getColumn('H').width = 110; // Deskripsi Pekerjaan
  sheet.getColumn('I').width = 23; // Atasan / Jabatan
  sheet.getColumn('J').width = 31; // Keterangan Lainnya
  sheet.getColumn('K').width = 2; // margin

  // ============================================================
  // HEADER ROW (Row 5)
  // ============================================================
  const headers = [
    { col: 'B', text: 'NIK' },
    { col: 'C', text: 'Nama' },
    { col: 'D', text: 'Tanggal' },
    { col: 'E', text: 'Jam Mulai' },
    { col: 'F', text: 'Jam Berakhir' },
    { col: 'G', text: 'Durasi Kerja' },
    { col: 'H', text: 'Deskripsi Pekerjaan' },
    { col: 'I', text: 'Atasan / Jabatan ' },
    { col: 'J', text: 'Keterangan Lainnya' },
  ];

  for (const h of headers) {
    const cell = sheet.getCell(`${h.col}${HEADER_ROW}`);
    cell.value = h.text;
    cell.font = { bold: true, name: 'Calibri', size: 11 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      left: THIN_BORDER,
      right: THIN_BORDER,
      top: THIN_BORDER,
      bottom: THIN_BORDER,
    };
  }

  // ============================================================
  // DATA ROWS
  // ============================================================
  const dataEndRow = DATA_START_ROW + records.length - 1;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const rowNum = DATA_START_ROW + i;
    const isLeave = isLeaveType(record.status);

    const cellActivity =
      record.editableActivity !== undefined
        ? record.editableActivity
        : [...record.tasks, ...record.commits].join('\n');

    const jamMulaiHours = timeStringToHours(record.jamMulai || '');
    const jamBerakhirHours = timeStringToHours(record.jamBerakhir || '');
    const durasiHours = jamBerakhirHours - jamMulaiHours;

    const rowData = {
      nik: employeeInfo.nik,
      nama: employeeInfo.nama,
      tanggal: format(record.date, 'dd MMM yyyy', { locale: id }),
      jamMulai: record.jamMulai || '',
      jamBerakhir: record.jamBerakhir || '',
      durasi: record.jamMulai && record.jamBerakhir ? durasiHours : '',
      deskripsi: cellActivity || '',
      atasan: employeeInfo.disetujuiOleh,
      // Excel-only: any Libur record shows as plain "Libur"
      keterangan:
        record.status === 'Hari kerja'
          ? ''
          : record.status === 'Libur'
            ? 'Libur'
            : record.status,
    };

    sheet.getCell(`B${rowNum}`).value = rowData.nik;
    sheet.getCell(`C${rowNum}`).value = rowData.nama;
    sheet.getCell(`D${rowNum}`).value = rowData.tanggal;
    sheet.getCell(`E${rowNum}`).value = rowData.jamMulai;
    sheet.getCell(`F${rowNum}`).value = rowData.jamBerakhir;
    sheet.getCell(`G${rowNum}`).value = rowData.durasi;
    sheet.getCell(`G${rowNum}`).numFmt = '0.00';
    sheet.getCell(`H${rowNum}`).value = rowData.deskripsi;
    sheet.getCell(`I${rowNum}`).value = rowData.atasan;
    sheet.getCell(`J${rowNum}`).value = rowData.keterangan;

    // Apply styling and fill
    for (const col of ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']) {
      const cell = sheet.getCell(`${col}${rowNum}`);
      cell.border = {
        left: THIN_BORDER,
        right: THIN_BORDER,
        top: THIN_BORDER,
        bottom: THIN_BORDER,
      };
      cell.alignment = { vertical: 'middle', wrapText: true };

      if (isLeave) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: YELLOW_FILL },
        };
      }
    }
  }

  // ============================================================
  // SUMMARY SECTION
  // ============================================================
  const summaryStartRow = dataEndRow + 2;

  const totalHariKerja = records.length - records.filter((r) => r.status === 'Libur').length;
  const totalKehadiranHariLibur = records.filter(
    (r) => r.status === 'Libur' && r.jamMulai && r.jamBerakhir
  ).length;
  const totalSakitIzinCuti = records.filter(
    (r) => r.status === 'Sakit' || r.status === 'Izin' || r.status === 'Cuti'
  ).length;
  const kehadiran = totalHariKerja + totalKehadiranHariLibur - totalSakitIzinCuti;

  const totalHariKerjaFormula = `COUNTA(D${DATA_START_ROW}:D${dataEndRow})-COUNTIF(J${DATA_START_ROW}:J${dataEndRow},"Libur")`;

  // Total hari kerja
  sheet.getCell(`B${summaryStartRow}`).value = 'Total hari kerja';
  sheet.getCell(`D${summaryStartRow}`).value = {
    formula: totalHariKerjaFormula,
    result: totalHariKerja,
  };

  // Total kehadiran hari libur
  sheet.getCell(`B${summaryStartRow + 1}`).value = 'Total kehadiran hari libur';
  sheet.getCell(`D${summaryStartRow + 1}`).value = totalKehadiranHariLibur;

  // Sakit/Izin/Cuti
  sheet.getCell(`B${summaryStartRow + 2}`).value = 'Sakit/Izin/Cuti';
  sheet.getCell(`D${summaryStartRow + 2}`).value = totalSakitIzinCuti;

  // Kehadiran
  const kehadiranFormula = `D${summaryStartRow}+D${summaryStartRow + 1}-D${summaryStartRow + 2}`;
  sheet.getCell(`B${summaryStartRow + 3}`).value = 'Kehadiran';
  sheet.getCell(`D${summaryStartRow + 3}`).value = {
    formula: kehadiranFormula,
    result: kehadiran,
  };

  // ============================================================
  // SIGNATURE SECTION
  // ============================================================
  const signatureStartRow = summaryStartRow + 6;

  sheet.getCell(`C${signatureStartRow}`).value = 'Dibuat oleh';
  sheet.getCell(`C${signatureStartRow}`).alignment = { vertical: 'middle' };
  sheet.getCell(`F${signatureStartRow}`).value = 'Diketahui oleh';
  sheet.getCell(`F${signatureStartRow}`).alignment = { vertical: 'middle' };
  sheet.getCell(`I${signatureStartRow}`).value = 'Disetujui oleh';
  sheet.getCell(`I${signatureStartRow}`).alignment = { vertical: 'middle' };

  // Signature image for "Dibuat oleh" if available
  if (signatureData?.imageData) {
    const imageId = workbook.addImage({
      base64: signatureData.imageData,
      extension: 'png',
    });

    for (let r = signatureStartRow + 1; r <= signatureStartRow + 4; r++) {
      sheet.getRow(r).height = 18;
    }
    sheet.addImage(imageId, {
      tl: { col: 2, row: signatureStartRow + 1 },
      ext: { width: 120, height: 65 },
    });
  }

  // Names under signatures
  const nameRow = signatureStartRow + 5;
  sheet.getCell(`C${nameRow}`).value = employeeInfo.nama;
  sheet.getCell(`C${nameRow}`).alignment = { vertical: 'middle' };
  sheet.getCell(`F${nameRow}`).value = employeeInfo.diketahuiOleh;
  sheet.getCell(`F${nameRow}`).alignment = { vertical: 'middle' };
  sheet.getCell(`I${nameRow}`).value = employeeInfo.disetujuiOleh;
  sheet.getCell(`I${nameRow}`).alignment = { vertical: 'middle' };

  // ============================================================
  // HOLIDAY SHEET
  // ============================================================
  const holidaySheet = workbook.addWorksheet('Holiday');
  holidaySheet.getColumn('A').width = 20;
  holidaySheet.getColumn('B').width = 25;
  holidaySheet.getCell('A1').value = 'Date';
  holidaySheet.getCell('B1').value = 'Holiday/Working Day';
  holidaySheet.getRow(1).font = { bold: true };

  const holidays = records
    .filter((r) => r.isHoliday)
    .map((r) => ({
      date: format(r.date, 'yyyy-MM-dd'),
      name: r.holidayName || 'Holiday',
    }));

  holidays.forEach((h, idx) => {
    holidaySheet.getCell(`A${idx + 2}`).value = h.date;
    holidaySheet.getCell(`B${idx + 2}`).value = h.name;
  });

  // ============================================================
  // PAGE SETUP
  // ============================================================
  const printEndRow = nameRow + 1;
  sheet.pageSetup = {
    orientation: 'landscape',
    paperSize: 9, // A4
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.3,
      right: 0.3,
      top: 0.4,
      bottom: 0.4,
      header: 0.2,
      footer: 0.2,
    },
    printArea: `B1:J${printEndRow}`,
    horizontalCentered: false,
    verticalCentered: false,
  };

  // ============================================================
  // SAVE
  // ============================================================
  const actualStart = records.length > 0 ? records[0].date : parseISO(startDateStr ?? '');
  const actualEnd = records.length > 0 ? records[records.length - 1].date : parseISO(endDateStr ?? '');
  const startFormatted = format(actualStart, 'dd-MMM-yyyy', { locale: id });
  const endFormatted = format(actualEnd, 'dd-MMM-yyyy', { locale: id });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([new Uint8Array(buffer)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `Timesheet_${startFormatted}_to_${endFormatted}.xlsx`);
}
