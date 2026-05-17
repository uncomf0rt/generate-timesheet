"use client";
import React, { useState, useEffect } from "react";
import { ConfigurationPanel } from "@/components/ConfigurationPanel";
import { ResultTable } from "@/components/ResultTable";
import { HelpPanel } from "@/components/HelpPanel";
import { OAuthCallback } from "@/components/OAuthCallback";
import { Config, DayRecord, OAuthToken } from "@/lib/types";
import { generateTimesheetData } from "@/lib/generator";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";
import { retrieveTokens, clearTokens } from "@/lib/oauthUtils";
import * as api from "@/lib/api";
import { DownloadCloud, FileText, HelpCircle, X, Trash2 } from "lucide-react";
import { format, subDays, parseISO } from "date-fns";
import { id } from "date-fns/locale";

export default function App() {
  // Jira OAuth Token Management
  const [jiraToken, setJiraToken] = useState<OAuthToken | undefined>();
  const [jiraLoginLoading, setJiraLoginLoading] = useState(false);
  const [oauthCallbackData, setOAuthCallbackData] = useState<{
    service: "jira";
    state: string;
  } | null>(null);
  const [oauthError, setOAuthError] = useState<string | null>(null);

  // Configuration & Data
  const [config, setConfig] = useState<Config>(() => {
    // Mencegah error 'localStorage is not defined' saat Server-Side Rendering (SSR)
    const savedConfig = typeof window !== "undefined" ? localStorage.getItem("timesheet-config") : null;
    const parsedConfig = savedConfig ? JSON.parse(savedConfig) : {};

    return {
      adoOrg: parsedConfig.adoOrg || "",
      adoProject: parsedConfig.adoProject || "",
      adoEmail: parsedConfig.adoEmail || "",
      azurePat: parsedConfig.azurePat || "",
      startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
      endDate: format(new Date(), "yyyy-MM-dd"),
    };
  });

  const [records, setRecords] = useState<DayRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [jiraTokenExpired, setJiraTokenExpired] = useState(false);

  // Smooth scroll to results when records are loaded
  useEffect(() => {
    if (records.length > 0) {
      document.getElementById('preview')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [records.length]);

  // Initialize Jira token from storage on component mount
  useEffect(() => {
    const { jiraToken: savedJiraToken } = retrieveTokens();
    if (savedJiraToken) setJiraToken(savedJiraToken);
  }, []);

  // Handle OAuth callback from URL parameters (Backend-only flow)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jiraToken = params.get("jira_token");

    if (jiraToken) {
      const parsed = JSON.parse(decodeURIComponent(jiraToken));
      localStorage.setItem("jira_token", JSON.stringify(parsed));

      window.history.replaceState({}, document.title, "/");
      window.location.reload();
    }
  }, []);

  // Handle OAuth callback completion
  const handleOAuthSuccess = (service: "azure" | "jira") => {
    const { jiraToken: newJiraToken } = retrieveTokens();

    if (service === "jira" && newJiraToken) {
      setJiraToken(newJiraToken);
    }

    setOAuthCallbackData(null);
    setOAuthError(null);
  };

  const handleOAuthError = (error: string) => {
    setOAuthError(error);
    setOAuthCallbackData(null);
  };

  // Jira OAuth Login Handler
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

  const handleJiraLogout = () => {
    setJiraToken(undefined);
    clearTokens();
  };

  // Update config
  useEffect(() => {
    const { startDate, endDate, ...configToSave } = config;
    localStorage.setItem("timesheet-config", JSON.stringify(configToSave));
  }, [config]);

  const handleChange = (key: keyof Config, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpdateRecord = (
    index: number,
    field: keyof DayRecord,
    value: any,
  ) => {
    setRecords((prev) => {
      const newRecords = [...prev];
      newRecords[index] = { ...newRecords[index], [field]: value };
      return newRecords;
    });
  };

  const handleClearSavedData = () => {
    if (
      window.confirm(
        "Apakah Anda yakin ingin menghapus data kredensial yang tersimpan?",
      )
    ) {
      localStorage.removeItem("timesheet-config");
      clearTokens();
      setJiraToken(undefined);
      setConfig({
        adoOrg: "",
        adoProject: "",
        adoEmail: "",
        azurePat: "",
        startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
        endDate: format(new Date(), "yyyy-MM-dd"),
      });
    }
  };

  const handleGenerate = async () => {
    // Validate minimally
    if (
      !config.adoOrg ||
      !config.adoProject ||
      !config.adoEmail ||
      !config.azurePat
    ) {
      alert(
        "Harap lengkapi semua isian Azure DevOps (Organization, Project, Email, dan PAT).",
      );
      return;
    }

    const projects = config.adoProject.split(',').map(p => p.trim()).filter(Boolean);
    if (projects.length === 0) {
      alert("Harap pilih minimal satu Project.");
      return;
    }

    // Validate dates
    if (new Date(config.startDate) > new Date(config.endDate)) {
      alert("Tanggal Mulai tidak boleh lebih besar dari Tanggal Selesai.");
      return;
    }

    setLoading(true);
    setJiraTokenExpired(false);
    try {
      // Pass Jira token if available
      const configWithTokens: Config = {
        ...config,
        jiraToken: jiraToken || undefined,
      };

      const { records: newRecords, jiraTokenExpired: expired } = await generateTimesheetData(configWithTokens);
      setRecords(newRecords);
      setJiraTokenExpired(expired);
    } catch (e: any) {
      alert("Terjadi kesalahan: " + (e.message || "Gagal memproses data."));
    } finally {
      setLoading(false);
    }
  };

  // Show OAuth callback handler if needed
  if (oauthCallbackData) {
    return (
      <OAuthCallback
        service={oauthCallbackData.service}
        state={oauthCallbackData.state}
        onSuccess={handleOAuthSuccess}
        onError={handleOAuthError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7F3] text-[#3C3A36] py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-[#A4B494] selection:text-white">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* OAuth Error Alert */}
        {oauthError && (
          <div className="bg-red-50 border border-red-200 rounded-3xl p-4 flex items-start justify-between">
            <p className="text-sm text-red-800">{oauthError}</p>
            <button
              onClick={() => setOAuthError(null)}
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8">
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-serif italic text-[#3E3D39] tracking-tight sm:text-5xl">
              Auto Timesheet Generator
            </h1>
            <p className="mt-4 max-w-2xl mx-auto md:mx-0 text-xs uppercase tracking-widest text-[#9A958A] font-semibold">
              Otomatisasi pembuatan timesheet dari Azure DevOps commits dan Jira
              Issues
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
              {showHelp ? (
                <X className="w-4 h-4" />
              ) : (
                <HelpCircle className="w-4 h-4 text-[#A4B494]" />
              )}
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
          jiraToken={jiraToken}
          onJiraLogin={handleJiraLogin}
          onJiraLogout={handleJiraLogout}
          jiraLoginLoading={jiraLoginLoading}
        />

        {/* Results */}
        {records.length > 0 && (
            <div className="bg-white rounded-[40px] border border-[#E5E2D9] shadow-sm p-8 md:p-10 space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-center border-b border-[#E5E2D9] pb-6 gap-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full">
                  <div>
                    <h2 className="text-2xl font-serif italic text-[#3E3D39]">
                      Preview Timesheet
                    </h2>
                    <p className="text-xs uppercase tracking-widest text-[#9A958A] mt-2 font-semibold">
                      {format(parseISO(config.startDate), "dd MMM yyyy", {
                        locale: id,
                      })}{" "}
                      -{" "}
                      {format(parseISO(config.endDate), "dd MMM yyyy", {
                        locale: id,
                      })}
                    </p>
                  </div>
                  {jiraTokenExpired && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2 text-xs text-amber-700">
                      Jira token expired. Please reconnect to include tasks.
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 shrink-0">
                  <button
                    onClick={() =>
                      exportToPDF(records, config.startDate, config.endDate)
                    }
                    className="px-6 py-2.5 bg-white rounded-full border border-[#E5E2D9] text-xs font-bold uppercase tracking-wider text-[#5A6355] shadow-sm flex items-center gap-2 hover:bg-[#F8F7F3] transition-colors"
                  >
                    <FileText className="w-4 h-4 text-[#B8865D]" />
                    Export PDF
                  </button>
                  <button
                    onClick={() =>
                      exportToExcel(records, config.startDate, config.endDate)
                    }
                    className="px-6 py-2.5 bg-[#5A6355] text-[#F8F7F3] rounded-full text-xs font-bold uppercase tracking-wider shadow-md flex items-center gap-2 hover:bg-[#4A5246] transition-colors"
                  >
                    <DownloadCloud className="w-4 h-4" />
                    Export Excel (.xlsx)
                  </button>
                </div>
              </div>

              <ResultTable
                records={records}
                onUpdateRecord={handleUpdateRecord}
              />
            </div>
        )}
      </div>
    </div>
  );
}
