'use client';

import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Check, ChevronDown, ChevronUp, ClipboardCopy } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EmployeeInfo } from '@/lib/types';

interface Props {
  employeeInfo: EmployeeInfo;
  startDate: string;
  endDate: string;
}

interface StoredTemplate {
  text: string;
  syncHash: string;
}

const STORAGE_KEY = 'timesheet-email-templates';

const EmailTemplateSection: React.FC<Props> = ({ employeeInfo, startDate, endDate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<Record<string, { text: string; copied: boolean }>>({
    'approval-1': { text: '', copied: false },
    'approval-2': { text: '', copied: false },
  });

  const textarea1Ref = useRef<HTMLTextAreaElement>(null);
  const textarea2Ref = useRef<HTMLTextAreaElement>(null);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return format(parseISO(dateStr), 'd MMMM yyyy', { locale: id });
  };

  const computeSyncHash = useCallback(() => {
    return `${employeeInfo.diketahuiOleh}|${employeeInfo.disetujuiOleh}|${employeeInfo.nama}|${startDate}|${endDate}`;
  }, [
    employeeInfo.diketahuiOleh,
    employeeInfo.disetujuiOleh,
    employeeInfo.nama,
    startDate,
    endDate,
  ]);

  const generateDefaultText = useCallback(
    (templateId: 'approval-1' | 'approval-2') => {
      const atasan1 = employeeInfo.diketahuiOleh || '[nama atasan 1]';
      const atasan2 = employeeInfo.disetujuiOleh || '[nama atasan 2]';
      const nama = employeeInfo.nama || '[nama lengkap user]';
      const tglMulai = formatDate(startDate);
      const tglSelesai = formatDate(endDate);

      if (templateId === 'approval-1') {
        return `Kepada yth,
Pak ${atasan1}

Berikut Saya lampirkan laporan Timesheet Saya per tanggal ${tglMulai} - ${tglSelesai} yang sudah Saya tanda tangani. Mohon bantuannya untuk beri approval berupa tanda tangan di kolom yang tersedia, agar nantinya akan saya lanjutkan ke Pak ${atasan2}.

Terimakasih atas perhatian dan waktunya.

Best regards,
${nama}`;
      }

      return `Kepada yth,
Pak ${atasan2}

Berikut Saya lampirkan laporan Timesheet Saya per tanggal ${tglMulai} - ${tglSelesai} yang sudah Saya tanda tangani. Timesheet berikut sudah direview dan ditandatangani oleh Pak ${atasan1}. Mohon bantuannya untuk beri approval berupa tanda tangan di kolom yang tersedia.

Terimakasih atas perhatian dan waktunya.

Best regards,
${nama}`;
    },
    [employeeInfo, startDate, endDate]
  );

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentHash = computeSyncHash();
    const stored = localStorage.getItem(STORAGE_KEY);
    const storedData: Record<string, StoredTemplate> = stored ? JSON.parse(stored) : {};

    const newTemplates: Record<string, { text: string; copied: boolean }> = {
      'approval-1': { text: '', copied: false },
      'approval-2': { text: '', copied: false },
    };

    // Approval 1
    if (storedData['approval-1'] && storedData['approval-1'].syncHash === currentHash) {
      newTemplates['approval-1'].text = storedData['approval-1'].text;
    } else {
      newTemplates['approval-1'].text = generateDefaultText('approval-1');
    }

    // Approval 2
    if (storedData['approval-2'] && storedData['approval-2'].syncHash === currentHash) {
      newTemplates['approval-2'].text = storedData['approval-2'].text;
    } else {
      newTemplates['approval-2'].text = generateDefaultText('approval-2');
    }

    setTemplates(newTemplates);
  }, [computeSyncHash, generateDefaultText]);

  // Save to localStorage when text changes
  const saveToStorage = useCallback(
    (templateId: string, text: string) => {
      if (typeof window === 'undefined') return;

      const currentHash = computeSyncHash();
      const stored = localStorage.getItem(STORAGE_KEY);
      const storedData: Record<string, StoredTemplate> = stored ? JSON.parse(stored) : {};

      storedData[templateId] = { text, syncHash: currentHash };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storedData));
    },
    [computeSyncHash]
  );

  const buttons: Record<string, string> = useMemo(
    () => ({
      'Pak Atasan 1': `Pak ${employeeInfo.diketahuiOleh || '[nama atasan 1]'}`,
      'Pak Atasan 2': `Pak ${employeeInfo.disetujuiOleh || '[nama atasan 2]'}`,
      'Nama Saya': employeeInfo.nama || '[nama lengkap user]',
      'Tgl Mulai': formatDate(startDate),
      'Tgl Selesai': formatDate(endDate),
    }),
    [employeeInfo.diketahuiOleh, employeeInfo.disetujuiOleh, employeeInfo.nama, startDate, endDate]
  );

  const insertAtCursor = (ref: React.RefObject<HTMLTextAreaElement | null>, text: string) => {
    const textarea = ref.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const templateId = textarea.dataset.template || 'approval-1';
    const currentValue = templates[templateId].text;

    const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);

    setTemplates((prev) => ({
      ...prev,
      [templateId]: { ...prev[templateId], text: newValue },
    }));

    saveToStorage(templateId, newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const handleTextChange = (templateId: string, newText: string) => {
    setTemplates((prev) => ({
      ...prev,
      [templateId]: { ...prev[templateId], text: newText },
    }));
    saveToStorage(templateId, newText);
  };

  const handleCopy = async (templateId: string) => {
    const text = templates[templateId].text;
    try {
      await navigator.clipboard.writeText(text);
      setTemplates((prev) => ({
        ...prev,
        [templateId]: { ...prev[templateId], copied: true },
      }));
      setTimeout(() => {
        setTemplates((prev) => ({
          ...prev,
          [templateId]: { ...prev[templateId], copied: false },
        }));
      }, 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setTemplates((prev) => ({
        ...prev,
        [templateId]: { ...prev[templateId], copied: true },
      }));
      setTimeout(() => {
        setTemplates((prev) => ({
          ...prev,
          [templateId]: { ...prev[templateId], copied: false },
        }));
      }, 2000);
    }
  };

  const templateMeta: Record<
    string,
    { label: string; ref: React.RefObject<HTMLTextAreaElement | null> }
  > = {
    'approval-1': { label: 'Approval 1 - Ke Atasan 1', ref: textarea1Ref },
    'approval-2': { label: 'Approval 2 - Ke Atasan 2', ref: textarea2Ref },
  };

  return (
    <div className="bg-white rounded-[40px] border border-[#E5E2D9] shadow-sm p-8 md:p-10 space-y-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between"
      >
        <h2 className="text-2xl font-serif italic text-[#3E3D39]">Email Template</h2>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-[#5A6355]" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[#5A6355]" />
        )}
      </button>

      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(templateMeta).map(([templateId, meta]) => (
            <div
              key={templateId}
              className="border border-[#E5E2D9] rounded-2xl p-5 bg-[#F8F7F3] space-y-3"
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#5A6355]">
                  {meta.label}
                </span>
                <button
                  onClick={() => handleCopy(templateId)}
                  className={`transition-colors ${
                    templates[templateId].copied
                      ? 'text-green-600'
                      : 'text-[#5A6355] hover:text-[#4A5246]'
                  }`}
                  title="Salin ke clipboard"
                >
                  {templates[templateId].copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <ClipboardCopy className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Quick insert buttons */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(buttons).map(([label, value]) => (
                  <button
                    key={label}
                    onClick={() => insertAtCursor(meta.ref, value)}
                    className="px-3 py-1.5 text-xs font-medium bg-white border border-[#E5E2D9] rounded-full text-[#5A6355] hover:bg-[#EAE7DF] hover:border-[#A4B494] transition-colors"
                  >
                    {value}
                  </button>
                ))}
              </div>

              {/* Editable textarea */}
              <textarea
                ref={meta.ref}
                data-template={templateId}
                value={templates[templateId].text}
                onChange={(e) => handleTextChange(templateId, e.target.value)}
                className="w-full min-h-[200px] text-sm text-[#3C3A36] bg-white border border-[#E5E2D9] rounded-xl p-3 font-sans leading-relaxed resize-y focus:border-[#A4B494] focus:ring focus:ring-[#A4B494]/20 outline-none"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmailTemplateSection;
