import {
  AlignmentType,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import { TimesheetEntry } from '../../../../types';
import {
  allBorders,
  headerShading,
  leaveRowShading,
  TableCellStyle,
  TableHeaderStyle,
} from '../../shared/styles';
import { tasksToParagraphs } from '../../shared/utils';

// ============================================================
// Column definitions
// ============================================================

const colWidths = {
  date: 900,
  task: 4200,
  startTime: 900,
  endTime: 900,
  remarks: 1124,
};

const COLUMNS = [
  { width: colWidths.date, label: 'Date' },
  { width: colWidths.task, label: 'Task / Activity / Project Name / Ticket No.' },
  { width: colWidths.startTime, label: 'Start Time' },
  { width: colWidths.endTime, label: 'End Time' },
  { width: colWidths.remarks, label: 'Remarks' },
];

// ============================================================
// Header row
// ============================================================

function buildHeaderRow(): TableRow {
  return new TableRow({
    children: COLUMNS.map(
      (col) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: col.label, ...TableHeaderStyle })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
            }),
          ],
          width: { size: col.width, type: WidthType.DXA },
          borders: allBorders,
          shading: headerShading,
          verticalAlign: VerticalAlign.CENTER,
        })
    ),
  });
}

// ============================================================
// Data row
// ============================================================

function buildDataRow(entry: TimesheetEntry): TableRow {
  const isLeave = entry.type !== 'WORKDAY';
  const shading = isLeave ? leaveRowShading : undefined;

  const taskParagraphs: Paragraph[] =
    entry.tasks.length > 0
      ? tasksToParagraphs(entry.tasks)
      : [new Paragraph({ children: [new TextRun({ text: '', ...TableCellStyle })] })];

  const dateText = entry.date;
  const startText = entry.startTime ?? '';
  const endText = entry.endTime ?? '';
  const remarksText = entry.remarks ?? '';

  return new TableRow({
    children: [
      // Date
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: dateText, ...TableCellStyle })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 0 },
          }),
        ],
        width: { size: colWidths.date, type: WidthType.DXA },
        borders: allBorders,
        shading,
        verticalAlign: VerticalAlign.CENTER,
      }),
      // Task / Activity
      new TableCell({
        children: taskParagraphs,
        width: { size: colWidths.task, type: WidthType.DXA },
        borders: allBorders,
        shading,
        verticalAlign: VerticalAlign.TOP,
      }),
      // Start Time
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: startText, ...TableCellStyle })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 0 },
          }),
        ],
        width: { size: colWidths.startTime, type: WidthType.DXA },
        borders: allBorders,
        shading,
        verticalAlign: VerticalAlign.CENTER,
      }),
      // End Time
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: endText, ...TableCellStyle })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 0 },
          }),
        ],
        width: { size: colWidths.endTime, type: WidthType.DXA },
        borders: allBorders,
        shading,
        verticalAlign: VerticalAlign.CENTER,
      }),
      // Remarks
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: remarksText, ...TableCellStyle })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 0 },
          }),
        ],
        width: { size: colWidths.remarks, type: WidthType.DXA },
        borders: allBorders,
        shading,
        verticalAlign: VerticalAlign.CENTER,
      }),
    ],
  });
}

export function buildTimesheetTable(entries: TimesheetEntry[]): Table {
  const rows = [buildHeaderRow(), ...entries.map(buildDataRow)];

  return new Table({
    rows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
  });
}
