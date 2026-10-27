'use client';

import {
  AlertTriangle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import {
  clearEnvelope,
  createEnvelope,
  deletePlaintextKeys,
  hasEnvelope,
  type SecurePayload,
  unlockWithPassphrase,
} from '@/lib/secureStorage';

interface Props {
  onUnlock: (key: CryptoKey, payload: SecurePayload) => void;
  /** When set, the gate renders the migration flow (encrypting old plaintext into a new envelope). */
  migrationPayload?: SecurePayload;
  /** Called after a successful migration so the parent can clear its migration state. */
  onMigrationComplete?: () => void;
}

type Mode = 'setup' | 'unlock' | 'migrating';

const MIN_PASSPHRASE_LENGTH = 8;

export function PassphraseGate({ onUnlock, migrationPayload, onMigrationComplete }: Props) {
  const [mode, setMode] = useState<Mode>(() => {
    if (migrationPayload) return 'migrating';
    return hasEnvelope() ? 'unlock' : 'setup';
  });
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetExpanded, setResetExpanded] = useState(false);

  const reset = () => {
    setPassphrase('');
    setConfirm('');
    setError(null);
    setShowPassphrase(false);
    setResetExpanded(false);
  };

  const handleReset = () => {
    clearEnvelope();
    deletePlaintextKeys();
    reset();
    setMode('setup');
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
      setError(`Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters.`);
      return;
    }
    if (passphrase !== confirm) {
      setError('Passphrase and confirmation do not match.');
      return;
    }
    setBusy(true);
    try {
      const { key } = await createEnvelope(passphrase);
      onUnlock(key, {
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
      });
    } catch (_err) {
      setError('Failed to set up encrypted storage. Please try again.');
      setBusy(false);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!passphrase) {
      setError('Please enter your passphrase.');
      return;
    }
    setBusy(true);
    try {
      const unlocked = await unlockWithPassphrase(passphrase);
      if (!unlocked) {
        setError('Wrong passphrase.');
        setPassphrase('');
        setBusy(false);
        return;
      }
      onUnlock(unlocked.key, unlocked.payload);
    } catch {
      setError('Failed to unlock. Please try again.');
      setBusy(false);
    }
  };

  const handleMigrate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!migrationPayload) return;
    setError(null);
    if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
      setError(`Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters.`);
      return;
    }
    if (passphrase !== confirm) {
      setError('Passphrase and confirmation do not match.');
      return;
    }
    setBusy(true);
    try {
      const { key, envelope } = await createEnvelope(passphrase);
      // Encrypt the migrated payload with the same key
      const { savePayload } = await import('@/lib/secureStorage');
      await savePayload(key, migrationPayload);
      deletePlaintextKeys();
      // Discard unused destructure
      void envelope;
      onMigrationComplete?.();
      onUnlock(key, migrationPayload);
    } catch {
      setError('Migration failed. Please try again.');
      setBusy(false);
    }
  };

  const isSetup = mode === 'setup';
  const isMigrating = mode === 'migrating';

  return (
    <div className="min-h-screen bg-[#F8F7F3] text-[#3C3A36] flex items-center justify-center px-4 font-sans">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-[40px] border border-[#E5E2D9] shadow-sm p-8 md:p-10 space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#EAE7DF]">
              {isSetup || isMigrating ? (
                <ShieldCheck className="w-7 h-7 text-[#5A6355]" />
              ) : (
                <Lock className="w-7 h-7 text-[#5A6355]" />
              )}
            </div>
            <h1 className="text-3xl font-serif italic text-[#3E3D39]">
              {isSetup ? 'Setup Passphrase' : isMigrating ? 'Encrypt Your Data' : 'Unlock Kala'}
            </h1>
            <p className="text-sm text-[#9A958A]">
              {isSetup ? (
                <>
                  Choose a passphrase to encrypt your settings in this browser. Your Azure PAT, Jira
                  tokens, signature, and employee info will be stored encrypted using this
                  passphrase.
                </>
              ) : isMigrating ? (
                <>
                  We found existing settings stored in plaintext. Choose a passphrase to encrypt
                  them. The plaintext copies will be deleted after migration.
                </>
              ) : (
                'Enter your passphrase to unlock your encrypted settings.'
              )}
            </p>
          </div>

          {isSetup && (
            <div className="bg-[#FAF1E0] border border-[#D4B987] rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#7C5F2E] shrink-0 mt-0.5" />
              <p className="text-xs text-[#5C4A2A]">
                If you forget this passphrase, you can reset encrypted storage from the unlock
                screen — but doing so permanently deletes all your saved settings (Azure PAT, Jira
                OAuth, signature, employee info, email templates). There is no way to recover them.
              </p>
            </div>
          )}

          <form
            onSubmit={isSetup ? handleSetup : isMigrating ? handleMigrate : handleUnlock}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="passphrase"
                className="block text-[10px] uppercase font-bold text-[#9A958A] mb-2 tracking-wider"
              >
                Passphrase
              </label>
              <div className="relative">
                <input
                  id="passphrase"
                  type={showPassphrase ? 'text' : 'password'}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className="w-full rounded-2xl border-[#E5E2D9] bg-[#F8F7F3] placeholder-[#D4CFC4] focus:border-[#A4B494] focus:ring-[#A4B494] sm:text-sm p-3.5 pr-12 border outline-none text-[#3E3D39]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassphrase(!showPassphrase)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A958A] hover:text-[#5A6355]"
                  tabIndex={-1}
                >
                  {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {(isSetup || isMigrating) && (
              <div>
                <label
                  htmlFor="confirm"
                  className="block text-[10px] uppercase font-bold text-[#9A958A] mb-2 tracking-wider"
                >
                  Confirm Passphrase
                </label>
                <input
                  id="confirm"
                  type={showPassphrase ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Re-enter passphrase"
                  className="w-full rounded-2xl border-[#E5E2D9] bg-[#F8F7F3] placeholder-[#D4CFC4] focus:border-[#A4B494] focus:ring-[#A4B494] sm:text-sm p-3.5 border outline-none text-[#3E3D39]"
                />
              </div>
            )}

            {error && (
              <div className="bg-[#FBF5F2] border border-[#D7B5AB] rounded-2xl p-3 text-sm text-[#9C5C4F]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full h-12 inline-flex items-center justify-center gap-2 border border-transparent text-xs uppercase tracking-wider font-bold rounded-full shadow-md text-[#F8F7F3] bg-[#5A6355] hover:bg-[#4A5246] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isSetup || isMigrating ? 'Encrypting...' : 'Unlocking...'}
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  {isSetup
                    ? 'Create Encrypted Storage'
                    : isMigrating
                      ? 'Encrypt & Continue'
                      : 'Unlock'}
                </>
              )}
            </button>

            {!isSetup &&
              !isMigrating &&
              (!resetExpanded ? (
                <button
                  type="button"
                  onClick={() => setResetExpanded(true)}
                  disabled={busy}
                  className="w-full text-xs text-[#9A958A] hover:text-[#7C3F35] underline disabled:opacity-50"
                >
                  Forgot passphrase?
                </button>
              ) : (
                <div className="bg-[#FBF5F2] border border-[#D7B5AB] rounded-2xl p-4 space-y-3">
                  <p className="text-xs text-[#7C3F35] font-semibold">Reset encrypted storage?</p>
                  <p className="text-xs text-[#9C5C4F]">
                    This permanently deletes your encrypted settings: Azure PAT, Jira OAuth tokens,
                    signature, employee info, email templates. You will start over with a new
                    passphrase and empty settings.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setResetExpanded(false)}
                      disabled={busy}
                      className="flex-1 h-9 text-xs uppercase tracking-wider font-bold rounded-full border border-[#E5E2D9] text-[#5A6355] hover:bg-[#F8F7F3] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      disabled={busy}
                      className="flex-1 h-9 inline-flex items-center justify-center gap-1 text-xs uppercase tracking-wider font-bold rounded-full text-[#FBF5F2] bg-[#8C4A3B] hover:bg-[#6E3A2D] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3 h-3" />
                      Reset
                    </button>
                  </div>
                </div>
              ))}
          </form>
        </div>
      </div>
    </div>
  );
}
