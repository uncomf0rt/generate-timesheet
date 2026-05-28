import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import React from 'react';
import { DayRecord, KeteranganType } from '../lib/types';

interface Props {
  records: DayRecord[];
  onUpdateRecord: (index: number, field: keyof DayRecord, value: any) => void;
}

function isLeaveType(status: KeteranganType): boolean {
  return status !== 'Hari kerja';
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
                    <tr
                      key={rowKey}
                      className={leave ? 'bg-[#FFF8E7]' : 'hover:bg-[#F8F7F3]/50 transition-colors'}
                    >
                      <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium text-[#3E3D39]">
                        {dateStr}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-[#5A6355]">
                        {dayName}
                      </td>
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
                          onChange={(e) =>
                            onUpdateRecord(index, 'status', e.target.value as KeteranganType)
                          }
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
                      <td className="px-3 py-4 text-sm text-[#5A6355]">
                        <textarea
                          className={`w-full resize-y border rounded-xl focus:ring focus:ring-[#A4B494]/20 p-3 text-sm outline-none transition-shadow ${
                            leave
                              ? 'bg-[#FFF8E7] border-[#E5E2D9]'
                              : 'bg-transparent border-[#E5E2D9] focus:border-[#A4B494]'
                          }`}
                          value={
                            record.editableActivity !== undefined
                              ? record.editableActivity
                              : activities.join('\n')
                          }
                          onChange={(e) =>
                            onUpdateRecord(index, 'editableActivity', e.target.value)
                          }
                          rows={Math.max(
                            2,
                            (record.editableActivity !== undefined
                              ? record.editableActivity
                              : activities.join('\n')
                            ).split('\n').length
                          )}
                          disabled={leave}
                          placeholder={
                            leave
                              ? 'Tidak ada aktivitas'
                              : '- Tidak ada commit atau task tercatat -'
                          }
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
