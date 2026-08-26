import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import jsPDF from 'jspdf';
import { DayRecord, EmployeeInfo, KeteranganType, SignatureData } from './types';

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
  const margin = 5;
  const headerHeight = 6;
  const summaryRowHeight = 4;
  const signatureSectionHeight = 28;
  const bottomMargin = 5;

  const tableTopY = margin + 2;
  const fixedVerticalSpace =
    tableTopY + headerHeight + summaryRowHeight * 4 + signatureSectionHeight + bottomMargin;

  const availableDataHeight = pageHeight - fixedVerticalSpace;
  const dataRowHeight = Math.max(4, Math.min(6, availableDataHeight / records.length));

  const baseColWidths = [16, 30, 36, 22, 22, 20, 110, 49];
  const totalBaseWidth = baseColWidths.reduce((a, b) => a + b, 0);
  const usableWidth = pageWidth - margin * 2;
  const widthScale = Math.min(1, usableWidth / totalBaseWidth);
  const colWidthsMm = baseColWidths.map((w) => Math.max(w * widthScale, w * 0.7));

  const headerFontSize = Math.max(5, Math.min(7, 7 * widthScale));
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
        doc.setFontSize(Math.max(4, dataFontSize - 1));
        const lines = doc.splitTextToSize(rowData[j], w - 1);
        doc.text(
          lines.slice(0, Math.floor(dataRowHeight / (dataFontSize * 0.4))),
          xPos + 0.5,
          y + dataRowHeight - 0.5
        );
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

  const colNama = margin + colWidthsMm[0];
  const colJamPulang = colNama + colWidthsMm[1] + colWidthsMm[2] + colWidthsMm[3];
  const colKeterangan =
    colNama +
    colWidthsMm[1] +
    colWidthsMm[2] +
    colWidthsMm[3] +
    colWidthsMm[4] +
    colWidthsMm[5] +
    colWidthsMm[6];

  const sigCol1 = colNama + colWidthsMm[1] / 2;
  const sigCol2 = colJamPulang + colWidthsMm[4] / 2;
  const sigCol3 = colKeterangan + colWidthsMm[7] / 2;

  doc.setFontSize(summaryFontSize);
  doc.setFont('helvetica', 'normal');
  doc.text('Dibuat oleh', sigCol1, signatureTopY, { align: 'center' });
  doc.text('Diketahui oleh', sigCol2, signatureTopY, { align: 'center' });
  doc.text('Disetujui oleh', sigCol3, signatureTopY, { align: 'center' });

  if (signatureData?.imageData) {
    const imgY = signatureTopY + 1;
    const imgWidth = Math.max(12, 18 * widthScale);
    const imgHeight = Math.max(8, 10 * widthScale);
    doc.addImage(signatureData.imageData, 'PNG', sigCol1 - imgWidth / 2, imgY, imgWidth, imgHeight);
  }

  const signLineY = signatureTopY + 12;
  const signLineWidth = Math.max(18, 25 * widthScale);
  doc.setLineWidth(0.2);
  doc.line(sigCol1 - signLineWidth / 2, signLineY, sigCol1 + signLineWidth / 2, signLineY);
  doc.line(sigCol2 - signLineWidth / 2, signLineY, sigCol2 + signLineWidth / 2, signLineY);
  doc.line(sigCol3 - signLineWidth / 2, signLineY, sigCol3 + signLineWidth / 2, signLineY);

  const nameY = signLineY + 3;
  doc.setFontSize(summaryFontSize);
  doc.setFont('helvetica', 'bold');
  doc.text(employeeInfo.nama, sigCol1, nameY, { align: 'center' });
  doc.text(employeeInfo.diketahuiOleh, sigCol2, nameY, { align: 'center' });
  doc.text(employeeInfo.disetujuiOleh, sigCol3, nameY, { align: 'center' });

  // ============================================================
  // SAVE
  // ============================================================
  const actualStart = records.length > 0 ? records[0].date : parseISO(startDateStr);
  const actualEnd = records.length > 0 ? records[records.length - 1].date : parseISO(endDateStr);
  const fileStartFormatted = format(actualStart, 'dd-MMM-yyyy', { locale: id });
  const fileEndFormatted = format(actualEnd, 'dd-MMM-yyyy', { locale: id });
  doc.save(`Timesheet_${fileStartFormatted}_to_${fileEndFormatted}.pdf`);
}

export async function generatePDFBlob(
  records: DayRecord[],
  _startDateStr: string,
  _endDateStr: string,
  employeeInfo: EmployeeInfo,
  signatureData?: SignatureData
): Promise<string> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 5;
  const headerHeight = 6;
  const summaryRowHeight = 4;
  const signatureSectionHeight = 28;
  const bottomMargin = 5;

  const tableTopY = margin + 2;
  const fixedVerticalSpace =
    tableTopY + headerHeight + summaryRowHeight * 4 + signatureSectionHeight + bottomMargin;
  const availableDataHeight = pageHeight - fixedVerticalSpace;
  const dataRowHeight = Math.max(4, Math.min(6, availableDataHeight / records.length));

  const baseColWidths = [16, 30, 36, 22, 22, 20, 110, 49];
  const totalBaseWidth = baseColWidths.reduce((a, b) => a + b, 0);
  const usableWidth = pageWidth - margin * 2;
  const widthScale = Math.min(1, usableWidth / totalBaseWidth);
  const colWidthsMm = baseColWidths.map((w) => Math.max(w * widthScale, w * 0.7));

  const headerFontSize = Math.max(5, Math.min(7, 7 * widthScale));
  const dataFontSize = Math.max(5, Math.min(7, 7 * widthScale));
  const summaryFontSize = Math.max(5, Math.min(7, 7 * widthScale));

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
        doc.setFontSize(Math.max(4, dataFontSize - 1));
        const lines = doc.splitTextToSize(rowData[j], w - 1);
        doc.text(
          lines.slice(0, Math.floor(dataRowHeight / (dataFontSize * 0.4))),
          xPos + 0.5,
          y + dataRowHeight - 0.5
        );
      } else {
        doc.text(rowData[j] || '', xPos + w / 2, y + dataRowHeight - 0.8, { align: 'center' });
      }
      xPos += w;
    }
  }

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

  const signatureTopY = summaryTopY + summaryRowHeight * 4 + 6;
  const colNama = margin + colWidthsMm[0];
  const colJamPulang = colNama + colWidthsMm[1] + colWidthsMm[2] + colWidthsMm[3];
  const colKeterangan =
    colNama +
    colWidthsMm[1] +
    colWidthsMm[2] +
    colWidthsMm[3] +
    colWidthsMm[4] +
    colWidthsMm[5] +
    colWidthsMm[6];

  const sigCol1 = colNama + colWidthsMm[1] / 2;
  const sigCol2 = colJamPulang + colWidthsMm[4] / 2;
  const sigCol3 = colKeterangan + colWidthsMm[7] / 2;

  doc.setFontSize(summaryFontSize);
  doc.setFont('helvetica', 'normal');
  doc.text('Dibuat oleh', sigCol1, signatureTopY, { align: 'center' });
  doc.text('Diketahui oleh', sigCol2, signatureTopY, { align: 'center' });
  doc.text('Disetujui oleh', sigCol3, signatureTopY, { align: 'center' });

  if (signatureData?.imageData) {
    const imgY = signatureTopY + 1;
    const imgWidth = Math.max(12, 18 * widthScale);
    const imgHeight = Math.max(8, 10 * widthScale);
    doc.addImage(signatureData.imageData, 'PNG', sigCol1 - imgWidth / 2, imgY, imgWidth, imgHeight);
  }

  const signLineY = signatureTopY + 12;
  const signLineWidth = Math.max(18, 25 * widthScale);
  doc.setLineWidth(0.2);
  doc.line(sigCol1 - signLineWidth / 2, signLineY, sigCol1 + signLineWidth / 2, signLineY);
  doc.line(sigCol2 - signLineWidth / 2, signLineY, sigCol2 + signLineWidth / 2, signLineY);
  doc.line(sigCol3 - signLineWidth / 2, signLineY, sigCol3 + signLineWidth / 2, signLineY);

  const nameY = signLineY + 3;
  doc.setFontSize(summaryFontSize);
  doc.setFont('helvetica', 'bold');
  doc.text(employeeInfo.nama, sigCol1, nameY, { align: 'center' });
  doc.text(employeeInfo.diketahuiOleh, sigCol2, nameY, { align: 'center' });
  doc.text(employeeInfo.disetujuiOleh, sigCol3, nameY, { align: 'center' });

  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}
