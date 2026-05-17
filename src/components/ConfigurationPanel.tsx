import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Config, OAuthToken, ADOProject } from '../lib/types';
import { Settings2, Link2, Calendar, LogIn, CheckCircle, LogOut, ChevronDown, Check, Loader2, AlertTriangle } from 'lucide-react';
import * as api from '@/lib/api';

interface Props {
  config: Config;
  onChange: (key: keyof Config, value: any) => void;
  onGenerate: () => void;
  loading: boolean;
  jiraToken?: OAuthToken;
  onJiraLogin: () => void;
  onJiraLogout: () => void;
  jiraLoginLoading?: boolean;
}

type JiraStatus = 'checking' | 'valid' | 'invalid' | 'disconnected';

export const ConfigurationPanel: React.FC<Props> = ({ 
  config, 
  onChange, 
  onGenerate, 
  loading,
  jiraToken,
  onJiraLogin,
  onJiraLogout,
  jiraLoginLoading = false
}) => {
  // ADO state
  const [projects, setProjects] = useState<ADOProject[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>(
    config.adoProject ? config.adoProject.split(',').map(p => p.trim()).filter(Boolean) : []
  );
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  // Jira status state
  const [jiraStatus, setJiraStatus] = useState<JiraStatus>('disconnected');

  // Check Jira token health on mount and when token changes
  useEffect(() => {
    const checkJiraHealth = async () => {
      if (!jiraToken?.access_token) {
        setJiraStatus('disconnected');
        return;
      }

      setJiraStatus('checking');
      try {
        const res = await fetch('/api/jira/health', {
          headers: {
            Authorization: `Bearer ${jiraToken.access_token}`,
          },
        });
        const data = await res.json();
        setJiraStatus(data.valid ? 'valid' : 'invalid');
      } catch {
        setJiraStatus('invalid');
      }
    };

    checkJiraHealth();
  }, [jiraToken]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setProjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-fetch projects when org or PAT changes (including on mount)
  useEffect(() => {
    if (config.adoOrg && config.azurePat) {
      fetchProjects(config.adoOrg, config.azurePat);
    } else {
      setProjects([]);
      setSelectedProjects([]);
    }
  }, [config.adoOrg, config.azurePat]);

  // Fetch projects when org or PAT changes
  const fetchProjects = useCallback(async (org: string, pat: string) => {
    if (!org || !pat) {
      setProjects([]);
      return;
    }
    setLoadingProjects(true);
    setProjectsError(null);
    try {
      const projList = await api.getAdoProjects(pat, org);
      setProjects(projList);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to fetch projects';
      setProjectsError(errorMsg);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  // Handle PAT change
  const handlePatChange = (value: string) => {
    onChange('azurePat', value);
    if (!value) {
      setProjects([]);
      setSelectedProjects([]);
      onChange('adoProject', '');
    }
  };

  // Handle org change
  const handleOrgChange = (value: string) => {
    onChange('adoOrg', value);
    onChange('adoProject', '');
    setSelectedProjects([]);
  };

  // Handle project toggle (multiselect)
  const handleProjectToggle = (projectName: string) => {
    const newSelected = selectedProjects.includes(projectName)
      ? selectedProjects.filter(p => p !== projectName)
      : [...selectedProjects, projectName];
    setSelectedProjects(newSelected);
    onChange('adoProject', newSelected.join(','));
  };

  return (
    <div className="bg-white rounded-[40px] border border-[#E5E2D9] shadow-sm p-8 md:p-10 space-y-10">
      
      {/* Date Range Selection */}
      <div>
        <h3 className="flex items-center text-sm uppercase tracking-widest font-bold text-[#8E897E] mb-6 pb-4 border-b border-[#E5E2D9]">
          <Calendar className="w-5 h-5 mr-3 text-[#A4B494]" />
          Periode Timesheet
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] uppercase font-bold text-[#9A958A] mb-2 tracking-wider">Tanggal Mulai</label>
            <input
              type="date"
              title="Pilih Tanggal Mulai"
              value={config.startDate}
              onChange={(e) => onChange('startDate', e.target.value)}
              className="w-full rounded-2xl border-[#E5E2D9] bg-[#F8F7F3] focus:border-[#A4B494] focus:ring-[#A4B494] sm:text-sm p-3.5 border outline-none text-[#3E3D39]"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-[#9A958A] mb-2 tracking-wider">Tanggal Selesai</label>
            <input
              type="date"
              title="Pilih Tanggal Selesai"
              value={config.endDate}
              onChange={(e) => onChange('endDate', e.target.value)}
              className="w-full rounded-2xl border-[#E5E2D9] bg-[#F8F7F3] focus:border-[#A4B494] focus:ring-[#A4B494] sm:text-sm p-3.5 border outline-none text-[#3E3D39]"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Azure DevOps Section */}
        <div>
          <h3 className="flex items-center text-sm uppercase tracking-widest font-bold text-[#8E897E] mb-6 pb-4 border-b border-[#E5E2D9]">
            <Link2 className="w-5 h-5 mr-3 text-[#5A6355]" />
            Azure DevOps (Utama)
          </h3>
          <div className="space-y-5">
            {/* 1. PAT Field */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#9A958A] mb-2 tracking-wider">Personal Access Token (PAT)</label>
              <input
                type="password"
                value={config.azurePat}
                onChange={(e) => handlePatChange(e.target.value)}
                placeholder="Paste your Azure DevOps PAT"
                className="w-full rounded-2xl border-[#E5E2D9] bg-[#F8F7F3] placeholder-[#D4CFC4] focus:border-[#A4B494] focus:ring-[#A4B494] sm:text-sm p-3.5 border outline-none text-[#3E3D39]"
              />
            </div>

            {/* 2. Committer Field */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#9A958A] mb-2 tracking-wider">Email Committer</label>
              <input
                type="email"
                value={config.adoEmail}
                onChange={e => onChange('adoEmail', e.target.value)}
                placeholder="email@company.com"
                className="w-full rounded-2xl border-[#E5E2D9] bg-[#F8F7F3] placeholder-[#D4CFC4] focus:border-[#A4B494] focus:ring-[#A4B494] sm:text-sm p-3.5 border outline-none text-[#3E3D39]"
              />
            </div>

            {/* 3. Organization - Text Input */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#9A958A] mb-2 tracking-wider">Organization</label>
              <input
                type="text"
                value={config.adoOrg}
                onChange={e => handleOrgChange(e.target.value)}
                placeholder="mycompany"
                className="w-full rounded-2xl border-[#E5E2D9] bg-[#F8F7F3] placeholder-[#D4CFC4] focus:border-[#A4B494] focus:ring-[#A4B494] sm:text-sm p-3.5 border outline-none text-[#3E3D39]"
              />
            </div>

            {/* 4. Project Dropdown (Multiselect) */}
            <div ref={projectDropdownRef}>
              <label className="block text-[10px] uppercase font-bold text-[#9A958A] mb-2 tracking-wider">Projects</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                  disabled={!config.adoOrg || !config.azurePat || loadingProjects}
                  className="w-full rounded-2xl border-[#E5E2D9] bg-[#F8F7F3] focus:border-[#A4B494] focus:ring-[#A4B494] sm:text-sm p-3.5 border outline-none text-left text-[#3E3D39] flex items-center justify-between disabled:bg-[#EFEDE7] disabled:cursor-not-allowed disabled:text-[#9A958A]"
                >
                  <span className={selectedProjects.length ? '' : 'text-[#D4CFC4]'}>
                    {loadingProjects ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading projects...
                      </span>
                    ) : selectedProjects.length > 0 
                      ? `${selectedProjects.length} project(s) selected`
                      : 'Select projects'}
                  </span>
                  {config.adoOrg && config.azurePat && (
                    <ChevronDown className={`w-4 h-4 text-[#9A958A] transition-transform ${projectDropdownOpen ? 'rotate-180' : ''}`} />
                  )}
                </button>

                {projectDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white rounded-2xl border border-[#E5E2D9] shadow-lg max-h-60 overflow-auto">
                    {projects.length === 0 && !loadingProjects && (
                      <div className="p-3 text-sm text-[#9A958A]">
                        {projectsError || 'No projects found'}
                      </div>
                    )}
                    {projects.map((project) => (
                      <label
                        key={project.id}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[#F8F7F3] ${
                          selectedProjects.includes(project.name) ? 'bg-[#F8F7F3]' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedProjects.includes(project.name)}
                          onChange={() => handleProjectToggle(project.name)}
                          className="w-4 h-4 rounded border-[#E5E2D9] text-[#A4B494] focus:ring-[#A4B494]"
                        />
                        <span className="text-sm text-[#3E3D39]">{project.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Jira Section */}
        <div>
          <h3 className="flex items-center text-sm uppercase tracking-widest font-bold text-[#8E897E] mb-6 pb-4 border-b border-[#E5E2D9]">
            <Settings2 className="w-5 h-5 mr-3 text-[#A4B494]" />
            Jira (Opsional)
          </h3>
          <div className="space-y-5">
            {/* Jira OAuth Status */}
            {jiraStatus === 'checking' && (
              <div className="bg-[#F8F7F3] border border-[#E5E2D9] rounded-2xl p-4 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#9A958A]" />
                <span className="text-sm text-[#9A958A]">Checking Jira connection...</span>
              </div>
            )}
            {jiraStatus === 'valid' && (
              <div className="bg-[#E7F5E4] border border-[#5A6355]/20 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#5A6355]" />
                  <span className="text-sm font-semibold text-[#5A6355]">Connected to Jira</span>
                </div>
                <button
                  onClick={onJiraLogout}
                  className="text-xs font-bold text-[#5A6355] hover:underline flex items-center gap-1"
                >
                  <LogOut className="w-3 h-3" />
                  Disconnect
                </button>
              </div>
            )}
            {jiraStatus === 'invalid' && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-700">Jira needs re-authentication</span>
                </div>
                <button
                  onClick={onJiraLogin}
                  disabled={jiraLoginLoading}
                  className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1"
                >
                  <LogIn className="w-3 h-3" />
                  Reconnect
                </button>
              </div>
            )}
            {jiraStatus === 'disconnected' && (
              <button
                onClick={onJiraLogin}
                disabled={jiraLoginLoading}
                className="w-full px-4 py-3 rounded-2xl bg-[#A4B494] text-white text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#94A484] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {jiraLoginLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Sign in with Jira
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="pt-8 mb-0 flex justify-end">
        <button
          onClick={onGenerate}
          disabled={loading}
          className="inline-flex items-center px-8 py-3.5 border border-transparent text-sm uppercase tracking-wider font-bold rounded-full shadow-md text-[#F8F7F3] bg-[#5A6355] hover:bg-[#4A5246] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#F8F7F3]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Memproses Data...
            </>
          ) : (
            'Generate Timesheet'
          )}
        </button>
      </div>
      <div id="preview"></div>
    </div>
  );
};
