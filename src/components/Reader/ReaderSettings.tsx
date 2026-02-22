'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Settings, Type, X } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { trackFontSizeChanged } from '@/lib/amplitude';

interface ReaderSettingsProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export default function ReaderSettings({
    open: externalOpen,
    onOpenChange: setExternalOpen,
}: ReaderSettingsProps = {}) {
    const [internalOpen, setInternalOpen] = useState(false);

    const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
    const setIsOpen = setExternalOpen !== undefined ? setExternalOpen : setInternalOpen;

    const [mounted, setMounted] = useState(false);
    const { settings, setFontSize } = useAppStore();
    const fontSizeBeforeRef = useRef(settings.fontSize);

    useEffect(() => {
        setMounted(true);
    }, []);

    const modal = isOpen ? (
        <>
            {/* Backdrop */}
            <div
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/50 z-[200]"
            />

            {/* Modal */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-40px)] max-w-[320px] bg-[var(--bg-primary)] dark:bg-[var(--bg-secondary)] rounded-2xl p-[20px] z-[201] shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-[24px]">
                    <h3 className="text-[20px] font-semibold">Reading Settings</h3>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-[8px] -mr-[8px] rounded-full active:bg-[var(--fill-tertiary)] transition-colors"
                    >
                        <X className="w-[20px] h-[20px] text-[var(--label-secondary)]" />
                    </button>
                </div>

                {/* Font Size */}
                <div>
                    <div className="flex items-center gap-[8px] mb-[12px]">
                        <Type className="w-[16px] h-[16px] text-[var(--label-secondary)]" />
                        <span className="text-[15px] text-[var(--label-secondary)]">Font Size</span>
                    </div>
                    <div className="flex items-center gap-[16px]">
                        <span className="text-[13px] text-[var(--label-secondary)]">A</span>
                        <input
                            type="range"
                            min="14"
                            max="32"
                            value={settings.fontSize}
                            onChange={(e) => setFontSize(Number(e.target.value))}
                            onMouseUp={() => {
                                if (settings.fontSize !== fontSizeBeforeRef.current) {
                                    trackFontSizeChanged({ font_size: settings.fontSize, previous_font_size: fontSizeBeforeRef.current });
                                    fontSizeBeforeRef.current = settings.fontSize;
                                }
                            }}
                            onTouchEnd={() => {
                                if (settings.fontSize !== fontSizeBeforeRef.current) {
                                    trackFontSizeChanged({ font_size: settings.fontSize, previous_font_size: fontSizeBeforeRef.current });
                                    fontSizeBeforeRef.current = settings.fontSize;
                                }
                            }}
                            className="flex-1 h-[4px] bg-[var(--fill-tertiary)] rounded-full appearance-none cursor-pointer
                                [&::-webkit-slider-thumb]:appearance-none
                                [&::-webkit-slider-thumb]:w-[24px]
                                [&::-webkit-slider-thumb]:h-[24px]
                                [&::-webkit-slider-thumb]:rounded-full
                                [&::-webkit-slider-thumb]:bg-white
                                [&::-webkit-slider-thumb]:shadow-md
                                [&::-webkit-slider-thumb]:cursor-pointer
                            "
                        />
                        <span className="text-[20px] text-[var(--label-secondary)]">A</span>
                    </div>
                    <p className="text-center text-[13px] text-[var(--label-tertiary)] mt-[8px]">
                        {settings.fontSize}px
                    </p>
                </div>
            </div>
        </>
    ) : null;

    return (
        <>
            {externalOpen === undefined && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center justify-center min-w-[44px] min-h-[44px] text-[var(--system-blue)] active:opacity-70 transition-opacity"
                >
                    <Settings className="w-[20px] h-[20px]" />
                </button>
            )}

            {mounted && modal && createPortal(modal, document.body)}
        </>
    );
}
