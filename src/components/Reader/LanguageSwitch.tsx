'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useAppStore, Language, languageNames, languageFlags } from '@/lib/store';

interface LanguageSwitchProps {
    availableLanguages: Language[];
    onLanguageChange?: (lang: Language) => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export default function LanguageSwitch({
    availableLanguages,
    onLanguageChange,
    open: externalOpen,
    onOpenChange: setExternalOpen,
}: LanguageSwitchProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
    const setIsOpen = setExternalOpen !== undefined ? setExternalOpen : setInternalOpen;

    const dropdownRef = useRef<HTMLDivElement>(null);
    const { settings, setLanguage, setIsTranslating } = useAppStore();

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [setIsOpen]);

    const handleSelect = (lang: Language) => {
        if (lang === settings.language) {
            setIsOpen(false);
            return;
        }

        setIsOpen(false);

        // Change language immediately
        setLanguage(lang);
        onLanguageChange?.(lang);

        // Trigger translation glow (will be managed by ReaderView)
        setIsTranslating(true);
    };

    return (
        <div ref={dropdownRef} className="relative">
            {externalOpen === undefined && (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-[4px] px-[8px] min-w-[44px] min-h-[44px] text-[var(--system-blue)] active:opacity-70 transition-opacity"
                >
                    <span className="text-[15px] font-medium">{settings.language.toUpperCase()}</span>
                    <ChevronDown className={`w-[16px] h-[16px] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            )}

            {isOpen && (
                <div className={`${externalOpen === undefined ? 'absolute right-0 mt-[8px]' : 'fixed top-[calc(env(safe-area-inset-top)+60px)] right-4'} py-[8px] w-[192px] bg-[var(--bg-grouped-secondary)] rounded-[12px] shadow-lg border border-[var(--separator)] overflow-hidden z-[100]`}>
                    {availableLanguages.map((lang) => (
                        <button
                            key={lang}
                            onClick={() => handleSelect(lang)}
                            className="w-full flex items-center justify-between px-[16px] py-[12px] text-left transition-colors active:bg-[var(--fill-tertiary)]"
                        >
                            <span className="text-[17px]">{languageNames[lang]}</span>
                            {settings.language === lang && (
                                <Check className="w-[20px] h-[20px] text-[var(--system-blue)]" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
