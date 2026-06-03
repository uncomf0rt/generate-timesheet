'use client';
import { format, isSameDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import { DayRecord, KeteranganType } from '@/lib/types';

interface Props {
  selectedDate: Date;
  records: DayRecord[];
  onUpdateRecord: (index: number, field: keyof DayRecord, value: any) => void;
}

export const DayDetailPanel: React.FC<Props> = ({ selectedDate, records, onUpdateRecord }) => {
  const recordIndex = records.findIndex((r) => isSameDay(r.date, selectedDate));
  const record = recordIndex >= 0 ? records[recordIndex] : undefined;

  const isLeave = record && record.status !== 'Hari kerja';
  const dayName = format(selectedDate, 'EEEE', { locale: id });
  const dateStr = format(selectedDate, 'dd MMMM yyyy', { locale: id });

  const activities = record ? [...record.tasks, ...record.commits] : [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#E5E2D9]">
        <CalendarDays className="w-5 h-5 text-[#A4B494]" />
        <div>
          <h4 className="text-base font-bold text-[#3E3D39]">{dayName}</h4>
          <p className="text-xs text-[#9A958A]">{dateStr}</p>
        </div>
      </div>

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

        {/* Activity Textarea */}
        <div>
          <label
            htmlFor="aktivitas"
            className="block text-[10px] uppercase font-bold text-[#9A958A] mb-2 tracking-wider"
          >
            Aktivitas
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
                : '- Tidak ada commit atau task tercatat -'
            }
          />
        </div>
      </div>
    </div>
  );
};
