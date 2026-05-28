import { Database, Lock, ShieldCheck, Users } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F8F7F3] text-[#3C3A36] py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-[#A4B494] selection:text-white">
      <div className="max-w-3xl mx-auto space-y-12 pt-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <Link
            href="/"
            className="inline-block text-xs uppercase tracking-widest text-[#9A958A] font-semibold hover:text-[#A4B494] transition-colors"
          >
            &larr; Back to App
          </Link>
          <h1 className="text-4xl font-serif italic text-[#3E3D39] tracking-tight sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="text-xs uppercase tracking-widest text-[#9A958A] font-semibold">
            Auto Timesheet Generator &bull; Last Updated: May 17, 2026
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-[40px] border border-[#E5E2D9] shadow-sm p-8 md:p-10 space-y-10">
          {/* Introduction */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-[#A4B494] p-2 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-serif italic text-[#3E3D39]">Introduction</h2>
            </div>
            <div className="text-sm text-[#5A6355] leading-relaxed space-y-4">
              <p>
                Auto Timesheet Generator (&ldquo;the App&rdquo;) is a client-side web application
                that helps you generate timesheets from your Azure DevOps commits and Jira issues.
                This Privacy Policy explains how the App handles your data.
              </p>
              <p>
                The App is designed with privacy as a core principle:{' '}
                <strong>all data stays on your device</strong>. We do not collect, store, or
                transmit your personal or credential data to any external server.
              </p>
            </div>
          </section>

          {/* Data We Collect */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-[#5A6355] p-2 rounded-xl">
                <Database className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-serif italic text-[#3E3D39]">Data We Collect</h2>
            </div>
            <div className="text-sm text-[#5A6355] leading-relaxed space-y-4">
              <p>The App may collect and store the following data locally in your browser:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Azure DevOps Personal Access Token (PAT)</strong> &ndash; Used to
                  authenticate with Azure DevOps API to fetch your commit data.
                </li>
                <li>
                  <strong>Jira OAuth Token</strong> &ndash; Used to authenticate with Jira API to
                  fetch your assigned issues (optional).
                </li>
                <li>
                  <strong>Configuration Data</strong> &ndash; Azure DevOps organization, project,
                  email, and date range preferences.
                </li>
                <li>
                  <strong>Timesheet Data</strong> &ndash; Generated timesheet records that you
                  create.
                </li>
              </ul>
              <p>No personal information (name, phone, address, etc.) is collected by this App.</p>
            </div>
          </section>

          {/* How We Use Data */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-[#A4B494] p-2 rounded-xl">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-serif italic text-[#3E3D39]">How We Use Data</h2>
            </div>
            <div className="text-sm text-[#5A6355] leading-relaxed space-y-4">
              <p>
                Your data is used <strong>only</strong> for the following purposes:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Authenticating with Azure DevOps API to retrieve your commit history</li>
                <li>
                  Authenticating with Jira API to retrieve your assigned issues (if connected)
                </li>
                <li>Generating timesheet reports based on your activity data</li>
              </ul>
              <p>
                Your credentials and data are <strong>never</strong> sent to any third-party server
                or analytics service.
              </p>
            </div>
          </section>

          {/* Data Storage */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-[#5A6355] p-2 rounded-xl">
                <Database className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-serif italic text-[#3E3D39]">Data Storage</h2>
            </div>
            <div className="text-sm text-[#5A6355] leading-relaxed space-y-4">
              <p>
                All data is stored exclusively in your browser&apos;s <strong>localStorage</strong>.
                This means:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Data resides on your local device only</li>
                <li>Data is not synchronized across devices</li>
                <li>Data is not accessible via any server or cloud service</li>
                <li>Data persists until you manually delete it or clear your browser data</li>
              </ul>
            </div>
          </section>

          {/* Third-Party Services */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-[#A4B494] p-2 rounded-xl">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-serif italic text-[#3E3D39]">Third-Party Services</h2>
            </div>
            <div className="text-sm text-[#5A6355] leading-relaxed space-y-4">
              <p>The App interacts with these third-party APIs:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Azure DevOps API</strong> (dev.azure.com) &ndash; Used to fetch your
                  commits and generate timesheet data
                </li>
                <li>
                  <strong>Jira API</strong> (atlassian.net) &ndash; Used to fetch your assigned
                  issues for timesheet generation
                </li>
              </ul>
              <p>
                When you use these services, your data is exchanged directly between your browser
                and the respective third-party API. The App acts solely as an intermediary and does
                not store or process this data on any server.
              </p>
            </div>
          </section>

          {/* Data Security */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-[#5A6355] p-2 rounded-xl">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-serif italic text-[#3E3D39]">Data Security</h2>
            </div>
            <div className="text-sm text-[#5A6355] leading-relaxed space-y-4">
              <p>You have full control over your data:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>All data is stored locally in your browser&apos;s localStorage</li>
                <li>
                  You can delete all stored data at any time using the &ldquo;Delete Data&rdquo;
                  button in the app
                </li>
                <li>You can also clear data via your browser&apos;s developer tools or settings</li>
                <li>No data is encrypted server-side since it never leaves your device</li>
              </ul>
              <div className="bg-[#E7F5E4] border border-[#5A6355]/20 rounded-2xl p-4">
                <p className="font-semibold text-[#5A6355] mb-2">Recommended Security Practices:</p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-[#5A6355]">
                  <li>Do not share your PAT or OAuth tokens with anyone</li>
                  <li>Consider using token expiration dates where supported</li>
                  <li>Revoke tokens when no longer needed</li>
                  <li>Clear browser data when using shared or public computers</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="space-y-4 border-t border-[#E5E2D9] pt-8">
            <div className="flex items-center gap-3">
              <div className="bg-[#A4B494] p-2 rounded-xl">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-serif italic text-[#3E3D39]">Contact</h2>
            </div>
            <div className="text-sm text-[#5A6355] leading-relaxed space-y-4">
              <p>
                If you have any questions about this Privacy Policy or how the App handles your
                data, please reach out to https://github.com/rizkyliandika.
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-[#9A958A]">
          <p>&copy; 2026 Auto Timesheet Generator. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
