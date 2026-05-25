import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DayRecord, EmployeeInfo, KeteranganType, SignatureData } from './types';

const HEADER_ROW = 5;
const DATA_START_ROW = 6;
const YELLOW_FILL = 'FFFFC000';
const THIN_BORDER = { style: 'thin' as const };

function isLeaveType(status: KeteranganType): boolean {
  return status !== 'Hari kerja';
}

function getStatusLabel(record: DayRecord): string {
  if (record.status === 'Hari kerja') return 'Hari kerja';
  if (record.isHoliday && record.holidayName) return `${record.status} (${record.holidayName})`;
  return record.status;
}

export async function generateTemplateExcel(
  records: DayRecord[],
  startDateStr: string,
  endDateStr: string,
  employeeInfo: EmployeeInfo,
  signatureData?: SignatureData
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Timesheet');

  // Set column widths (mimicking template)
  sheet.getColumn('A').width = 2; // margin
  sheet.getColumn('B').width = 14; // NIK
  sheet.getColumn('C').width = 17; // Nama
  sheet.getColumn('D').width = 20; // Tanggal
  sheet.getColumn('E').width = 13; // Jam Mulai
  sheet.getColumn('F').width = 18; // Jam Berakhir
  sheet.getColumn('G').width = 16; // Durasi Kerja
  sheet.getColumn('H').width = 60; // Deskripsi Pekerjaan
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
    cell.alignment = { horizontal: 'center', vertical: 'center' };
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

    const dateStr = format(record.date, 'dd MMM yyyy', { locale: id });
    const cellActivity =
      record.editableActivity !== undefined
        ? record.editableActivity
        : [...record.tasks, ...record.commits].join('\n');

    const rowData = {
      nik: employeeInfo.nik,
      nama: employeeInfo.nama,
      tanggal: dateStr,
      jamMulai: record.jamMulai || '',
      jamBerakhir: record.jamBerakhir || '',
      durasi: record.jamMulai && record.jamBerakhir ? `=F${rowNum}-E${rowNum}` : '',
      deskripsi: isLeave ? '' : cellActivity || '',
      atasan: employeeInfo.diketahuiOleh,
      keterangan: getStatusLabel(record),
    };

    sheet.getCell(`B${rowNum}`).value = rowData.nik;
    sheet.getCell(`C${rowNum}`).value = rowData.nama;
    sheet.getCell(`D${rowNum}`).value = rowData.tanggal;
    sheet.getCell(`E${rowNum}`).value = rowData.jamMulai;
    sheet.getCell(`F${rowNum}`).value = rowData.jamBerakhir;
    sheet.getCell(`G${rowNum}`).value = rowData.durasi;
    sheet.getCell(`H${rowNum}`).value = rowData.deskripsi;
    sheet.getCell(`H${rowNum}`).alignment = { wrapText: true, vertical: 'top' };
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

      if (isLeave) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: YELLOW_FILL },
        };
      }
    }
  }

  // Set row height for data rows
  for (let r = DATA_START_ROW; r <= dataEndRow; r++) {
    sheet.getRow(r).height = 15;
  }

  // ============================================================
  // SUMMARY SECTION
  // ============================================================
  const summaryStartRow = dataEndRow + 2;

  // Total hari kerja
  sheet.getCell(`B${summaryStartRow}`).value = 'Total hari kerja';
  sheet.getCell(`D${summaryStartRow}`).value =
    `=COUNTIF(J${DATA_START_ROW}:J${dataEndRow},"Hari kerja")`;

  // Total kehadiran hari libur
  sheet.getCell(`B${summaryStartRow + 1}`).value = 'Total kehadiran hari libur';
  sheet.getCell(`D${summaryStartRow + 1}`).value =
    `=COUNTIF(J${DATA_START_ROW}:J${dataEndRow},"Libur")`;

  // Sakit/Izin/Cuti
  sheet.getCell(`B${summaryStartRow + 2}`).value = 'Sakit/Izin/Cuti';
  sheet.getCell(`D${summaryStartRow + 2}`).value =
    `=COUNTIF(J${DATA_START_ROW}:J${dataEndRow},"Sakit")+COUNTIF(J${DATA_START_ROW}:J${dataEndRow},"Izin")+COUNTIF(J${DATA_START_ROW}:J${dataEndRow},"Cuti")`;

  // Kehadiran
  sheet.getCell(`B${summaryStartRow + 3}`).value = 'Kehadiran';
  sheet.getCell(`D${summaryStartRow + 3}`).value =
    `=D${summaryStartRow}+D${summaryStartRow + 1}-D${summaryStartRow + 2}`;

  // ============================================================
  // SIGNATURE SECTION
  // ============================================================
  const signatureStartRow = summaryStartRow + 6;

  // Headers: Dibuat oleh | Diketahui oleh | Disetujui oleh
  sheet.getCell(`C${signatureStartRow}`).value = 'Dibuat oleh';
  sheet.getCell(`H${signatureStartRow}`).value = 'Diketahui oleh';
  sheet.getCell(`J${signatureStartRow}`).value = 'Disetujui oleh';

  // Signature image for "Dibuat oleh" if available
  if (signatureData?.imageData) {
    const imageId = workbook.addImage({
      base64: signatureData.imageData,
      extension: 'png',
    });

    // Place image in the signature area (column C = col 2, row = signatureStartRow - 1 for 0-indexed)
    sheet.addImage(imageId, {
      tl: { col: 2, row: signatureStartRow - 1 },
      ext: { width: 120, height: 50 },
    });
  }

  // Names under signatures
  const nameRow = signatureStartRow + 5;
  sheet.getCell(`C${nameRow}`).value = employeeInfo.nama;
  sheet.getCell(`H${nameRow}`).value = employeeInfo.diketahuiOleh;
  sheet.getCell(`J${nameRow}`).value = employeeInfo.disetujuiOleh;

  // ============================================================
  // HOLIDAY SHEET
  // ============================================================
  const holidaySheet = workbook.addWorksheet('Holiday');
  holidaySheet.getColumn('A').width = 20;
  holidaySheet.getColumn('B').width = 25;
  holidaySheet.getCell('A1').value = 'Date';
  holidaySheet.getCell('B1').value = 'Holiday/Working Day';
  holidaySheet.getRow(1).font = { bold: true };

  // Add holidays from records
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
  // SAVE
  // ============================================================
  const startFormatted = format(parseISO(startDateStr), 'dd-MMM-yyyy', { locale: id });
  const endFormatted = format(parseISO(endDateStr), 'dd-MMM-yyyy', { locale: id });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `Timesheet_${startFormatted}_to_${endFormatted}.xlsx`);
}

// Legacy export function (kept for backward compatibility)
export async function exportToExcel(
  records: DayRecord[],
  startDateStr: string,
  endDateStr: string
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Timesheet');

  // Define Columns
  sheet.columns = [
    { header: 'Tanggal', key: 'date', width: 20 },
    { header: 'Hari', key: 'dayName', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Aktivitas (Commits & Tasks)', key: 'activity', width: 60 },
  ];

  // Add Rows & Styling
  for (const record of records) {
    const isDayOff = record.status === 'Libur';
    const cellActivity =
      record.editableActivity !== undefined
        ? record.editableActivity
        : [...record.tasks, ...record.commits].join('\n');
    const dayName = format(record.date, 'EEEE', { locale: id });
    const dateStr = format(record.date, 'dd MMM yyyy', { locale: id });

    const row = sheet.addRow({
      date: dateStr,
      dayName: dayName,
      status: record.isHoliday
        ? `Libur (${record.holidayName})`
        : isDayOff && !record.isWeekend && !record.isHoliday
          ? 'Libur'
          : isDayOff
            ? 'Libur (Akhir Pekan)'
            : 'Hari kerja',
      activity: isDayOff && !cellActivity.trim() ? '' : cellActivity || 'Tidak ada data tercatat',
    });

    if (isDayOff) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFDDDDDD' }, // Gray color
        };
        cell.font = {
          color: { argb: 'FFFF0000' }, // Red text
        };
      });
    }

    row.getCell('activity').alignment = { wrapText: true, vertical: 'top' };
  }

  // Header styling
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { horizontal: 'center' };

  const startFormatted = format(parseISO(startDateStr), 'dd-MMM-yyyy', { locale: id });
  const endFormatted = format(parseISO(endDateStr), 'dd-MMM-yyyy', { locale: id });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `Timesheet_${startFormatted}_to_${endFormatted}.xlsx`);
}

export function exportToPDF(records: DayRecord[], startDateStr: string, endDateStr: string) {
  const doc = new jsPDF();

  const startFormatted = format(parseISO(startDateStr), 'dd MMM yyyy', { locale: id });
  const endFormatted = format(parseISO(endDateStr), 'dd MMM yyyy', { locale: id });

  doc.setFontSize(16);
  doc.text(`Timesheet: ${startFormatted} - ${endFormatted}`, 14, 20);

  const tableData = records.map((record) => {
    const isDayOff = record.status === 'Libur';
    const cellActivity =
      record.editableActivity !== undefined
        ? record.editableActivity
        : [...record.tasks, ...record.commits].join('\n');
    const dayName = format(record.date, 'EEEE', { locale: id });
    const dateStr = format(record.date, 'dd MMM yyyy', { locale: id });
    const activity =
      isDayOff && !cellActivity.trim() ? '' : cellActivity || 'Tidak ada data tercatat';
    const statusText = record.isHoliday
      ? `Libur (${record.holidayName})`
      : isDayOff && !record.isWeekend && !record.isHoliday
        ? 'Libur'
        : isDayOff
          ? 'Libur (Akhir Pekan)'
          : 'Hari kerja';

    return [dateStr, dayName, statusText, activity];
  });

  autoTable(doc, {
    startY: 30,
    head: [['Tanggal', 'Hari', 'Status', 'Aktivitas']],
    body: tableData,
    didParseCell: (data) => {
      if (data.section === 'body') {
        const record = records[data.row.index];
        if (record.status === 'Libur') {
          data.cell.styles.fillColor = [220, 220, 220]; // Light gray
          data.cell.styles.textColor = [200, 0, 0]; // Red
        }
      }
    },
    styles: { overflow: 'linebreak', cellWidth: 'wrap' },
    columnStyles: {
      3: { cellWidth: 80 },
    },
  });

  const fileStartFormatted = format(parseISO(startDateStr), 'dd-MMM-yyyy', { locale: id });
  const fileEndFormatted = format(parseISO(endDateStr), 'dd-MMM-yyyy', { locale: id });
  doc.save(`Timesheet_${fileStartFormatted}_to_${fileEndFormatted}.pdf`);
}
