import { BorderStyle, convertInchesToTwip, IRunOptions, PageOrientation, ShadingType } from 'docx';

// ============================================================
// Typography
// ============================================================

export const TitleStyle: IRunOptions = {
  bold: true,
  size: 36,
  font: 'Calibri',
};

export const LabelStyle: IRunOptions = {
  bold: true,
  size: 20,
  font: 'Calibri',
};

export const ValueStyle: IRunOptions = {
  bold: false,
  size: 20,
  font: 'Calibri',
};

export const TableHeaderStyle: IRunOptions = {
  bold: true,
  size: 18,
  font: 'Calibri',
};

export const TableCellStyle: IRunOptions = {
  bold: false,
  size: 18,
  font: 'Calibri',
};

export const SignatureTitleStyle: IRunOptions = {
  bold: true,
  size: 20,
  font: 'Calibri',
};

export const SignatureNameStyle: IRunOptions = {
  bold: false,
  size: 18,
  font: 'Calibri',
};

// ============================================================
// Table cell borders
// ============================================================

const thinBorder = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: '000000',
};

export const allBorders = {
  top: thinBorder,
  bottom: thinBorder,
  left: thinBorder,
  right: thinBorder,
};

// ============================================================
// Cell shading
// ============================================================

export const headerShading = {
  type: ShadingType.CLEAR,
  fill: 'DDDDDD',
  color: 'auto',
};

export const leaveRowShading = {
  type: ShadingType.CLEAR,
  fill: 'FFC000',
  color: 'auto',
};

// ============================================================
// Page layout
// ============================================================

export const pageLayout = {
  page: {
    size: {
      orientation: PageOrientation.PORTRAIT,
      width: convertInchesToTwip(8.27),
      height: convertInchesToTwip(11.69),
    },
    margins: {
      top: convertInchesToTwip(1),
      right: convertInchesToTwip(1),
      bottom: convertInchesToTwip(1),
      left: convertInchesToTwip(1),
    },
  },
};
