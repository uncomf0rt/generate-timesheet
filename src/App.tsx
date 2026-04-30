import React, { useState } from 'react';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { ResultTable } from './components/ResultTable';
import { Config, DayRecord } from './lib/types';
import { generateTimesheetData } from './lib/generator';
import { exportToExcel, exportToPDF } from './lib/exportUtils';
import { DownloadCloud, FileText } from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

export default function App() {
  const [config, setConfig] = useState<Config>({
    adoOrg: '',
    adoProject: '',
    adoPat: '',
    adoEmail: '',
    jiraDomain: '',
    jiraEmail: '',
    jiraToken: '',
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  const [records, setRecords] = useState<DayRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const handleChange = (key: keyof Config, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleUpdateRecord = (index: number, field: keyof DayRecord, value: any) => {
    setRecords(prev => {
      const newRecords = [...prev];
      newRecords[index] = { ...newRecords[index], [field]: value };
      return newRecords;
    });
  };

  const handleGenerate = async () => {
    // Validate minimally
    if (!config.adoOrg || !config.adoProject || !config.adoPat || !config.adoEmail) {
      alert("Harap lengkapi semua isian Azure DevOps sebagai sumber utama data commits.");
      return;
    }
    
    // Validate dates
    if (new Date(config.startDate) > new Date(config.endDate)) {
      alert("Tanggal Mulai tidak boleh lebih besar dari Tanggal Selesai.");
      return;
    }
    
    setLoading(true);
    try {
      const data = await generateTimesheetData(config);
      setRecords(data);
    } catch (e: any) {
      alert("Terjadi kesalahan: " + (e.message || "Gagal memproses data."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7F3] text-[#3C3A36] py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-[#A4B494] selection:text-white">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center pt-8">
          <h1 className="text-4xl font-serif italic text-[#3E3D39] tracking-tight sm:text-5xl">
            Auto Timesheet Generator
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xs uppercase tracking-widest text-[#9A958A] font-semibold">
            Otomatisasi pembuatan timesheet dari Azure DevOps commits dan Jira Issues
          </p>
        </div>

        {/* Configuration */}
        <ConfigurationPanel 
          config={config} 
          onChange={handleChange} 
          onGenerate={handleGenerate} 
          loading={loading} 
        />

        {/* Results */}
        {records.length > 0 && (
          <div className="bg-white rounded-[40px] border border-[#E5E2D9] shadow-sm p-8 md:p-10 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-center border-b border-[#E5E2D9] pb-6 gap-6">
              <div>
                <h2 className="text-2xl font-serif italic text-[#3E3D39]">
                  Preview Timesheet
                </h2>
                <p className="text-xs uppercase tracking-widest text-[#9A958A] mt-2 font-semibold">
                  {format(parseISO(config.startDate), 'dd MMM yyyy', { locale: id })} - {format(parseISO(config.endDate), 'dd MMM yyyy', { locale: id })}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => exportToPDF(records, config.startDate, config.endDate)}
                  className="px-6 py-2.5 bg-white rounded-full border border-[#E5E2D9] text-xs font-bold uppercase tracking-wider text-[#5A6355] shadow-sm flex items-center gap-2 hover:bg-[#F8F7F3] transition-colors"
                >
                  <FileText className="w-4 h-4 text-[#B8865D]" />
                  Export PDF
                </button>
                <button
                  onClick={() => exportToExcel(records, config.startDate, config.endDate)}
                  className="px-6 py-2.5 bg-[#5A6355] text-[#F8F7F3] rounded-full text-xs font-bold uppercase tracking-wider shadow-md flex items-center gap-2 hover:bg-[#4A5246] transition-colors"
                >
                  <DownloadCloud className="w-4 h-4" />
                  Export Excel (.xlsx)
                </button>
              </div>
            </div>
            
            <ResultTable records={records} onUpdateRecord={handleUpdateRecord} />
          </div>
        )}

      </div>
    </div>
  );
}
