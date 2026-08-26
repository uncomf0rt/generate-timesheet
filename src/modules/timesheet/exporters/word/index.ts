import { ITimesheetExporter } from '../../types';
import { KobusWordExporter } from './companies/kobus';

export type { CompanyId } from './shared/adapter';
export { buildExportPayload } from './shared/adapter';

export function getWordExporter(_company: 'KOBUS'): ITimesheetExporter {
  return new KobusWordExporter();
}
