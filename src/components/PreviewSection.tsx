'use client';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { generatePDFBlob } from '@/lib/exportUtils';
import { DayRecord, EmployeeInfo, SignatureData } from '@/lib/types';
import { CalendarGrid } from './CalendarGrid';
import { DayDetailPanel } from './DayDetailPanel';
import { ResultTable } from './ResultTable';
import { WorkItem, WorkSelectorPanel } from './WorkSelectorPanel';

interface Props {
  records: DayRecord[];
  onUpdateRecord: (index: number, field: keyof DayRecord, value: any) => void;
  configStartDate: string;
  configEndDate: string;
  jiraTokenExpired: boolean;
  employeeInfo: EmployeeInfo;
  signatureData?: SignatureData;
  onExportExcel: () => void;
  onExportPDF: () => void;
  allCommits: WorkItem[];
  allTasks: WorkItem[];
  onAddWork: (text: string, recordIndex: number) => void;
}

export const PreviewSection: React.FC<Props> = ({
  records,
  onUpdateRecord,
  configStartDate,
  configEndDate,
  jiraTokenExpired,
  employeeInfo,
  signatureData,
  onExportExcel,
  onExportPDF,
  allCommits,
  allTasks,
  onAddWork,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('list');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(() => {
    const today = new Date();
    if (configStartDate) {
      const start = parseISO(configStartDate);
      if (today >= start && today <= parseISO(configEndDate)) {
        return today;
      }
      return start;
    }
    return today;
  });
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  const refreshPDFPreview = async () => {
    setIsGeneratingPreview(true);
    try {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
      const url = await generatePDFBlob(
        records,
        configStartDate,
        configEndDate,
        employeeInfo,
        signatureData
      );
      setPdfPreviewUrl(url);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      refreshPDFPreview();
    }, 2000); // 2 second debounce

    return () => clearTimeout(timeoutId);
  }, [refreshPDFPreview]);

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  return (
    <div className="bg-white rounded-[40px] border border-[#E5E2D9] shadow-sm p-8 md:p-10 space-y-8">
      {/* Header with Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-center border-b border-[#E5E2D9] pb-6 gap-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full">
          <div>
            <h2 className="text-2xl font-serif italic text-[#3E3D39]">Preview Timesheet</h2>
            <p className="text-xs uppercase tracking-widest text-[#9A958A] mt-2 font-semibold">
              {format(parseISO(configStartDate), 'dd MMM yyyy', {
                locale: id,
              })}{' '}
              -{' '}
              {format(parseISO(configEndDate), 'dd MMM yyyy', {
                locale: id,
              })}
            </p>
          </div>
          {jiraTokenExpired && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2 text-xs text-amber-700">
              Jira token expired. Please reconnect to include tasks.
            </div>
          )}
        </div>

        <div className="h-10 flex flex-wrap items-center gap-4 shrink-0">
          <button
            onClick={refreshPDFPreview}
            disabled={isGeneratingPreview}
            className="h-full px-4 bg-white rounded-full border border-[#E5E2D9] text-xs font-bold uppercase tracking-wider text-[#5A6355] shadow-sm flex items-center gap-2 hover:bg-[#F8F7F3] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isGeneratingPreview ? 'animate-spin' : ''}`} />
            Refresh Preview
          </button>
          <button
            onClick={onExportExcel}
            className="h-full px-6 bg-white rounded-full border border-[#E5E2D9] text-xs font-bold uppercase tracking-wider text-[#5A6355] shadow-sm flex items-center gap-2 hover:bg-[#F8F7F3] transition-colors"
          >
            Export Excel (.xlsx)
          </button>
          <button
            onClick={onExportPDF}
            className="h-full px-6 bg-[#5A6355] text-[#F8F7F3] rounded-full text-xs font-bold uppercase tracking-wider shadow-md flex items-center gap-2 hover:bg-[#4A5246] transition-colors"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* PDF Preview */}
      <div className="bg-[#FAFAF8] rounded-2xl border border-[#E5E2D9] overflow-hidden">
        {isGeneratingPreview ? (
          <div className="h-[500px] flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-[#9A958A]" />
            <p className="text-sm text-[#9A958A]">Generating preview...</p>
          </div>
        ) : pdfPreviewUrl ? (
          <iframe
            src={pdfPreviewUrl}
            className="w-full h-[500px] border-0"
            title="Timesheet PDF Preview"
          />
        ) : (
          <div className="h-[500px] flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-[#9A958A]" />
            <p className="text-sm text-[#9A958A]">Generating preview...</p>
          </div>
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-2 p-1.5 bg-[#F8F7F3] rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === 'list'
              ? 'bg-white text-[#5A6355] shadow-sm'
              : 'text-[#9A958A] hover:text-[#5A6355]'
          }`}
        >
          List
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === 'calendar'
              ? 'bg-white text-[#5A6355] shadow-sm'
              : 'text-[#9A958A] hover:text-[#5A6355]'
          }`}
        >
          Calendar
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'list' ? (
        <ResultTable
          records={records}
          onUpdateRecord={onUpdateRecord}
          allCommits={allCommits}
          allTasks={allTasks}
        />
      ) : (
        <div className="flex flex-col lg:flex-row gap-8 min-h-[500px]">
          {/* Left: Calendar */}
          <div className="w-full lg:w-[38%] bg-[#FAFAF8] rounded-3xl border border-[#E5E2D9] p-6">
            <CalendarGrid
              selectedDate={selectedCalendarDate}
              records={records}
              onSelectDate={setSelectedCalendarDate}
            />
          </div>

          {/* Center: Day Detail */}
          <div className="w-full lg:w-[38%] bg-[#FAFAF8] rounded-3xl border border-[#E5E2D9] p-6">
            <DayDetailPanel
              selectedDate={selectedCalendarDate}
              records={records}
              onUpdateRecord={onUpdateRecord}
              allCommits={allCommits}
              allTasks={allTasks}
              onAddWork={onAddWork}
              configStartDate={configStartDate}
              configEndDate={configEndDate}
            />
          </div>

          {/* Right: Sticky Work Selector — hidden on small screens, handled by WorkSelectorPanel */}
          <WorkSelectorPanel
            allCommits={allCommits}
            allTasks={allTasks}
            recordIndex={records.findIndex((r) =>
              selectedCalendarDate
                ? r.date.toDateString() === selectedCalendarDate.toDateString()
                : false
            )}
            records={records}
            onAddWork={onAddWork}
            configStartDate={configStartDate}
            configEndDate={configEndDate}
          />
        </div>
      )}
    </div>
  );
};
