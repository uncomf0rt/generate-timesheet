'use client';
import { format, isSameDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { useCallback, useState } from 'react';
import { DayRecord, KeteranganType } from '@/lib/types';
import { WorkItem } from './WorkSelectorPanel';

interface Props {
  records: DayRecord[];
  onUpdateRecord: (index: number, field: keyof DayRecord, value: any) => void;
  allCommits: WorkItem[];
  allTasks: WorkItem[];
}

function isLeaveType(status: KeteranganType): boolean {
  return status !== 'Hari kerja';
}

export const ResultTable: React.FC<Props> = ({ records, onUpdateRecord, allCommits, allTasks }) => {
  if (!records || records.length === 0) return null;

  return (
    <div className="mt-8 flex flex-col">
      <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
          <div className="overflow-hidden border border-[#E5E2D9] rounded-3xl">
            <table className="min-w-full divide-y divide-[#E5E2D9]">
              <thead className="bg-[#EAE7DF]">
                <tr>
                  <th
                    scope="col"
                    className="py-4 pl-6 pr-3 text-left text-[10px] uppercase tracking-widest font-bold text-[#8E897E] w-32"
                  >
                    Tanggal
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-4 text-left text-[10px] uppercase tracking-widest font-bold text-[#8E897E] w-28"
                  >
                    Hari
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-4 text-left text-[10px] uppercase tracking-widest font-bold text-[#8E897E] w-24"
                  >
                    Jam Mulai
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-4 text-left text-[10px] uppercase tracking-widest font-bold text-[#8E897E] w-24"
                  >
                    Jam Berakhir
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-4 text-left text-[10px] uppercase tracking-widest font-bold text-[#8E897E] w-36"
                  >
                    Keterangan
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-4 text-left text-[10px] uppercase tracking-widest font-bold text-[#8E897E]"
                  >
                    Aktivitas
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E2D9] bg-white text-[#3C3A36]">
                {records.map((record, index) => {
                  const leave = isLeaveType(record.status);
                  const dateStr = format(record.date, 'dd MMM yyyy', { locale: id });
                  const dayName = format(record.date, 'EEEE', { locale: id });
                  const activities = [...record.tasks, ...record.commits];
                  const rowKey = record.date.toISOString();

                  return (
                    <ResultRow
                      key={rowKey}
                      record={record}
                      index={index}
                      dateStr={dateStr}
                      dayName={dayName}
                      leave={leave}
                      activities={activities}
                      allCommits={allCommits}
                      allTasks={allTasks}
                      onUpdateRecord={onUpdateRecord}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

interface RowProps {
  record: DayRecord;
  index: number;
  dateStr: string;
  dayName: string;
  leave: boolean;
  activities: string[];
  allCommits: WorkItem[];
  allTasks: WorkItem[];
  onUpdateRecord: (index: number, field: keyof DayRecord, value: any) => void;
}

const ResultRow: React.FC<RowProps> = ({
  record,
  index,
  dateStr,
  dayName,
  leave,
  activities,
  allCommits,
  allTasks,
  onUpdateRecord,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    if (leave) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (leave) return;
      e.preventDefault();
      setIsDragOver(false);
      try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        const text = data.text;
        const existing =
          record.editableActivity !== undefined ? record.editableActivity : activities.join('\n');
        const newActivity = existing ? `${existing}\n${text}` : text;
        onUpdateRecord(index, 'editableActivity', newActivity);
      } catch (_) {
        /* ignore */
      }
    },
    [leave, index, record, activities, onUpdateRecord]
  );

  const dayItems = [...allCommits, ...allTasks].filter((item) => isSameDay(item.date, record.date));

  return (
    <tr
      className={`${leave ? 'bg-[#FFF8E7]' : 'hover:bg-[#F8F7F3]/50 transition-colors'} ${
        isDragOver ? 'bg-[#E7F5E4]/30' : ''
      }`}
    >
      <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium text-[#3E3D39]">
        {dateStr}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-[#5A6355]">{dayName}</td>
      <td className="whitespace-nowrap px-3 py-4 text-sm">
        <input
          type="time"
          value={record.jamMulai || ''}
          onChange={(e) => onUpdateRecord(index, 'jamMulai', e.target.value)}
          disabled={leave}
          className={`block w-full rounded-xl border-0 py-1.5 pl-3 text-xs outline-none transition-shadow ${
            leave
              ? 'bg-[#FFF8E7] text-[#8E897E] cursor-not-allowed'
              : 'bg-[#F8F7F3] text-[#5A6355] focus:ring focus:ring-[#A4B494]/20'
          }`}
        />
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm">
        <input
          type="time"
          value={record.jamBerakhir || ''}
          onChange={(e) => onUpdateRecord(index, 'jamBerakhir', e.target.value)}
          disabled={leave}
          className={`block w-full rounded-xl border-0 py-1.5 pl-3 text-xs outline-none transition-shadow ${
            leave
              ? 'bg-[#FFF8E7] text-[#8E897E] cursor-not-allowed'
              : 'bg-[#F8F7F3] text-[#5A6355] focus:ring focus:ring-[#A4B494]/20'
          }`}
        />
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm">
        <select
          value={record.status}
          onChange={(e) => onUpdateRecord(index, 'status', e.target.value as KeteranganType)}
          className={`block w-full rounded-xl border-0 py-1.5 pl-3 pr-8 ring-1 ring-inset outline-none focus:ring-2 focus:ring-inset text-xs font-bold sm:leading-6 ${
            leave
              ? 'bg-[#FFF8E7] text-[#8E897E] ring-[#D9D5CB] focus:ring-[#8E897E]'
              : 'bg-[#F8F7F3] text-[#5A6355] ring-[#A4B494]/30 focus:ring-[#A4B494]'
          }`}
        >
          <option value="Hari kerja">Hari Kerja</option>
          <option value="Libur">
            {record.isHoliday
              ? record.holidayName
              : record.isWeekend
                ? 'Libur Akhir Pekan'
                : 'Libur'}
          </option>
          <option value="Sakit">Sakit</option>
          <option value="Izin">Izin</option>
          <option value="Cuti">Cuti</option>
        </select>
      </td>
      {/* Aktivitas Cell — Drop Zone */}
      <td className="px-3 py-4 text-sm relative">
        {showQuickAdd && (
          <div className="absolute z-50 right-0 top-0 w-64 bg-white rounded-2xl border border-[#E5E2D9] shadow-xl p-3 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6355]">
                Tambah aktivitas
              </span>
              <button
                onClick={() => setShowQuickAdd(false)}
                className="p-1 rounded-lg hover:bg-[#F8F7F3] transition-colors"
              >
                ×
              </button>
            </div>
            {dayItems.length === 0 && (
              <p className="text-xs text-[#9A958A] text-center py-2">
                Tidak ada commit/task untuk hari ini
              </p>
            )}
            {dayItems.slice(0, 8).map((item) => (
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
                  const existing =
                    record.editableActivity !== undefined
                      ? record.editableActivity
                      : activities.join('\n');
                  const newActivity = existing ? `${existing}\n${text}` : text;
                  onUpdateRecord(index, 'editableActivity', newActivity);
                  setShowQuickAdd(false);
                }}
                className="w-full text-left p-2.5 rounded-xl bg-[#FAFAF8] border border-[#E5E2D9] hover:border-[#A4B494] hover:bg-[#E7F5E4]/30 transition-all"
              >
                <span
                  className={`text-[8px] font-bold uppercase px-1 py-0.5 rounded ${
                    item.source === 'azure'
                      ? 'bg-[#0078D4]/10 text-[#0078D4]'
                      : 'bg-[#0052CC]/10 text-[#0052CC]'
                  }`}
                >
                  {item.source === 'azure'
                    ? 'ADO'
                    : item.label.split(']')[0]?.replace('[', '') || 'Jira'}
                </span>
                <p className="text-[10px] text-[#3E3D39] mt-1 line-clamp-2 leading-relaxed">
                  {item.text}
                </p>
              </button>
            ))}
          </div>
        )}

        <div
          role="application"
          aria-label="Area drop untuk aktivitas"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative transition-all rounded-xl ${
            isDragOver ? 'ring-2 ring-[#A4B494] bg-[#E7F5E4]/30' : ''
          }`}
        >
          <div className="flex items-start gap-2">
            <textarea
              className={`flex-1 resize-y border rounded-xl focus:ring focus:ring-[#A4B494]/20 p-3 text-sm outline-none transition-shadow ${
                leave
                  ? 'bg-[#FFF8E7] border-[#E5E2D9]'
                  : 'bg-transparent border-[#E5E2D9] focus:border-[#A4B494]'
              }`}
              value={
                record.editableActivity !== undefined
                  ? record.editableActivity
                  : activities.join('\n')
              }
              onChange={(e) => onUpdateRecord(index, 'editableActivity', e.target.value)}
              rows={Math.max(
                2,
                (record.editableActivity !== undefined
                  ? record.editableActivity
                  : activities.join('\n')
                ).split('\n').length
              )}
              disabled={leave}
              placeholder={
                leave ? 'Tidak ada aktivitas' : 'Seret pekerjaan ke sini atau ketik manual'
              }
            />
            {!leave && (
              <button
                onClick={() => setShowQuickAdd(!showQuickAdd)}
                className="shrink-0 mt-1 p-2 rounded-xl bg-[#E7F5E4] hover:bg-[#D9EDDA] transition-colors text-[#5A6355] shadow-sm"
                title="Pilih pekerjaan"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
};
