'use client';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Briefcase, CheckCircle2, GitCommit, Plus, Search, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { DayRecord } from '@/lib/types';

export interface WorkItem {
  id: string;
  source: 'azure' | 'jira';
  label: string;
  text: string;
  date: Date;
  repoName?: string;
  projectName?: string;
}

interface Props {
  allCommits: WorkItem[];
  allTasks: WorkItem[];
  recordIndex: number | null;
  records: DayRecord[];
  onAddWork: (text: string, recordIndex: number) => void;
  configStartDate: string;
  configEndDate: string;
}

type Tab = 'azure' | 'jira';

export const WorkSelectorPanel: React.FC<Props> = ({
  allCommits,
  allTasks,
  recordIndex,
  records,
  onAddWork,
  configStartDate,
  configEndDate,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('azure');
  const [search, setSearch] = useState('');
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

  const startDate = parseISO(configStartDate);
  const endDate = parseISO(configEndDate);

  const items = activeTab === 'azure' ? allCommits : allTasks;

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const inRange = isWithinInterval(item.date, { start: startDate, end: endDate });
      const matchesSearch =
        !search ||
        item.text.toLowerCase().includes(search.toLowerCase()) ||
        item.label.toLowerCase().includes(search.toLowerCase());
      return inRange && matchesSearch;
    });
  }, [items, search, startDate, endDate]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, WorkItem[]> = {};
    for (const item of filteredItems) {
      const key = format(item.date, 'yyyy-MM-dd');
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }, [filteredItems]);

  const sortedDates = useMemo(
    () => Object.keys(groupedByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime()),
    [groupedByDate]
  );

  const toggleDate = (dateKey: string) => {
    setCollapsedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  };

  const handleAdd = useCallback(
    (item: WorkItem) => {
      if (recordIndex === null) return;
      const text = `[${item.source === 'azure' ? item.repoName : item.label}] ${item.text}`;
      onAddWork(text, recordIndex);
      setAddedItems((prev) => new Set([...prev, item.id]));
    },
    [recordIndex, onAddWork]
  );

  const handleDragStart = (e: React.DragEvent, item: WorkItem) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        source: item.source,
        id: item.id,
        label: item.label,
        text: item.text,
        repoName: item.repoName,
      })
    );
    e.dataTransfer.effectAllowed = 'copy';
  };

  const [mobileOpen, setMobileOpen] = useState(false);

  const hasItems = allCommits.length > 0 || allTasks.length > 0;

  if (!hasItems) return null;

  const panelContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-bold uppercase tracking-widest text-[#5A6355]">
          Pilih Pekerjaan
        </h4>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1 rounded-lg hover:bg-[#F8F7F3] transition-colors"
        >
          <X className="w-4 h-4 text-[#9A958A]" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#F0EDE6] rounded-xl mb-4">
        <button
          onClick={() => setActiveTab('azure')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
            activeTab === 'azure'
              ? 'bg-white text-[#5A6355] shadow-sm'
              : 'text-[#9A958A] hover:text-[#5A6355]'
          }`}
        >
          <GitCommit className="w-3 h-3" />
          Azure
        </button>
        <button
          onClick={() => setActiveTab('jira')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
            activeTab === 'jira'
              ? 'bg-white text-[#5A6355] shadow-sm'
              : 'text-[#9A958A] hover:text-[#5A6355]'
          }`}
        >
          <Briefcase className="w-3 h-3" />
          Jira
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9A958A]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Cari ${activeTab === 'azure' ? 'commit' : 'task'}...`}
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E5E2D9] bg-[#F8F7F3] text-xs text-[#3E3D39] outline-none focus:border-[#A4B494] focus:ring-1 focus:ring-[#A4B494]/20 placeholder-[#C4C0B8] transition-shadow"
        />
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-auto space-y-3">
        {sortedDates.length === 0 && (
          <div className="text-center py-8">
            <p className="text-xs text-[#9A958A]">
              {search ? 'Tidak ada hasil pencarian' : 'Tidak ada item untuk ditampilkan'}
            </p>
          </div>
        )}
        {sortedDates.map((dateKey) => {
          const dateItems = groupedByDate[dateKey];
          const isCollapsed = collapsedDates.has(dateKey);
          const date = new Date(dateKey);
          const dayName = format(date, 'EEEE', { locale: id });
          const dateStr = format(date, 'dd MMM yyyy', { locale: id });

          // Check which items already exist in the selected day's record
          const selectedRecord = recordIndex !== null ? records[recordIndex] : null;
          const selectedText = selectedRecord?.editableActivity || '';

          return (
            <div key={dateKey}>
              <button
                onClick={() => toggleDate(dateKey)}
                className="flex items-center justify-between w-full px-3 py-2 bg-[#EAE7DF] hover:bg-[#E0DDD5] rounded-xl transition-colors mb-1"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E897E]">
                    {dayName}
                  </span>
                  <span className="text-[10px] text-[#9A958A]">{dateStr}</span>
                </div>
                <span className="text-[10px] text-[#9A958A]">
                  {dateItems.length} item{dateItems.length !== 1 ? 's' : ''}
                </span>
              </button>

              {!isCollapsed && (
                <div className="space-y-1.5">
                  {dateItems.map((item) => {
                    const alreadyAdded =
                      addedItems.has(item.id) || selectedText.includes(item.text.substring(0, 30));
                    return (
                      <div
                        key={item.id}
                        draggable={!alreadyAdded}
                        onDragStart={(e) => handleDragStart(e, item)}
                        className={`flex items-start gap-2 p-3 rounded-xl border border-[#E5E2D9] bg-white transition-all ${
                          alreadyAdded
                            ? 'opacity-50 cursor-default'
                            : 'cursor-grab hover:border-[#A4B494] hover:shadow-sm'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
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
                        </div>
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          {alreadyAdded ? (
                            <CheckCircle2 className="w-4 h-4 text-[#A4B494]" />
                          ) : (
                            <>
                              {recordIndex !== null && (
                                <button
                                  onClick={() => handleAdd(item)}
                                  className="p-1 rounded-lg hover:bg-[#E7F5E4] transition-colors"
                                  title="Tambah ke hari ini"
                                >
                                  <Plus className="w-4 h-4 text-[#5A6355]" />
                                </button>
                              )}
                              <GitCommit className="w-3 h-3 text-[#C4C0B8]" />
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Desktop: sticky sidebar
  return (
    <>
      {/* Desktop sticky panel */}
      <div className="hidden lg:block w-80 shrink-0">
        <div className="sticky top-8 bg-white rounded-3xl border border-[#E5E2D9] shadow-sm p-5 max-h-[calc(100vh-6rem)] overflow-hidden flex flex-col">
          {panelContent}
        </div>
      </div>

      {/* Mobile: floating trigger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#5A6355] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#4A5246] transition-colors"
        title="Pilih Pekerjaan"
      >
        <Briefcase className="w-5 h-5" />
      </button>

      {/* Mobile: slide-over */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[100] flex">
          <button
            className="absolute inset-0 bg-black/30 cursor-default"
            onClick={() => setMobileOpen(false)}
            aria-label="Tutup panel"
          />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white rounded-l-3xl shadow-xl p-5 flex flex-col overflow-hidden">
            {panelContent}
          </div>
        </div>
      )}
    </>
  );
};
