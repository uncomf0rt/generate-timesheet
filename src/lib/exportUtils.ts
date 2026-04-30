import { DayRecord } from './types';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

export async function exportToExcel(records: DayRecord[], startDateStr: string, endDateStr: string) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Timesheet');

  // Define Columns
  sheet.columns = [
    { header: 'Tanggal', key: 'date', width: 20 },
    { header: 'Hari', key: 'dayName', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Aktivitas (Commits & Tasks)', key: 'activity', width: 60 }
  ];

  // Add Rows & Styling
  records.forEach(record => {
    const isDayOff = record.status === 'Libur';
    const cellActivity = record.editableActivity !== undefined ? record.editableActivity : [...record.tasks, ...record.commits].join('\n');
    const dayName = format(record.date, 'EEEE', { locale: id });
    const dateStr = format(record.date, 'dd MMM yyyy', { locale: id });

    const row = sheet.addRow({
      date: dateStr,
      dayName: dayName,
      status: record.isHoliday ? `Libur (${record.holidayName})` : (isDayOff && !record.isWeekend && !record.isHoliday) ? 'Libur' : isDayOff ? 'Libur (Akhir Pekan)' : 'Hari kerja',
      activity: (isDayOff && !cellActivity.trim()) ? '' : cellActivity || 'Tidak ada data tercatat'
    });

    if (isDayOff) {
      row.eachCell(cell => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFDDDDDD' } // Gray color
        };
        cell.font = {
          color: { argb: 'FFFF0000' } // Red text
        }
      });
    }

    row.getCell('activity').alignment = { wrapText: true, vertical: 'top' };
  });

  // Header styling
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { horizontal: 'center' };

  const startFormatted = format(parseISO(startDateStr), 'dd-MMM-yyyy', { locale: id });
  const endFormatted = format(parseISO(endDateStr), 'dd-MMM-yyyy', { locale: id });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Timesheet_${startFormatted}_to_${endFormatted}.xlsx`);
}

export function exportToPDF(records: DayRecord[], startDateStr: string, endDateStr: string) {
  const doc = new jsPDF();
  
  const startFormatted = format(parseISO(startDateStr), 'dd MMM yyyy', { locale: id });
  const endFormatted = format(parseISO(endDateStr), 'dd MMM yyyy', { locale: id });
  
  doc.setFontSize(16);
  doc.text(`Timesheet: ${startFormatted} - ${endFormatted}`, 14, 20);

  const tableData = records.map(record => {
    const isDayOff = record.status === 'Libur';
    const cellActivity = record.editableActivity !== undefined ? record.editableActivity : [...record.tasks, ...record.commits].join('\n');
    const dayName = format(record.date, 'EEEE', { locale: id });
    const dateStr = format(record.date, 'dd MMM yyyy', { locale: id });
    const activity = (isDayOff && !cellActivity.trim()) ? '' : cellActivity || 'Tidak ada data tercatat';
    const statusText = record.isHoliday ? `Libur (${record.holidayName})` : (isDayOff && !record.isWeekend && !record.isHoliday) ? 'Libur' : isDayOff ? 'Libur (Akhir Pekan)' : 'Hari kerja';

    return [dateStr, dayName, statusText, activity];
  });

  autoTable(doc, {
    startY: 30,
    head: [['Tanggal', 'Hari', 'Status', 'Aktivitas']],
    body: tableData,
    didParseCell: function (data) {
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
      3: { cellWidth: 80 }
    }
  });

  const fileStartFormatted = format(parseISO(startDateStr), 'dd-MMM-yyyy', { locale: id });
  const fileEndFormatted = format(parseISO(endDateStr), 'dd-MMM-yyyy', { locale: id });
  doc.save(`Timesheet_${fileStartFormatted}_to_${fileEndFormatted}.pdf`);
}
