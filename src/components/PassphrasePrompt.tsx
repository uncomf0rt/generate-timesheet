'use client';

import { Eye, EyeOff, KeyRound, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Re-encrypt the envelope with a new passphrase.
   * Returns true on success (parent should then prompt re-unlock).
   */
  onChange: (currentPassphrase: string, newPassphrase: string) => Promise<boolean>;
  busy: boolean;
}

const MIN_PASSPHRASE_LENGTH = 8;

export function PassphrasePrompt({ isOpen, onClose, onChange, busy }: Props) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showFields, setShowFields] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCurrent('');
      setNext('');
      setConfirm('');
      setError(null);
      setShowFields(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!current) {
      setError('Please enter your current passphrase.');
      return;
    }
    if (next.length < MIN_PASSPHRASE_LENGTH) {
      setError(`New passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters.`);
      return;
    }
    if (next !== confirm) {
      setError('New passphrase and confirmation do not match.');
      return;
    }
    const ok = await onChange(current, next);
    if (!ok) {
      setError('Current passphrase is wrong.');
    }
  };

  return (
    <div className="fixed inset-0 z-100 bg-black/40 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-[40px] border border-[#E5E2D9] shadow-xl p-8 space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EAE7DF] flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-[#5A6355]" />
            </div>
            <h2 className="text-xl font-serif italic text-[#3E3D39]">Change Passphrase</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-[#9A958A] hover:text-[#5A6355] disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-[#9A958A]">
          Re-encrypt your encrypted settings with a new passphrase. You'll need to enter your
          current passphrase first.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="current-pp"
              className="block text-[10px] uppercase font-bold text-[#9A958A] mb-2 tracking-wider"
            >
              Current Passphrase
            </label>
            <input
              id="current-pp"
              type={showFields ? 'text' : 'password'}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-2xl border-[#E5E2D9] bg-[#F8F7F3] focus:border-[#A4B494] focus:ring-[#A4B494] sm:text-sm p-3.5 border outline-none text-[#3E3D39]"
            />
          </div>

          <div>
            <label
              htmlFor="new-pp"
              className="block text-[10px] uppercase font-bold text-[#9A958A] mb-2 tracking-wider"
            >
              New Passphrase
            </label>
            <input
              id="new-pp"
              type={showFields ? 'text' : 'password'}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="w-full rounded-2xl border-[#E5E2D9] bg-[#F8F7F3] placeholder-[#D4CFC4] focus:border-[#A4B494] focus:ring-[#A4B494] sm:text-sm p-3.5 border outline-none text-[#3E3D39]"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-pp"
              className="block text-[10px] uppercase font-bold text-[#9A958A] mb-2 tracking-wider"
            >
              Confirm New Passphrase
            </label>
            <input
              id="confirm-pp"
              type={showFields ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-2xl border-[#E5E2D9] bg-[#F8F7F3] focus:border-[#A4B494] focus:ring-[#A4B494] sm:text-sm p-3.5 border outline-none text-[#3E3D39]"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-[#9A958A] cursor-pointer">
            <input
              type="checkbox"
              checked={showFields}
              onChange={(e) => setShowFields(e.target.checked)}
              className="rounded border-[#E5E2D9] text-[#A4B494] focus:ring-[#A4B494]"
            />
            <Eye className="w-3 h-3" />
            Show passphrases
            {showFields ? <EyeOff className="w-3 h-3 hidden" /> : null}
          </label>

          {error && (
            <div className="bg-[#FBF5F2] border border-[#D7B5AB] rounded-2xl p-3 text-sm text-[#9C5C4F]">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 h-11 inline-flex items-center justify-center text-xs uppercase tracking-wider font-bold rounded-full border border-[#E5E2D9] text-[#5A6355] hover:bg-[#F8F7F3] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 h-11 inline-flex items-center justify-center gap-2 text-xs uppercase tracking-wider font-bold rounded-full text-[#F8F7F3] bg-[#5A6355] hover:bg-[#4A5246] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Re-encrypting...
                </>
              ) : (
                'Change Passphrase'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
