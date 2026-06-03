'use client';
import { format, isSameDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { CalendarDays, Plus, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { DayRecord, KeteranganType } from '@/lib/types';
import { WorkItem } from './WorkSelectorPanel';

interface Props {
  selectedDate: Date;
  records: DayRecord[];
  onUpdateRecord: (index: number, field: keyof DayRecord, value: any) => void;
  allCommits: WorkItem[];
  allTasks: WorkItem[];
  onAddWork: (text: string, recordIndex: number) => void;
  configStartDate: string;
  configEndDate: string;
}

export const DayDetailPanel: React.FC<Props> = ({
  selectedDate,
  records,
  onUpdateRecord,
  allCommits,
  allTasks,
}) => {
  const recordIndex = records.findIndex((r) => isSameDay(r.date, selectedDate));
  const record = recordIndex >= 0 ? records[recordIndex] : undefined;

  const isLeave = record && record.status !== 'Hari kerja';
  const dayName = format(selectedDate, 'EEEE', { locale: id });
  const dateStr = format(selectedDate, 'dd MMMM yyyy', { locale: id });

  const activities = record ? [...record.tasks, ...record.commits] : [];

  const [isDragOver, setIsDragOver] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    if (isLeave) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (isLeave || recordIndex < 0) return;
      e.preventDefault();
      setIsDragOver(false);
      try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        const text = `${data.text}`;
        const existing = record?.editableActivity || activities.join('\n');
        const newActivity = existing ? `${existing}\n${text}` : text;
        onUpdateRecord(recordIndex, 'editableActivity', newActivity);
      } catch (_) {
        /* ignore invalid drops */
      }
    },
    [isLeave, recordIndex, record, activities, onUpdateRecord]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E5E2D9]">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-5 h-5 text-[#A4B494]" />
          <div>
            <h4 className="text-base font-bold text-[#3E3D39]">{dayName}</h4>
            <p className="text-xs text-[#9A958A]">{dateStr}</p>
          </div>
        </div>
        {!isLeave && recordIndex >= 0 && (
          <button
            onClick={() => setQuickAddOpen(!quickAddOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E7F5E4] hover:bg-[#D9EDDA] transition-colors text-xs font-bold text-[#5A6355]"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah
          </button>
        )}
      </div>

      {/* Quick Add Popover */}
      {(quickAddOpen || isDragOver) && (
        <div className="mb-4 p-4 bg-[#F8F7F3] rounded-2xl border border-[#A4B494]/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6355]">
              Drop atau klik untuk menambah
            </span>
            <button
              onClick={() => setQuickAddOpen(false)}
              className="p-1 hover:bg-[#EAE7DF] rounded-lg"
            >
              <X className="w-3 h-3 text-[#9A958A]" />
            </button>
          </div>
          {[...allCommits, ...allTasks]
            .filter((item) => isSameDay(item.date, selectedDate))
            .slice(0, 5)
            .map((item) => (
              <button
                key={item.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/json', JSON.stringify(item));
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => {
                  const text =
                    item.source === 'azure'
                      ? `[${item.repoName}] ${item.text}`
                      : `[${item.label}] ${item.text}`;
                  const existing = record?.editableActivity || '';
                  const newActivity = existing ? `${existing}\n${text}` : text;
                  onUpdateRecord(recordIndex, 'editableActivity', newActivity);
                  setQuickAddOpen(false);
                }}
                className="w-full text-left p-3 rounded-xl bg-white border border-[#E5E2D9] hover:border-[#A4B494] hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md ${
                      item.source === 'azure'
                        ? 'bg-[#0078D4]/10 text-[#0078D4]'
                        : 'bg-[#0052CC]/10 text-[#0052CC]'
                    }`}
                  >
                    {item.source === 'azure'
                      ? 'ADO'
                      : item.label.split(']')[0]?.replace('[', '') || item.label}
                  </span>
                </div>
                <p className="text-[10px] text-[#3E3D39] leading-relaxed line-clamp-2">
                  {item.text}
                </p>
              </button>
            ))}
          {[...allCommits, ...allTasks].filter((item) => isSameDay(item.date, selectedDate))
            .length === 0 && (
            <p className="text-xs text-[#9A958A] text-center py-2">
              Tidak ada commit/task untuk hari ini
            </p>
          )}
        </div>
      )}

      {/* Form Fields */}
      <div className="flex-1 overflow-auto space-y-4">
        {/* Time Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="jamMulai"
              className="block text-[10px] uppercase font-bold text-[#9A958A] mb-2 tracking-wider"
            >
              Jam Mulai
            </label>
            <input
              id="jamMulai"
              type="time"
              value={record?.jamMulai || ''}
              onChange={(e) => {
                if (recordIndex >= 0) {
                  onUpdateRecord(recordIndex, 'jamMulai', e.target.value);
                }
              }}
              disabled={isLeave}
              className={`w-full rounded-2xl border-0 py-3 px-4 text-sm outline-none transition-shadow ${
                isLeave
                  ? 'bg-[#FEF9E7] text-[#8E897E] cursor-not-allowed'
                  : 'bg-[#F8F7F3] text-[#5A6355] focus:ring-2 focus:ring-[#A4B494]/30'
              }`}
            />
          </div>
          <div>
            <label
              htmlFor="jamBerakhir"
              className="block text-[10px] uppercase font-bold text-[#9A958A] mb-2 tracking-wider"
            >
              Jam Berakhir
            </label>
            <input
              id="jamBerakhir"
              type="time"
              value={record?.jamBerakhir || ''}
              onChange={(e) => {
                if (recordIndex >= 0) {
                  onUpdateRecord(recordIndex, 'jamBerakhir', e.target.value);
                }
              }}
              disabled={isLeave}
              className={`w-full rounded-2xl border-0 py-3 px-4 text-sm outline-none transition-shadow ${
                isLeave
                  ? 'bg-[#FEF9E7] text-[#8E897E] cursor-not-allowed'
                  : 'bg-[#F8F7F3] text-[#5A6355] focus:ring-2 focus:ring-[#A4B494]/30'
              }`}
            />
          </div>
        </div>

        {/* Status Dropdown */}
        <div>
          <label
            htmlFor="keterangan"
            className="block text-[10px] uppercase font-bold text-[#9A958A] mb-2 tracking-wider"
          >
            Keterangan
          </label>
          <select
            id="keterangan"
            value={record?.status || 'Hari kerja'}
            onChange={(e) => {
              if (recordIndex >= 0) {
                onUpdateRecord(recordIndex, 'status', e.target.value as KeteranganType);
              }
            }}
            className={`w-full rounded-2xl border-0 py-3 px-4 pr-8 text-sm font-bold outline-none transition-shadow focus:ring-2 ${
              isLeave
                ? 'bg-[#FEF9E7] text-[#8E897E] ring-1 ring-[#D9D5CB] focus:ring-[#8E897E]'
                : 'bg-[#F8F7F3] text-[#5A6355] ring-1 ring-[#A4B494]/30 focus:ring-[#A4B494]'
            }`}
          >
            <option value="Hari kerja">Hari Kerja</option>
            <option value="Libur">
              {record?.isHoliday
                ? record.holidayName
                : record?.isWeekend
                  ? 'Libur Akhir Pekan'
                  : 'Libur'}
            </option>
            <option value="Sakit">Sakit</option>
            <option value="Izin">Izin</option>
            <option value="Cuti">Cuti</option>
          </select>
        </div>

        {/* Activity Textarea — Drop Zone */}
        <div
          role="application"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          aria-label="Area drop untuk aktivitas"
          className={`relative transition-all rounded-2xl ${
            isDragOver ? 'ring-2 ring-[#A4B494] ring-offset-2 bg-[#E7F5E4]/50' : ''
          }`}
        >
          <label
            htmlFor="aktivitas"
            className="block text-[10px] uppercase font-bold text-[#9A958A] mb-2 tracking-wider"
          >
            Aktivitas
            {isDragOver && (
              <span className="ml-2 text-[#A4B494] normal-case font-normal">— Drop di sini</span>
            )}
          </label>
          <textarea
            id="aktivitas"
            className={`w-full resize-y rounded-2xl border-0 p-4 text-sm outline-none transition-shadow focus:ring-2 ${
              isLeave
                ? 'bg-[#FEF9E7] border border-[#E5E2D9] focus:border-[#E5E2D9] focus:ring-0'
                : 'bg-[#F8F7F3] border border-[#E5E2D9] focus:border-[#A4B494] focus:ring-[#A4B494]/30'
            }`}
            value={
              record?.editableActivity !== undefined
                ? record.editableActivity
                : activities.join('\n')
            }
            onChange={(e) => {
              if (recordIndex >= 0) {
                onUpdateRecord(recordIndex, 'editableActivity', e.target.value);
              }
            }}
            rows={6}
            disabled={isLeave}
            placeholder={
              isLeave
                ? 'Tidak ada aktivitas untuk hari ini'
                : '- Seret pekerjaan dari panel kanan atau ketik manual -/- Tidak ada commit atau task tercatat -'
            }
          />
        </div>
      </div>
    </div>
  );
};
