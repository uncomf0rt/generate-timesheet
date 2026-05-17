import React from 'react';
import Link from 'next/link';
import { HelpCircle, ExternalLink, ShieldCheck, Key } from 'lucide-react';

export const HelpPanel: React.FC = () => {
  return (
    <div className="bg-white rounded-[40px] border border-[#E5E2D9] shadow-sm p-8 md:p-10 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="border-b border-[#E5E2D9] pb-6">
        <h2 className="text-3xl font-serif italic text-[#3E3D39] flex items-center gap-3">
          <HelpCircle className="w-8 h-8 text-[#A4B494]" />
          Panduan Autentikasi
        </h2>
        <p className="text-xs uppercase tracking-widest text-[#9A958A] mt-2 font-semibold">
          Aplikasi ini menggunakan PAT untuk Azure DevOps dan OAuth 2.0 untuk Jira
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Azure DevOps Help */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-[#5A6355] p-2 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-serif italic text-[#3E3D39]">Azure DevOps PAT</h3>
          </div>
          
          <div className="space-y-4 text-sm text-[#5A6355] leading-relaxed">
            <p>Gunakan Personal Access Token (PAT) untuk memberikan akses aman ke Azure DevOps tanpa menyimpan password Anda.</p>
            
            <div className="bg-[#E7F5E4] border border-[#5A6355]/20 rounded-2xl p-4">
              <p className="font-semibold text-[#5A6355] mb-3">Cara Membuat PAT:</p>
              <ol className="list-decimal pl-5 space-y-2 text-xs marker:font-bold">
                <li>Buka <span className="font-bold">Azure DevOps</span> di <a href="https://dev.azure.com/" target="_blank" className="text-[#A4B494] hover:underline">dev.azure.com</a></li>
                <li>Klik foto profil Anda di kanan atas</li>
                <li>Pilih <span className="font-bold">Personal access tokens</span></li>
                <li>Klik <span className="font-bold">+ New Token</span></li>
                <li>Isi nama token (misal: "Timesheet Generator")</li>
                <li>Pilih <span className="font-bold">Organization: All accessible organizations</span></li>
                <li>Di bawah <span className="font-bold">Scopes</span>, pilih <span className="font-bold">Read &amp; execute</span> untuk Code</li>
                <li>Klik <span className="font-bold">Create</span> dan copy token yang dihasilkan</li>
                <li>Paste token ke kolom PAT di Configuration Panel</li>
              </ol>
            </div>
            
            <p className="text-xs text-[#B8865D] bg-[#E7AB79]/10 p-3 rounded-lg border border-[#E7AB79]/20">
              <span className="font-semibold">⚠️ Penting:</span> Jangan bagikan PAT Anda kepada orang lain. Disarankan untuk membuat PAT baru setiap kali diperlukan, atau atur expiration date agar otomatis hangus.
            </p>
            
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
            <h3 className="text-xl font-serif italic text-[#3E3D39]">Jira OAuth (Opsional)</h3>
          </div>

          <div className="space-y-4 text-sm text-[#5A6355] leading-relaxed">
            <p>Hubungkan Jira Cloud untuk mendapatkan data task yang ditugaskan kepada Anda.</p>
            
            <div className="bg-[#E7F5E4] border border-[#5A6355]/20 rounded-2xl p-4">
              <p className="font-semibold text-[#5A6355] mb-2">Cara Menggunakan:</p>
              <ol className="list-decimal pl-5 space-y-2 text-xs marker:font-bold">
                <li>Klik tombol <span className="font-bold">"Sign in with Jira"</span> di Configuration Panel</li>
                <li>Anda akan diarahkan ke Atlassian Login</li>
                <li>Masuk dengan akun Atlassian Anda</li>
                <li>Setujui permintaan akses ke Jira</li>
                <li>Aplikasi akan mendapatkan token akses secara otomatis</li>
              </ol>
            </div>

            <div className="bg-[#FFF4E6] border border-[#E7AB79]/30 rounded-2xl p-4">
              <p className="text-xs text-[#5A6355] mb-2"><span className="font-semibold">Persyaratan:</span></p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-[#5A6355]">
                <li>Pastikan domain Jira Anda benar (misal: company.atlassian.net)</li>
                <li>Koneksi Jira bersifat opsional - Anda tetap bisa membuat timesheet tanpa Jira</li>
              </ul>
            </div>
            
            <a 
              href="https://www.atlassian.com/software/jira" 
              target="_blank" 
              className="inline-flex items-center text-[#A4B494] font-bold hover:underline gap-1 text-xs uppercase"
            >
              Pelajari Jira Cloud <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Security Info */}
      <div className="border-t border-[#E5E2D9] pt-8">
        <h3 className="text-lg font-serif italic text-[#3E3D39] mb-4">Keamanan & Privasi</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-[#5A6355]">
          <div className="bg-[#F8F7F3] rounded-2xl p-4">
            <p className="font-semibold mb-2">✓ Terenkripsi</p>
            <p className="text-xs">Token disimpan dengan aman di browser Anda, bukan di server.</p>
          </div>
          <div className="bg-[#F8F7F3] rounded-2xl p-4">
            <p className="font-semibold mb-2">✓ Terkontrol</p>
            <p className="text-xs">Anda dapat memutuskan koneksi kapan saja dengan klik "Disconnect".</p>
          </div>
          <div className="bg-[#F8F7F3] rounded-2xl p-4">
            <p className="font-semibold mb-2">✓ Minimal Access</p>
            <p className="text-xs">Aplikasi hanya meminta izin yang diperlukan untuk membaca data.</p>
          </div>
        </div>
        <div className="mt-6 text-center">
          <Link
            href="/privacy"
            className="inline-flex items-center text-xs uppercase tracking-widest text-[#9A958A] font-semibold hover:text-[#A4B494] transition-colors gap-1"
          >
            Lihat Privacy Policy <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
};
