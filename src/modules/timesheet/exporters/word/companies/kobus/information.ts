import { Paragraph, TabStopType, TextRun } from 'docx';
import { LabelStyle, ValueStyle } from '../../shared/styles';

const TAB_STOPS = [
  { type: TabStopType.LEFT, position: 4500 },
  { type: TabStopType.LEFT, position: 9000 },
];

function infoRow(
  leftLabel: string,
  leftValue: string,
  rightLabel: string,
  rightValue: string
): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${leftLabel} : `, ...LabelStyle }),
      new TextRun({ text: leftValue, ...ValueStyle }),
      new TextRun({ text: '\t' }),
      new TextRun({ text: `${rightLabel} : `, ...LabelStyle }),
      new TextRun({ text: rightValue, ...ValueStyle }),
    ],
    tabStops: TAB_STOPS,
    spacing: { after: 80 },
  });
}

export function buildInformationSection(params: {
  vendorName: string;
  consultantName: string;
  consultantRole: string;
  supervisorName: string;
}): Paragraph[] {
  return [
    infoRow('Vendor Name', params.vendorName, 'Consultant Role', params.consultantRole),
    infoRow('Consultant Name', params.consultantName, 'Supervisor Name', params.supervisorName),
  ];
}
