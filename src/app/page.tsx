'use client';
import { format, subDays } from 'date-fns';
import { HelpCircle, Lock, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import EmailTemplateSection from '@/components/EmailTemplateSection';
import { HelpPanel } from '@/components/HelpPanel';
import { PreviewSection } from '@/components/PreviewSection';
import { SignatureInput } from '@/components/SignatureInput';
import * as api from '@/lib/api';
import { exportToPDF } from '@/lib/exportUtils';
import { generateTimesheetData } from '@/lib/generator';
import { clearJiraToken } from '@/lib/oauthUtils';
import {
  changePassphrase,
  detectPlaintextMigrationNeeded,
  hasEnvelope,
  readPlaintextForMigration,
  type SecurePayload,
  savePayload,
} from '@/lib/secureStorage';
import type { Config, DayRecord, EmployeeInfo, OAuthToken, SignatureData } from '@/lib/types';
import { getExcelExporter } from '@/modules/timesheet/exporters/excel';
import { buildExportPayload, getWordExporter } from '@/modules/timesheet/exporters/word';
import { loadKobusLogo } from '@/modules/timesheet/exporters/word/shared/adapter';

const ConfigurationPanel = dynamic(() => import('@/components/ConfigurationPanel'), { ssr: false });
const PassphraseGate = dynamic(
  () => import('@/components/PassphraseGate').then((m) => m.PassphraseGate),
  { ssr: false }
);
const PassphrasePrompt = dynamic(
  () => import('@/components/PassphrasePrompt').then((m) => m.PassphrasePrompt),
  { ssr: false }
);

export default function App() {
  // ============================================================================
  // ENCRYPTED STATE - CryptoKey + decrypted payload (in-memory only)
  // ============================================================================
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [payload, setPayload] = useState<SecurePayload | null>(null);

  // Migration: detected on first load, passed to PassphraseGate
  const [migrationPayload, setMigrationPayload] = useState<SecurePayload | null>(null);

  // Change-passphrase modal
  const [changePpOpen, setChangePpOpen] = useState(false);
  const [changePpBusy, setChangePpBusy] = useState(false);

  // ============================================================================
  // LOCAL (non-encrypted) STATE
  // ============================================================================
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [jiraLoginLoading, setJiraLoginLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  const [records, setRecords] = useState<{
    records: DayRecord[];
    jiraTokenExpired: boolean;
  }>({ records: [], jiraTokenExpired: false });
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [forceEmployeeFormOpen, _setForceEmployeeFormOpen] = useState(0);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  const [allCommits, setAllCommits] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);

  // Set default dates on client mount (avoids build-time new Date() error)
  useEffect(() => {
    setStartDate(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  // ============================================================================
  // MIGRATION DETECTION (runs once after mount)
  // ============================================================================
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hasEnvelope()) return;
    if (detectPlaintextMigrationNeeded()) {
      setMigrationPayload(readPlaintextForMigration());
    }
  }, []);

  // ============================================================================
  // EFFECT - Persist payload to encrypted envelope on change
  // ============================================================================
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!cryptoKey || !payload) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      savePayload(cryptoKey, payload).catch((err) => {
        console.error('Failed to save encrypted payload:', err);
      });
    }, 200);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [cryptoKey, payload]);

  // ============================================================================
  // EFFECT - OAuth callback (URL-bounce from /api/auth/jira/callback)
  // ============================================================================
  useEffect(() => {
    if (!cryptoKey || !payload) return;
    const params = new URLSearchParams(window.location.search);
    const jiraTokenParam = params.get('jira_token');
    if (!jiraTokenParam) return;

    try {
      const parsed = JSON.parse(decodeURIComponent(jiraTokenParam)) as OAuthToken;
      setPayload({ ...payload, jiraToken: parsed });
      window.history.replaceState({}, document.title, '/');
    } catch (_e) {
      setOAuthError('Failed to parse Jira token from callback URL.');
      window.history.replaceState({}, document.title, '/');
    }
  }, [cryptoKey, payload]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleUnlock = (key: CryptoKey, unlockedPayload: SecurePayload) => {
    setCryptoKey(key);
    setPayload(unlockedPayload);
  };

  const handleMigrationComplete = () => {
    setMigrationPayload(null);
  };

  const handleLock = () => {
    setCryptoKey(null);
    setPayload(null);
    setRecords({ records: [], jiraTokenExpired: false });
    setAllCommits([]);
    setAllTasks([]);
  };

  const handleChangePassphrase = async (
    currentPassphrase: string,
    newPassphrase: string
  ): Promise<boolean> => {
    if (!payload) return false;
    setChangePpBusy(true);
    try {
      const result = await changePassphrase(currentPassphrase, newPassphrase, payload);
      if (!result) {
        setChangePpBusy(false);
        return false;
      }
      // Lock and prompt re-unlock with new passphrase
      setCryptoKey(null);
      setPayload(null);
      setChangePpOpen(false);
      setChangePpBusy(false);
      return true;
    } catch {
      setChangePpBusy(false);
      return false;
    }
  };

  const handleConfigChange = (key: keyof Config, value: any) => {
    if (!payload) return;
    if (key === 'company') setPayload({ ...payload, company: value });
    else if (key === 'adoOrg') setPayload({ ...payload, adoOrg: value });
    else if (key === 'adoProject') setPayload({ ...payload, adoProject: value });
    else if (key === 'adoEmail') setPayload({ ...payload, adoEmail: value });
    else if (key === 'azurePat') setPayload({ ...payload, azurePat: value });
    else if (key === 'autoFillFromExternal')
      setPayload({ ...payload, autoFillFromExternal: value });
    else if (key === 'startDate') setStartDate(value);
    else if (key === 'endDate') setEndDate(value);
  };

  const handleEmployeeInfoChange = (field: keyof EmployeeInfo, value: string) => {
    if (!payload) return;
    setPayload({
      ...payload,
      employeeInfo: { ...payload.employeeInfo, [field]: value },
    });
  };

  const handleSignatureSave = (sig: SignatureData) => {
    if (!payload) return;
    setPayload({ ...payload, signatureData: sig });
  };

  const handleTemplatesChange = (next: Record<string, { text: string; syncHash: string }>) => {
    if (!payload) return;
    setPayload({ ...payload, emailTemplates: next });
  };

  const handleJiraLogin = async () => {
    setJiraLoginLoading(true);
    try {
      const url = await api.initiateJiraOAuth();
      window.location.href = url;
    } catch (error: any) {
      setOAuthError(`Failed to initiate Jira login: ${error.message}`);
      setJiraLoginLoading(false);
    }
  };

  const handleJiraLogout = async () => {
    if (!cryptoKey || !payload) return;
    await clearJiraToken(cryptoKey);
    setPayload({ ...payload, jiraToken: undefined });
  };

  const handleClearSavedData = async () => {
    if (!cryptoKey || !payload) return;
    if (!window.confirm('Apakah Anda yakin ingin menghapus data kredensial yang tersimpan?'))
      return;
    const empty: SecurePayload = {
      adoOrg: '',
      adoProject: '',
      adoEmail: '',
      azurePat: '',
      autoFillFromExternal: true,
      company: 'ENIGMA',
      jiraToken: undefined,
      signatureData: undefined,
      employeeInfo: {
        company: 'ENIGMA',
        nik: '',
        nama: '',
        consultantRole: '',
        diketahuiOleh: '',
        disetujuiOleh: '',
      },
      emailTemplates: {},
    };
    await savePayload(cryptoKey, empty);
    setPayload(empty);
    setRecords({ records: [], jiraTokenExpired: false });
    setStartDate(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleUpdateRecord = (index: number, field: keyof DayRecord, value: any) => {
    setRecords((prev) => {
      const newRecords = [...prev.records];
      newRecords[index] = { ...newRecords[index], [field]: value };
      return { ...prev, records: newRecords };
    });
  };

  const handleGenerate = async () => {
    if (!payload) return;
    if (!payload.employeeInfo.nik || !payload.employeeInfo.nama) {
      await Swal.fire({
        title: 'Data Tidak Lengkap',
        text: 'Harap lengkapi NIK dan Nama sebelum generate timesheet.',
        icon: 'warning',
        confirmButtonText: 'OK',
      });
      return;
    }

    const emails = api.parseEmails(payload.adoEmail);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter((e) => !emailRegex.test(e));
    if (invalidEmails.length > 0) {
      await Swal.fire({
        title: 'Email Committer Tidak Valid',
        text: `Email berikut tidak valid: ${invalidEmails.join(', ')}. Pisahkan beberapa email dengan koma (,) dan perbaiki sebelum generate timesheet.`,
        icon: 'error',
        confirmButtonText: 'OK',
      });
      return;
    }

    const hasAzure = payload.adoOrg && payload.adoProject && emails.length > 0 && payload.azurePat;
    const hasJira = !!payload.jiraToken;

    if (payload.autoFillFromExternal && !hasAzure && !hasJira) {
      await Swal.fire({
        title: 'Tidak Ada Sumber Data Eksternal',
        text: 'Auto-fill diaktifkan tetapi tidak ada Azure DevOps atau Jira yang dikonfigurasi. Aktivitas akan kosong.',
        icon: 'info',
        confirmButtonText: 'OK',
      });
    }

    if (new Date(startDate) > new Date(endDate)) {
      await Swal.fire({
        title: 'Tanggal Tidak Valid',
        text: 'Tanggal Mulai tidak boleh lebih besar dari Tanggal Selesai.',
        icon: 'error',
        confirmButtonText: 'OK',
      });
      return;
    }

    setLoading(true);
    try {
      const configWithTokens: Config = {
        company: payload.company,
        adoOrg: payload.adoOrg,
        adoProject: payload.adoProject,
        adoEmail: payload.adoEmail,
        azurePat: payload.azurePat,
        startDate,
        endDate,
        autoFillFromExternal: payload.autoFillFromExternal,
        jiraToken: payload.jiraToken,
      };

      const result = await generateTimesheetData(configWithTokens);

      const commitsAsWorkItems = result.allCommits.map((c: any, idx: number) => ({
        id: `ado-${idx}`,
        source: 'azure' as const,
        label: c.repoName || '',
        text: c.comment || '',
        date: new Date(c.author.date),
        repoName: c.repoName,
        projectName: c.projectName,
      }));

      const tasksAsWorkItems = result.allTasks.map((t: any, idx: number) => ({
        id: `jira-${idx}`,
        source: 'jira' as const,
        label: `[${t.key}]`,
        text: t.fields?.summary || '',
        date: new Date(t.fields?.updated),
      }));

      setAllCommits(commitsAsWorkItems);
      setAllTasks(tasksAsWorkItems);
      setRecords({ records: result.records, jiraTokenExpired: result.jiraTokenExpired });
    } catch (e: any) {
      await Swal.fire({
        title: 'Terjadi Kesalahan',
        text: e.message || 'Gagal memproses data.',
        icon: 'error',
        confirmButtonText: 'OK',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!payload) return;
    if (!payload.employeeInfo.nik || !payload.employeeInfo.nama) {
      await Swal.fire({
        title: 'Data Tidak Lengkap',
        text: 'Harap lengkapi NIK dan Nama sebelum export.',
        icon: 'warning',
        confirmButtonText: 'OK',
      });
      return;
    }
    if (payload.employeeInfo.company !== 'ENIGMA') {
      await Swal.fire({
        title: 'Tidak Tersedia',
        text: 'Export Excel hanya tersedia untuk company ENIGMA.',
        icon: 'warning',
        confirmButtonText: 'OK',
      });
      return;
    }
    const exporter = getExcelExporter(payload.employeeInfo.company as 'ENIGMA');
    await exporter.generate(
      records.records,
      payload.employeeInfo,
      payload.signatureData,
      startDate,
      endDate
    );
  };

  const handleExportWord = async () => {
    if (!payload) return;
    if (!payload.employeeInfo.nik || !payload.employeeInfo.nama) {
      await Swal.fire({
        title: 'Data Tidak Lengkap',
        text: 'Harap lengkapi NIK dan Nama sebelum export.',
        icon: 'warning',
        confirmButtonText: 'OK',
      });
      return;
    }
    if (payload.employeeInfo.company !== 'KOBUS') {
      await Swal.fire({
        title: 'Tidak Tersedia',
        text: 'Export Word hanya tersedia untuk company KOBUS.',
        icon: 'warning',
        confirmButtonText: 'OK',
      });
      return;
    }
    const logo = await loadKobusLogo();
    const exporter = getWordExporter('KOBUS');
    const exportData = await buildExportPayload(
      'KOBUS',
      records.records,
      payload.employeeInfo,
      logo,
      payload.signatureData?.imageData
    );
    await exporter.generate(exportData);
  };

  const handleAddWork = (text: string, recordIndex: number) => {
    const record = records.records[recordIndex];
    if (!record) return;
    const existing = record.editableActivity || '';
    const newActivity = existing ? `${existing}\n${text}` : text;
    setRecords((prev) => {
      const newRecords = [...prev.records];
      newRecords[recordIndex] = { ...newRecords[recordIndex], editableActivity: newActivity };
      return { ...prev, records: newRecords };
    });
  };

  // ============================================================================
  // GATE - If not unlocked, show passphrase gate
  // ============================================================================
  if (!cryptoKey || !payload) {
    return (
      <PassphraseGate
        onUnlock={handleUnlock}
        migrationPayload={migrationPayload ?? undefined}
        onMigrationComplete={handleMigrationComplete}
      />
    );
  }

  // Build a Config view for the panel (startDate/endDate are local state)
  const config: Config = {
    company: payload.company,
    adoOrg: payload.adoOrg,
    adoProject: payload.adoProject,
    adoEmail: payload.adoEmail,
    azurePat: payload.azurePat,
    startDate,
    endDate,
    autoFillFromExternal: payload.autoFillFromExternal,
    jiraToken: payload.jiraToken,
  };

  return (
    <div className="min-h-screen bg-[#F8F7F3] text-[#3C3A36] py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-[#A4B494] selection:text-white">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* OAuth Error Alert */}
        {oauthError && (
          <div className="bg-[#FBF5F2] border border-[#D7B5AB] rounded-3xl p-4 flex items-start justify-between">
            <p className="text-sm text-[#7C3F35]">{oauthError}</p>
            <button
              onClick={() => setOauthError(null)}
              className="text-[#9C5C4F] hover:text-[#7C3F35]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8">
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-serif italic text-[#3E3D39] tracking-tight sm:text-5xl">
              Kala
            </h1>
            <p className="mt-4 max-w-2xl mx-auto md:mx-0 text-xs uppercase tracking-widest text-[#9A958A] font-semibold">
              Otomatisasi pembuatan timesheet dari Azure DevOps commits dan Jira Issues
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-sm border ${
                showHelp
                  ? 'bg-[#5A6355] text-white border-[#5A6355]'
                  : 'bg-white text-[#5A6355] border-[#E5E2D9] hover:bg-[#F8F7F3]'
              }`}
            >
              {showHelp ? (
                <X className="w-4 h-4" />
              ) : (
                <HelpCircle className="w-4 h-4 text-[#A4B494]" />
              )}
              {showHelp ? 'Tutup Panduan' : 'Butuh Bantuan?'}
            </button>
            <button
              onClick={handleLock}
              title="Kunci sesi (data tetap tersimpan terenkripsi)"
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-sm border bg-white text-[#5A6355] border-[#E5E2D9] hover:bg-[#F8F7F3]"
            >
              <Lock className="w-4 h-4 text-[#A4B494]" />
              Lock
            </button>
          </div>
        </div>

        {/* Help Panel */}
        {showHelp && <HelpPanel />}

        <ConfigurationPanel
          config={config}
          onChange={handleConfigChange}
          onGenerate={handleGenerate}
          onClearData={handleClearSavedData}
          loading={loading}
          jiraToken={payload.jiraToken}
          onJiraLogin={handleJiraLogin}
          onJiraLogout={handleJiraLogout}
          jiraLoginLoading={jiraLoginLoading}
          employeeInfo={payload.employeeInfo}
          onEmployeeInfoChange={handleEmployeeInfoChange}
          signatureData={payload.signatureData}
          onOpenSignatureModal={() => setShowSignatureModal(true)}
          forceEmployeeFormOpen={forceEmployeeFormOpen}
          onChangePassphrase={() => setChangePpOpen(true)}
        />

        {/* Results */}
        {records.records.length > 0 && (
          <PreviewSection
            records={records.records}
            onUpdateRecord={handleUpdateRecord}
            configStartDate={startDate}
            configEndDate={endDate}
            jiraTokenExpired={records.jiraTokenExpired}
            employeeInfo={payload.employeeInfo}
            signatureData={payload.signatureData}
            onExportExcel={handleExport}
            onExportWord={handleExportWord}
            onExportPDF={() =>
              exportToPDF(
                records.records,
                startDate,
                endDate,
                payload.employeeInfo,
                payload.signatureData
              )
            }
            allCommits={allCommits}
            allTasks={allTasks}
            onAddWork={handleAddWork}
          />
        )}

        {/* Signature Input Modal */}
        <SignatureInput
          isOpen={showSignatureModal}
          onClose={() => setShowSignatureModal(false)}
          onSave={handleSignatureSave}
          existingSignature={payload.signatureData}
        />

        {/* Email Template Section */}
        {records.records.length > 0 && (
          <EmailTemplateSection
            employeeInfo={payload.employeeInfo}
            startDate={startDate}
            endDate={endDate}
            templates={payload.emailTemplates}
            onTemplatesChange={handleTemplatesChange}
          />
        )}
      </div>

      {/* Change Passphrase Modal */}
      <PassphrasePrompt
        isOpen={changePpOpen}
        onClose={() => setChangePpOpen(false)}
        onChange={handleChangePassphrase}
        busy={changePpBusy}
      />
    </div>
  );
}
