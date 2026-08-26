import { IRunOptions, Paragraph, TextRun } from 'docx';
import { TableCellStyle } from './styles';

// ============================================================
// Paragraph helpers
// ============================================================

export function makeTextRun(text: string, options?: Partial<IRunOptions>): TextRun {
  return new TextRun({ text, ...TableCellStyle, ...options });
}

// ============================================================
// Task list to Paragraph array
// Each task item becomes a bullet line
// ============================================================

export function tasksToParagraphs(tasks: string[]): Paragraph[] {
  if (tasks.length === 0) return [];
  return tasks.map(
    (task) =>
      new Paragraph({
        children: [new TextRun({ text: task, ...TableCellStyle })],
        bullet: { level: 0 },
        spacing: { after: 0, before: 0 },
      })
  );
}

// ============================================================
// Empty paragraph spacer
// ============================================================

export function emptyParagraph(after = 80): Paragraph {
  return new Paragraph({
    children: [new TextRun('')],
    spacing: { after },
  });
}
