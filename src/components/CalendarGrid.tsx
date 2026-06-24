'use client';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { id } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { DayRecord } from '@/lib/types';

interface Props {
  selectedDate: Date;
  records: DayRecord[];
  onSelectDate: (date: Date) => void;
}

function isLeaveDay(record: DayRecord | undefined): boolean {
  if (!record) return false;
  return record.status !== 'Hari kerja';
}

export const CalendarGrid: React.FC<Props> = ({ selectedDate, records, onSelectDate }) => {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const findRecordForDate = (date: Date): DayRecord | undefined => {
    return records.find((r) => isSameDay(r.date, date));
  };

  const getDayStyle = (date: Date): string => {
    const record = findRecordForDate(date);
    const isSelected = isSameDay(date, selectedDate);
    const isToday = isSameDay(date, new Date());
    const inCurrentMonth = isSameMonth(date, currentMonth);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    let baseStyle =
      'flex flex-col items-center justify-center rounded-2xl cursor-pointer transition-all aspect-square ';

    if (!inCurrentMonth) {
      baseStyle += 'text-[#C4C0B8] ';
    } else if (isSelected) {
      baseStyle += 'ring-2 ring-[#5A6355] bg-white ';
    } else if (isToday) {
      baseStyle += 'bg-[#A4B494]/20 font-bold ';
    } else {
      baseStyle += 'hover:bg-[#F8F7F3] ';
    }

    if (record && isLeaveDay(record)) {
      baseStyle += 'bg-[#FEF9E7] ';
    } else if (isWeekend && inCurrentMonth) {
      baseStyle += 'bg-[#F5F5F5]/50 ';
    } else if (!isSelected && inCurrentMonth) {
      baseStyle += 'bg-white ';
    }

    return baseStyle;
  };

  const getStatusDot = (date: Date): React.ReactNode => {
    const record = findRecordForDate(date);
    if (!record) return null;

    const baseDot = 'w-1.5 h-1.5 rounded-full mt-0.5 ';
    if (record.status === 'Hari kerja') {
      return <span className={`${baseDot}bg-[#5A6355]`} />;
    }
    return <span className={`${baseDot}bg-[#E8A838]`} />;
  };

  const weekDays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  return (
    <div className="flex flex-col h-full">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4 px-1">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 rounded-xl hover:bg-[#F8F7F3] transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-[#5A6355]" />
        </button>
        <h3 className="text-sm font-bold text-[#3E3D39] uppercase tracking-wider">
          {format(currentMonth, 'MMMM yyyy', { locale: id })}
        </h3>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 rounded-xl hover:bg-[#F8F7F3] transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-[#5A6355]" />
        </button>
      </div>

      {/* Week Day Headers */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-bold text-[#9A958A] uppercase tracking-wider py-2"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 flex flex-col gap-1 px-1">
        {weeks.map((week) => (
          <div key={week[0].toISOString()} className="grid grid-cols-7 gap-1">
            {week.map((date) => (
              <button
                key={date.toISOString()}
                onClick={() => onSelectDate(date)}
                className={getDayStyle(date)}
              >
                <span
                  className={`text-xs ${isSameDay(date, new Date()) && isSameMonth(date, currentMonth) ? 'font-bold' : 'font-medium'} ${
                    !isSameMonth(date, currentMonth) ? 'text-[#C4C0B8]' : 'text-[#3E3D39]'
                  }`}
                >
                  {format(date, 'd')}
                </span>
                {getStatusDot(date)}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#E5E2D9] px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#5A6355]" />
          <span className="text-[10px] text-[#8E897E]">Hari kerja</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#E8A838]" />
          <span className="text-[10px] text-[#8E897E]">Off day</span>
        </div>
      </div>
    </div>
  );
};
