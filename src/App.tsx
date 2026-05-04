import React, { useState, useEffect } from 'react';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { ResultTable } from './components/ResultTable';
import { HelpPanel } from './components/HelpPanel';
import { Config, DayRecord } from './lib/types';
import { generateTimesheetData } from './lib/generator';
import { exportToExcel, exportToPDF } from './lib/exportUtils';
import { DownloadCloud, FileText, HelpCircle, X, Trash2 } from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

export default function App() {
  const [config, setConfig] = useState<Config>(() => {
    const savedConfig = localStorage.getItem('timesheet-config');
    const parsedConfig = savedConfig ? JSON.parse(savedConfig) : {};
    
    return {
      adoOrg: parsedConfig.adoOrg || '',
      adoProject: parsedConfig.adoProject || '',
      adoEmail: parsedConfig.adoEmail || '',
      jiraDomain: parsedConfig.jiraDomain || '',
      jiraEmail: parsedConfig.jiraEmail || '',
      startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
    };
  });

  useEffect(() => {
    const { startDate, endDate, ...configToSave } = config;
    localStorage.setItem('timesheet-config', JSON.stringify(configToSave));
  }, [config]);

  const [records, setRecords] = useState<DayRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

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

  const handleClearSavedData = () => {
    if (window.confirm("Apakah Anda yakin ingin menghapus data kredensial yang tersimpan?")) {
      localStorage.removeItem('timesheet-config');
      setConfig({
        adoOrg: '',
        adoProject: '',
        adoEmail: '',
        jiraDomain: '',
        jiraEmail: '',
        startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
      });
    }
  };

  const handleGenerate = async () => {
    // Validate minimally
    if (!config.adoOrg || !config.adoProject || !config.adoEmail) {
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
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8">
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-serif italic text-[#3E3D39] tracking-tight sm:text-5xl">
              Auto Timesheet Generator
            </h1>
            <p className="mt-4 max-w-2xl mx-auto md:mx-0 text-xs uppercase tracking-widest text-[#9A958A] font-semibold">
              Otomatisasi pembuatan timesheet dari Azure DevOps commits dan Jira Issues
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleClearSavedData}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-sm border bg-white text-red-500 border-[#E5E2D9] hover:bg-red-50"
              title="Hapus data kredensial yang tersimpan di browser"
            >
              <Trash2 className="w-4 h-4" />
              Hapus Data
            </button>
            
            <button
              onClick={() => setShowHelp(!showHelp)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-sm border ${
                showHelp 
                  ? "bg-[#5A6355] text-white border-[#5A6355]" 
                  : "bg-white text-[#5A6355] border-[#E5E2D9] hover:bg-[#F8F7F3]"
              }`}
            >
              {showHelp ? <X className="w-4 h-4" /> : <HelpCircle className="w-4 h-4 text-[#A4B494]" />}
              {showHelp ? "Tutup Panduan" : "Butuh Bantuan?"}
            </button>
          </div>
        </div>

        {/* Help Panel */}
        {showHelp && <HelpPanel />}

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
