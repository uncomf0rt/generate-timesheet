import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import { DayRecord, EmployeeInfo, KeteranganType, SignatureData } from './types';

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

    const dateStr = format(record.date, 'dd MMM yyyy', { locale: id });
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
      tanggal: dateStr,
      jamMulai: record.jamMulai || '',
      jamBerakhir: record.jamBerakhir || '',
      durasi: record.jamMulai && record.jamBerakhir ? durasiHours : '',
      deskripsi: isLeave ? '' : cellActivity || '',
      atasan: employeeInfo.diketahuiOleh,
      keterangan: record.status === 'Hari kerja' ? '' : getStatusLabel(record),
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

  // Compute summary values directly (no formulas)
  // Total hari kerja = count of normal work days
  const totalHariKerja = records.filter((r) => r.status === 'Hari kerja').length;
  // Total kehadiran hari libur = Libur rows with jamMulai/jamBerakhir filled (overtime on holiday/weekend)
  const totalKehadiranHariLibur = records.filter(
    (r) => r.status === 'Libur' && r.jamMulai && r.jamBerakhir
  ).length;
  // Sakit/Izin/Cuti = count of those leave statuses
  const totalSakitIzinCuti = records.filter(
    (r) => r.status === 'Sakit' || r.status === 'Izin' || r.status === 'Cuti'
  ).length;
  // Kehadiran = work days + overtime on holidays
  const kehadiran = totalHariKerja + totalKehadiranHariLibur;

  // Total hari kerja
  sheet.getCell(`B${summaryStartRow}`).value = 'Total hari kerja';
  sheet.getCell(`D${summaryStartRow}`).value = totalHariKerja;

  // Total kehadiran hari libur
  sheet.getCell(`B${summaryStartRow + 1}`).value = 'Total kehadiran hari libur';
  sheet.getCell(`D${summaryStartRow + 1}`).value = totalKehadiranHariLibur;

  // Sakit/Izin/Cuti
  sheet.getCell(`B${summaryStartRow + 2}`).value = 'Sakit/Izin/Cuti';
  sheet.getCell(`D${summaryStartRow + 2}`).value = totalSakitIzinCuti;

  // Kehadiran
  sheet.getCell(`B${summaryStartRow + 3}`).value = 'Kehadiran';
  sheet.getCell(`D${summaryStartRow + 3}`).value = kehadiran;

  // ============================================================
  // SIGNATURE SECTION
  // ============================================================
  const signatureStartRow = summaryStartRow + 6;

  // Headers: Dibuat oleh | Diketahui oleh | Disetujui oleh
  sheet.getCell(`C${signatureStartRow}`).value = 'Dibuat oleh';
  sheet.getCell(`C${signatureStartRow}`).alignment = { vertical: 'middle' };
  sheet.getCell(`H${signatureStartRow}`).value = 'Diketahui oleh';
  sheet.getCell(`H${signatureStartRow}`).alignment = { vertical: 'middle' };
  sheet.getCell(`J${signatureStartRow}`).value = 'Disetujui oleh';
  sheet.getCell(`J${signatureStartRow}`).alignment = { vertical: 'middle' };

  // Signature image for "Dibuat oleh" if available
  if (signatureData?.imageData) {
    const imageId = workbook.addImage({
      base64: signatureData.imageData,
      extension: 'png',
    });

    // Reserve rows between "Dibuat oleh" (header) and user name
    // nameRow = signatureStartRow + 5, so rows 1-4 available for signature
    for (let r = signatureStartRow + 1; r <= signatureStartRow + 4; r++) {
      sheet.getRow(r).height = 18; // ~72px total for 4 rows
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
  sheet.getCell(`H${nameRow}`).value = employeeInfo.diketahuiOleh;
  sheet.getCell(`H${nameRow}`).alignment = { vertical: 'middle' };
  sheet.getCell(`J${nameRow}`).value = employeeInfo.disetujuiOleh;
  sheet.getCell(`J${nameRow}`).alignment = { vertical: 'middle' };

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

export function exportToPDF(
  records: DayRecord[],
  startDateStr: string,
  endDateStr: string,
  employeeInfo: EmployeeInfo,
  signatureData?: SignatureData
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // ============================================================
  // PAGE DIMENSIONS (landscape A4)
  // ============================================================
  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 5; // ultra-reduced horizontal margin
  const headerHeight = 6;
  const summaryRowHeight = 4;
  const signatureSectionHeight = 28;
  const bottomMargin = 5;

  // Fixed content heights
  const tableTopY = margin + 2;
  const fixedVerticalSpace =
    tableTopY + headerHeight + summaryRowHeight * 4 + signatureSectionHeight + bottomMargin;

  // Calculate available height for data rows
  const availableDataHeight = pageHeight - fixedVerticalSpace;
  const dataRowHeight = Math.max(4, Math.min(6, availableDataHeight / records.length));

  // Base column widths: NIK, Nama, Tanggal, Jam Masuk, Jam Pulang, Durasi, Deskripsi, Keterangan
  const baseColWidths = [16, 30, 36, 22, 22, 20, 110, 49]; // total = 265
  const totalBaseWidth = baseColWidths.reduce((a, b) => a + b, 0);
  const usableWidth = pageWidth - margin * 2;
  const widthScale = Math.min(1, usableWidth / totalBaseWidth);
  const colWidthsMm = baseColWidths.map((w) => Math.max(w * widthScale, w * 0.7)); // allow shrink to 70%

  // Dynamic font sizes - more aggressive
  const headerFontSize = Math.max(5, Math.min(7, 7 * widthScale))
  const dataFontSize = Math.max(5, Math.min(7, 7 * widthScale));
  const summaryFontSize = Math.max(5, Math.min(7, 7 * widthScale));

  // ============================================================
  // HEADER ROW
  // ============================================================
  let xPos = margin;
  const headers = [
    'NIK',
    'Nama',
    'Tanggal',
    'Jam Masuk',
    'Jam Pulang',
    'Durasi',
    'Deskripsi',
    'Keterangan',
  ];
  for (let i = 0; i < headers.length; i++) {
    const w = colWidthsMm[i];
    doc.setFillColor(220, 220, 220);
    doc.rect(xPos, tableTopY, w, headerHeight, 'FD');
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.15);
    doc.rect(xPos, tableTopY, w, headerHeight, 'FD');
    doc.setFontSize(headerFontSize);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(headers[i], xPos + w / 2, tableTopY + headerHeight - 1, { align: 'center' });
    xPos += w;
  }

  // ============================================================
  // DATA ROWS
  // ============================================================
  const YELLOW = [255, 192, 0];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const y = tableTopY + headerHeight + i * dataRowHeight;
    const isLeave = isLeaveType(record.status);

    const dateStr = format(record.date, 'dd MMM yyyy', { locale: id });
    const jamMulaiHours = timeStringToHours(record.jamMulai || '');
    const jamBerakhirHours = timeStringToHours(record.jamBerakhir || '');
    const durasiHours =
      record.jamMulai && record.jamBerakhir ? (jamBerakhirHours - jamMulaiHours).toFixed(1) : '';

    // Build activity description from tasks and commits
    const cellActivity =
      record.editableActivity !== undefined
        ? record.editableActivity
        : [...record.tasks, ...record.commits].join('\n');

    const rowData = [
      employeeInfo.nik,
      employeeInfo.nama,
      dateStr,
      record.jamMulai || '',
      record.jamBerakhir || '',
      durasiHours,
      isLeave ? '' : cellActivity || '',
      record.status === 'Hari kerja' ? '' : getStatusLabel(record),
    ];

    xPos = margin;
    for (let j = 0; j < rowData.length; j++) {
      const w = colWidthsMm[j];
      const fillColor = isLeave ? YELLOW : [255, 255, 255];
      doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
      doc.rect(xPos, y, w, dataRowHeight, 'FD');
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.15);
      doc.rect(xPos, y, w, dataRowHeight, 'FD');
      doc.setFontSize(dataFontSize);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      if (j === 6 && rowData[j]) {
        // Deskripsi - wrap text with smaller font
        doc.setFontSize(Math.max(4, dataFontSize - 1));
        const lines = doc.splitTextToSize(rowData[j], w - 1);
        doc.text(lines.slice(0, Math.floor(dataRowHeight / (dataFontSize * 0.4))), xPos + 0.5, y + dataRowHeight - 0.5);
      } else {
        doc.text(rowData[j] || '', xPos + w / 2, y + dataRowHeight - 0.8, { align: 'center' });
      }
      xPos += w;
    }
  }

  // ============================================================
  // SUMMARY SECTION
  // ============================================================
  const summaryTopY = tableTopY + headerHeight + records.length * dataRowHeight + 5;

  const totalHariKerja = records.filter((r) => r.status === 'Hari kerja').length;
  const totalKehadiranHariLibur = records.filter(
    (r) => r.status === 'Libur' && r.jamMulai && r.jamBerakhir
  ).length;
  const totalSakitIzinCuti = records.filter(
    (r) => r.status === 'Sakit' || r.status === 'Izin' || r.status === 'Cuti'
  ).length;
  const kehadiran = totalHariKerja + totalKehadiranHariLibur;

  const summaryItems = [
    ['Total hari kerja', totalHariKerja.toString()],
    ['Total kehadiran hari libur', totalKehadiranHariLibur.toString()],
    ['Sakit/Izin/Cuti', totalSakitIzinCuti.toString()],
    ['Kehadiran', kehadiran.toString()],
  ];

  for (let i = 0; i < summaryItems.length; i++) {
    const [label, value] = summaryItems[i];
    const y = summaryTopY + i * summaryRowHeight;
    doc.setFontSize(summaryFontSize);
    doc.setFont('helvetica', 'normal');
    doc.text(label, margin + colWidthsMm[0] + 1, y);
    doc.setFont('helvetica', 'bold');
    doc.text(value, margin + colWidthsMm[0] + colWidthsMm[1] + colWidthsMm[2], y);
  }

  // ============================================================
  // SIGNATURE SECTION
  // ============================================================
  const signatureTopY = summaryTopY + summaryRowHeight * 4 + 6;

  // Column positions for signature (using column centers)
  const colNik = margin;
  const colNama = margin + colWidthsMm[0];
  const colJamMasuk = colNama + colWidthsMm[1];
  const colJamPulang = colJamMasuk + colWidthsMm[2] + colWidthsMm[3];
  const colDurasi = colJamPulang + colWidthsMm[4];
  const colDeskripsi = colDurasi + colWidthsMm[5];
  const colKeterangan = colDeskripsi + colWidthsMm[6];

  const sigCol1 = colNama + colWidthsMm[1] / 2; // under Nama
  const sigCol2 = colJamPulang + colWidthsMm[4] / 2; // under Jam Pulang
  const sigCol3 = colKeterangan + colWidthsMm[7] / 2; // under Keterangan

  doc.setFontSize(summaryFontSize);
  doc.setFont('helvetica', 'normal');
  doc.text('Dibuat oleh', sigCol1, signatureTopY, { align: 'center' });
  doc.text('Diketahui oleh', sigCol2, signatureTopY, { align: 'center' });
  doc.text('Disetujui oleh', sigCol3, signatureTopY, { align: 'center' });

  // Signature image
  if (signatureData?.imageData) {
    const imgY = signatureTopY + 1;
    const imgWidth = Math.max(12, 18 * widthScale);
    const imgHeight = Math.max(8, 10 * widthScale);
    doc.addImage(signatureData.imageData, 'PNG', sigCol1 - imgWidth / 2, imgY, imgWidth, imgHeight);
  }

  // Signature lines
  const signLineY = signatureTopY + 12;
  const signLineWidth = Math.max(18, 25 * widthScale);
  doc.setLineWidth(0.2);
  doc.line(sigCol1 - signLineWidth / 2, signLineY, sigCol1 + signLineWidth / 2, signLineY);
  doc.line(sigCol2 - signLineWidth / 2, signLineY, sigCol2 + signLineWidth / 2, signLineY);
  doc.line(sigCol3 - signLineWidth / 2, signLineY, sigCol3 + signLineWidth / 2, signLineY);

  // Names under signatures
  const nameY = signLineY + 3;
  doc.setFontSize(summaryFontSize);
  doc.setFont('helvetica', 'bold');
  doc.text(employeeInfo.nama, sigCol1, nameY, { align: 'center' });
  doc.text(employeeInfo.diketahuiOleh, sigCol2, nameY, { align: 'center' });
  doc.text(employeeInfo.disetujuiOleh, sigCol3, nameY, { align: 'center' });

  // ============================================================
  // SAVE
  // ============================================================
  const fileStartFormatted = format(parseISO(startDateStr), 'dd-MMM-yyyy', { locale: id });
  const fileEndFormatted = format(parseISO(endDateStr), 'dd-MMM-yyyy', { locale: id });
  doc.save(`Timesheet_${fileStartFormatted}_to_${fileEndFormatted}.pdf`);
}
