import React from 'react';
import { DayRecord } from '../lib/types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface Props {
  records: DayRecord[];
  onUpdateRecord: (index: number, field: keyof DayRecord, value: any) => void;
}

export const ResultTable: React.FC<Props> = ({ records, onUpdateRecord }) => {
  if (!records || records.length === 0) return null;

  return (
    <div className="mt-8 flex flex-col">
      <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
          <div className="overflow-hidden border border-[#E5E2D9] rounded-3xl">
            <table className="min-w-full divide-y divide-[#E5E2D9]">
              <thead className="bg-[#EAE7DF]">
                <tr>
                  <th scope="col" className="py-4 pl-6 pr-3 text-left text-[10px] uppercase tracking-widest font-bold text-[#8E897E] w-32">
                    Tanggal
                  </th>
                  <th scope="col" className="px-3 py-4 text-left text-[10px] uppercase tracking-widest font-bold text-[#8E897E] w-32">
                    Hari
                  </th>
                  <th scope="col" className="px-3 py-4 text-left text-[10px] uppercase tracking-widest font-bold text-[#8E897E] w-32">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-4 text-left text-[10px] uppercase tracking-widest font-bold text-[#8E897E]">
                    Aktivitas
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E2D9] bg-white text-[#3C3A36]">
                {records.map((record, idx) => {
                  const isDayOff = record.status === 'Libur';
                  const dateStr = format(record.date, 'dd MMM yyyy', { locale: id });
                  const dayName = format(record.date, 'EEEE', { locale: id });
                  const activities = [...record.tasks, ...record.commits];
                  
                  return (
                    <tr key={idx} className={isDayOff ? 'bg-[#F8F7F3]' : 'hover:bg-[#F8F7F3]/50 transition-colors'}>
                      <td className="whitespace-nowrap py-5 pl-6 pr-3 text-sm font-medium text-[#3E3D39]">
                        {dateStr}
                      </td>
                      <td className="whitespace-nowrap px-3 py-5 text-sm text-[#5A6355]">
                        {dayName}
                      </td>
                      <td className="whitespace-nowrap px-3 py-5 text-sm">
                        <select
                          value={record.status}
                          onChange={(e) => onUpdateRecord(idx, 'status', e.target.value)}
                          className={`block w-full rounded-xl border-0 py-1.5 pl-3 pr-8 ring-1 ring-inset outline-none focus:ring-2 focus:ring-inset text-xs font-bold sm:leading-6 ${
                            isDayOff ? 'bg-[#EAE7DF] text-[#8E897E] ring-[#D9D5CB] focus:ring-[#8E897E]' : 'bg-[#F8F7F3] text-[#5A6355] ring-[#A4B494]/30 focus:ring-[#A4B494]'
                          }`}
                        >
                          <option value="Hari kerja">Hari Kerja</option>
                          <option value="Libur">
                            {record.isHoliday ? record.holidayName : record.isWeekend ? 'Libur Akhir Pekan' : 'Libur'}
                          </option>
                        </select>
                      </td>
                      <td className="px-3 py-5 text-sm text-[#5A6355]">
                        <textarea
                          className="w-full resize-y bg-transparent border border-[#E5E2D9] rounded-xl focus:border-[#A4B494] focus:ring focus:ring-[#A4B494]/20 p-3 text-sm outline-none transition-shadow"
                          value={record.editableActivity !== undefined ? record.editableActivity : activities.join('\n')}
                          onChange={(e) => onUpdateRecord(idx, 'editableActivity', e.target.value)}
                          rows={Math.max(2, (record.editableActivity !== undefined ? record.editableActivity : activities.join('\n')).split('\n').length)}
                          placeholder={isDayOff ? "Tidak ada aktivitas" : "- Tidak ada commit atau task tercatat -"}
                        />
                      </td>
                    </tr>
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
