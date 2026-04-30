import React from 'react';
import { HelpCircle, ExternalLink, ShieldCheck, Key } from 'lucide-react';

export const HelpPanel: React.FC = () => {
  return (
    <div className="bg-white rounded-[40px] border border-[#E5E2D9] shadow-sm p-8 md:p-10 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="border-b border-[#E5E2D9] pb-6">
        <h2 className="text-3xl font-serif italic text-[#3E3D39] flex items-center gap-3">
          <HelpCircle className="w-8 h-8 text-[#A4B494]" />
          Panduan Mendapatkan Token
        </h2>
        <p className="text-xs uppercase tracking-widest text-[#9A958A] mt-2 font-semibold">
          Ikuti langkah-langkah di bawah ini untuk menghubungkan akun kamu
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Azure DevOps Help */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-[#5A6355] p-2 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-serif italic text-[#3E3D39]">Azure DevOps (PAT)</h3>
          </div>
          
          <div className="space-y-4 text-sm text-[#5A6355] leading-relaxed">
            <p>Personal Access Token (PAT) digunakan sebagai pengganti password untuk aplikasi ini mengakses commit kamu.</p>
            <ol className="list-decimal pl-5 space-y-3 marker:font-bold">
              <li>Masuk ke akun <span className="font-bold">Azure DevOps</span> kamu.</li>
              <li>Klik ikon <span className="font-bold underline italic">User Settings</span> di pojok kanan atas (samping foto profil).</li>
              <li>Pilih menu <span className="font-bold italic">Personal Access Tokens</span>.</li>
              <li>Klik tombol <span className="font-bold text-[#A4B494]">+ New Token</span>.</li>
              <li>Beri nama (misal: "Timesheet Generator").</li>
              <li>Pada bagian <span className="font-bold">Scopes</span>, pilih <span className="font-bold">Custom Defined</span>.</li>
              <li>Cari <span className="font-bold">Code</span> dan centang <span className="font-bold">Read</span>. Ini cukup untuk membaca commit.</li>
              <li>Klik <span className="font-bold italic uppercase tracking-tighter">Create</span>.</li>
              <li className="text-[#B8865D] font-medium bg-[#E7AB79]/10 p-2 rounded-lg border border-[#E7AB79]/20">
                Salin token tersebut sekarang! Azure tidak akan menampilkannya lagi.
              </li>
            </ol>
            <a 
              href="https://dev.azure.com/" 
              target="_blank" 
              className="inline-flex items-center text-[#A4B494] font-bold hover:underline gap-1 text-xs uppercase"
            >
              Buka Azure DevOps <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Jira Help */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-[#A4B494] p-2 rounded-xl">
              <Key className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-serif italic text-[#3E3D39]">Jira API Token</h3>
          </div>

          <div className="space-y-4 text-sm text-[#5A6355] leading-relaxed">
            <p>Untuk Jira Cloud (Atlassian), kamu memerlukan API Token khusus akun Atlassian kamu.</p>
            <ol className="list-decimal pl-5 space-y-3 marker:font-bold">
              <li>Masuk ke <span className="font-bold italic underline">Atlassian Security Settings</span> melalui link di bawah.</li>
              <li>Klik tombol <span className="font-bold text-[#A4B494]">Create API token</span>.</li>
              <li>Beri label (misal: "Timesheet Generator").</li>
              <li>Klik <span className="font-bold uppercase tracking-tighter italic">Create</span>.</li>
              <li className="text-[#B8865D] font-medium bg-[#E7AB79]/10 p-2 rounded-lg border border-[#E7AB79]/20">
                Salin API token tersebut segera. Token ini akan digunakan bersama email akun Jira kamu.
              </li>
              <li>Pastikan <span className="font-bold italic">Jira Domain</span> sesuai (misal: "nama-perusahaan.atlassian.net").</li>
            </ol>
            <a 
              href="https://id.atlassian.com/manage-profile/security/api-tokens" 
              target="_blank" 
              className="inline-flex items-center text-[#A4B494] font-bold hover:underline gap-1 text-xs uppercase"
            >
              Buka Atlassian Security <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
