import { AlignmentType, ImageRun, Paragraph, TextRun } from 'docx';
import { TitleStyle } from '../../shared/styles';

// ============================================================
// Logo — sized by height, width auto to preserve aspect ratio
// ============================================================

const LOGO_HEIGHT = 60;
const LOGO_WIDTH = 120;

export function buildLogoParagraph(logo: Buffer | Uint8Array | string | undefined): Paragraph[] {
  if (!logo) return [];

  const image = new ImageRun({
    data: logo,
    transformation: {
      height: LOGO_HEIGHT,
      width: LOGO_WIDTH,
    },
    type: 'png',
  });

  return [
    new Paragraph({
      children: [image],
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
    }),
  ];
}

export function buildTitleParagraph(): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: 'TIMESHEET', ...TitleStyle })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  });
}
