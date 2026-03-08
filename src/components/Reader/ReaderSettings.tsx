'use client';

import { useState, useRef } from 'react';
import { Settings, Type } from 'lucide-react';
import IOSSheet from '@/components/ui/ios-sheet';
import IOSSheetHeader from '@/components/ui/ios-sheet-header';
import { useAppStore } from '@/lib/store';
import { trackFontSizeChanged } from '@/lib/posthog';

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

    const { settings, setFontSize } = useAppStore();
    const fontSizeBeforeRef = useRef(settings.fontSize);
    const fontSizeSliderProgress = `${((settings.fontSize - 14) / (32 - 14)) * 100}%`;

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

            <IOSSheet
                open={isOpen}
                onOpenChange={setIsOpen}
                side="bottom"
                enableDragDismiss
                dragHandle={<div className="h-1 w-12 rounded-full bg-black/12 dark:bg-white/16" />}
                dragRegion={(
                    <IOSSheetHeader
                        title="Themes & Settings"
                        onClose={() => setIsOpen(false)}
                    />
                )}
                className="mt-[max(240px,46vh)] flex h-[calc(100dvh-max(240px,46vh))] max-h-none flex-col rounded-t-[20px] border-0 bg-[var(--bg-grouped-secondary)] sm:mt-0 sm:h-auto sm:max-w-[320px] sm:rounded-[24px] sm:border sm:border-[var(--separator)]"
            >
                <div className="p-5 pt-0">
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
                                style={{
                                    background: `linear-gradient(to right, var(--system-blue) 0%, var(--system-blue) ${fontSizeSliderProgress}, var(--fill-tertiary) ${fontSizeSliderProgress}, var(--fill-tertiary) 100%)`,
                                }}
                                className="flex-1 h-[4px] bg-[var(--fill-tertiary)] rounded-full appearance-none cursor-pointer
                                    [&::-webkit-slider-thumb]:appearance-none
                                    [&::-webkit-slider-thumb]:w-[24px]
                                    [&::-webkit-slider-thumb]:h-[24px]
                                    [&::-webkit-slider-thumb]:rounded-full
                                    [&::-webkit-slider-thumb]:bg-white
                                    [&::-webkit-slider-thumb]:shadow-md
                                    [&::-webkit-slider-thumb]:cursor-pointer
                                    [&::-moz-range-thumb]:w-[24px]
                                    [&::-moz-range-thumb]:h-[24px]
                                    [&::-moz-range-thumb]:rounded-full
                                    [&::-moz-range-thumb]:border-0
                                    [&::-moz-range-thumb]:bg-white
                                    [&::-moz-range-thumb]:shadow-md
                                    [&::-moz-range-thumb]:cursor-pointer
                                "
                            />
                            <span className="text-[20px] text-[var(--label-secondary)]">A</span>
                        </div>
                        <p className="text-center text-[13px] text-[var(--label-tertiary)] mt-[8px]">
                            {settings.fontSize}px
                        </p>
                    </div>
                </div>
            </IOSSheet>
        </>
    );
}
