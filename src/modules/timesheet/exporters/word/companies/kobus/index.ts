import { Document, Packer, Paragraph, Table } from 'docx';
import { saveAs } from 'file-saver';
import { ITimesheetExporter, TimesheetExport } from '../../../../types';
import { pageLayout } from '../../shared/styles';
import { emptyParagraph } from '../../shared/utils';
import { buildLogoParagraph, buildTitleParagraph } from './header';
import { buildInformationSection } from './information';
import { buildSignatureSection } from './signature';
import { buildTimesheetTable } from './table';

// ============================================================
// KOBUS Word (.docx) exporter
// ============================================================

export class KobusWordExporter implements ITimesheetExporter {
  async generate(data: TimesheetExport): Promise<void> {
    const children: (Paragraph | Table)[] = [
      ...buildLogoParagraph(data.branding.logo),
      buildTitleParagraph(),
      ...buildInformationSection({
        vendorName: data.vendorName,
        consultantName: data.consultantName,
        consultantRole: data.consultantRole,
        supervisorName: data.supervisorName,
      }),
      emptyParagraph(160),
      buildTimesheetTable(data.entries),
      emptyParagraph(300),
      buildSignatureSection({
        employeeName: data.employeeName,
        reviewerName: data.reviewerName,
        approverName: data.approverName,
        employeeSignature: data.employeeSignature,
      }),
    ];

    const doc = new Document({
      sections: [
        {
          properties: pageLayout,
          children: children as Paragraph[],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const blob = new Blob([new Uint8Array(buffer)], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const filename = `Timesheet_${data.consultantName.replace(/\s+/g, '_')}.docx`;
    saveAs(blob, filename);
  }
}
