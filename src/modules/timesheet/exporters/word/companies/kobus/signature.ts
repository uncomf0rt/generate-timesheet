import {
  AlignmentType,
  BorderStyle,
  ImageRun,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { SignatureNameStyle, SignatureTitleStyle } from '../../shared/styles';

// ============================================================
// Signature section: 3 equal columns
// Prepared by (with signature image) | Known by | Acknowledge by
// ============================================================

const SIG_COL_WIDTH = 2600;

const sigBorder = {
  top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
};

function buildSignatureColumn(title: string, name: string, signatureImage?: string): TableCell {
  const children: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: title, ...SignatureTitleStyle })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
    }),
  ];

  if (signatureImage) {
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: signatureImage,
            transformation: { width: 80, height: 40 },
            type: 'png',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 0 },
      })
    );
  } else {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: '', ...SignatureNameStyle })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 600, after: 0 },
      })
    );
    children.push(
      new Paragraph({
        children: [new TextRun({ text: '', ...SignatureNameStyle })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 300, after: 0 },
      })
    );
    children.push(
      new Paragraph({
        children: [new TextRun({ text: '', ...SignatureNameStyle })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 300, after: 0 },
      })
    );
  }

  children.push(
    new Paragraph({
      children: [new TextRun({ text: name, ...SignatureNameStyle })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 300, after: 0 },
    })
  );

  return new TableCell({
    children,
    width: { size: SIG_COL_WIDTH, type: WidthType.DXA },
    borders: sigBorder,
  });
}

export function buildSignatureSection(params: {
  employeeName: string;
  reviewerName: string;
  approverName: string;
  employeeSignature?: string;
}): Table {
  const table = new Table({
    rows: [
      new TableRow({
        children: [
          buildSignatureColumn('Prepared by', params.employeeName, params.employeeSignature),
          buildSignatureColumn('Known by', params.reviewerName),
          buildSignatureColumn('Acknowledge by', params.approverName),
        ],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  return table;
}
