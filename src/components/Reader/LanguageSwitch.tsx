'use client';

import { useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useAppStore, Language, languageNames } from '@/lib/store';
import { useAdaptiveDropdown } from '@/components/ui/useAdaptiveDropdown';

interface LanguageSwitchProps {
  availableLanguages: Language[];
  currentLanguage?: Language;
  onLanguageChange?: (lang: Language) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
}

export default function LanguageSwitch({
  availableLanguages,
  currentLanguage,
  onLanguageChange,
  open: externalOpen,
  onOpenChange: setExternalOpen,
  disabled
}: LanguageSwitchProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = setExternalOpen !== undefined ? setExternalOpen : setInternalOpen;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { settings, setLanguage, setIsTranslating } = useAppStore();
  const activeLanguage = currentLanguage ?? settings.language;

  const effectiveOpen = isOpen && !disabled;

  const { menuStyle } = useAdaptiveDropdown({
    isOpen: effectiveOpen,
    setIsOpen,
    triggerRef,
    menuRef,
    menuWidth: 192,
    menuHeight: 220,
  });

  const handleSelect = (lang: Language) => {
    if (lang === activeLanguage) {
      setIsOpen(false);
      return;
    }

    setIsOpen(false);
    if (!currentLanguage) setLanguage(lang);
    onLanguageChange?.(lang);
    setIsTranslating(true);
  };

  return (
    <div className="relative">
      {externalOpen === undefined && (
        <button
          ref={triggerRef}
          onClick={() => setIsOpen(!effectiveOpen)}
          disabled={disabled}
          className="flex items-center gap-[4px] px-[8px] min-w-[44px] min-h-[44px] text-[var(--system-blue)] active:opacity-70 disabled:opacity-50 transition-opacity"
        >
          <span className="text-[15px] font-medium">{activeLanguage.toUpperCase()}</span>
          <ChevronDown className={`w-[16px] h-[16px] transition-transform ${effectiveOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {effectiveOpen && (
        <div
          ref={menuRef}
          className="fixed py-[8px] w-[192px] bg-[var(--bg-grouped-secondary)] rounded-[12px] shadow-lg border border-[var(--separator)] overflow-hidden z-[100]"
          style={externalOpen === undefined ? menuStyle : { top: 'calc(env(safe-area-inset-top) + 60px)', right: '16px' }}
        >
          {availableLanguages.map((lang) => (
            <button
              key={lang}
              onClick={() => handleSelect(lang)}
              className="w-full flex items-center justify-between px-[16px] py-[12px] text-left transition-colors active:bg-[var(--fill-tertiary)]"
            >
              <span className="text-[17px]">{languageNames[lang]}</span>
              {activeLanguage === lang && (
                <Check className="w-[20px] h-[20px] text-[var(--system-blue)]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
