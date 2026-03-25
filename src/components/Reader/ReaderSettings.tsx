'use client';

import { useState, useRef } from 'react';
import { Settings, Type, Check } from 'lucide-react';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import IOSBottomDrawer from '@/components/ui/ios-bottom-drawer';
import IOSBottomDrawerHeader from '@/components/ui/ios-bottom-drawer-header';
import { uiIconTriggerButton } from '@/components/ui/button-styles';
import { useAppStore } from '@/lib/store';
import { trackFontSizeChanged } from '@/lib/posthog';
import { APP_THEME_PALETTE_OPTIONS } from '@/lib/theme-options';

const THEMES = [
    { id: 'light', label: `${APP_THEME_PALETTE_OPTIONS.find((p) => p.id === 'default')?.label ?? 'Default'} Light`, bg: '#F6F6FA', accent: '#007AFF', text: '#000000' },
    { id: 'dark', label: `${APP_THEME_PALETTE_OPTIONS.find((p) => p.id === 'default')?.label ?? 'Default'} Dark`, bg: '#09090B', accent: '#0A84FF', text: '#FFFFFF' },
    { id: 'forest-light', label: `${APP_THEME_PALETTE_OPTIONS.find((p) => p.id === 'globoox')?.label ?? 'Globoox'} Light`, bg: '#F4F0E8', accent: '#C05A3A', text: '#2C3B2D' },
    { id: 'forest-dark', label: `${APP_THEME_PALETTE_OPTIONS.find((p) => p.id === 'globoox')?.label ?? 'Globoox'} Dark`, bg: '#1A2419', accent: '#E8B89A', text: '#F4F0E8' },
] as const;

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

    const { theme, setAppTheme } = useAppTheme();
    const { settings, setFontSize, setPageLayoutMode } = useAppStore();
    const fontSizeBeforeRef = useRef(settings.fontSize);
    const fontSizeSliderProgress = `${((settings.fontSize - 14) / (32 - 14)) * 100}%`;
    const sliderEdgeBoxClassName = 'flex h-5 w-5 shrink-0 items-center justify-center';

    return (
        <>
            {externalOpen === undefined && (
                <button
                    onClick={() => setIsOpen(true)}
                    className={uiIconTriggerButton}
                >
                    <Settings className="w-[20px] h-[20px]" />
                </button>
            )}

            <IOSBottomDrawer
                open={isOpen}
                onOpenChange={setIsOpen}
                side="bottom"
                enableDragDismiss
                dragHandle={<div className="h-1 w-12 rounded-full bg-[var(--separator)]" />}
                dragRegion={(
                    <IOSBottomDrawerHeader
                        title="Themes & Settings"
                        onClose={() => setIsOpen(false)}
                    />
                )}
                className="mt-[max(240px,46vh)] flex h-[calc(100dvh-max(240px,46vh))] max-h-none flex-col rounded-t-[20px] bg-[var(--bg-grouped-secondary)] sm:mt-0 sm:h-auto sm:max-w-[320px] sm:overflow-hidden sm:rounded-[24px]"
            >
                <div className="flex-1 overflow-y-auto p-5 pt-0 space-y-5 sm:min-h-0">
                    {/* Theme Picker */}
                    <div>
                        <p className="text-[15px] text-muted-foreground mb-[12px]">Theme</p>
                        <div className="grid grid-cols-4 gap-[8px]">
                            {THEMES.map((t) => {
                                const isActive = theme === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => {
                                            const palette = t.id.startsWith('forest') ? 'globoox' : 'default';
                                            const mode = t.id.endsWith('dark') ? 'dark' : 'light';
                                            setAppTheme(mode, palette);
                                        }}
                                        className="cursor-pointer flex flex-col items-center gap-[6px] transition-opacity hover:opacity-85 active:opacity-70"
                                        aria-label={t.label}
                                        aria-pressed={isActive}
                                    >
                                        <div
                                            className="relative w-full aspect-square rounded-[12px] border-[2px] transition-colors"
                                            style={{
                                                background: t.bg,
                                                borderColor: isActive ? t.accent : 'transparent',
                                                boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                                            }}
                                        >
                                            {/* Mini preview dot */}
                                            <span
                                                className="absolute top-[6px] left-[6px] w-[8px] h-[8px] rounded-full"
                                                style={{ background: t.accent }}
                                            />
                                            {isActive && (
                                                <span className="absolute bottom-[4px] right-[4px] flex items-center justify-center w-[16px] h-[16px] rounded-full" style={{ background: t.accent }}>
                                                    <Check className="w-[10px] h-[10px]" style={{ color: t.bg }} strokeWidth={2} />
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[11px] text-muted-foreground leading-tight text-center">{t.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Font Size */}
                    <div>
                        <div className="flex items-center gap-[8px] mb-[12px]">
                            <Type className="w-[16px] h-[16px] text-muted-foreground" />
                            <span className="text-[15px] text-muted-foreground">Font Size</span>
                        </div>
                        <div className="flex items-center gap-[16px]">
                            <span className={sliderEdgeBoxClassName}>
                                <span className="text-[13px] text-muted-foreground">A</span>
                            </span>
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
                            <span className={sliderEdgeBoxClassName}>
                                <span className="text-[20px] text-muted-foreground">A</span>
                            </span>
                        </div>
                        <p className="text-center text-[13px] text-muted-foreground/50 mt-[8px]">
                            {settings.fontSize}px
                        </p>
                    </div>

                    {/* Page Layout */}
                    <div>
                        <p className="text-[15px] text-muted-foreground mb-[12px]">Page Layout</p>
                        <div className="grid grid-cols-2 gap-[8px]">
                            <button
                                type="button"
                                onClick={() => setPageLayoutMode('single')}
                                className="rounded-[12px] border px-3 py-2 text-[14px] transition-colors"
                                style={{
                                    borderColor: settings.pageLayoutMode === 'single' ? 'var(--system-blue)' : 'var(--separator)',
                                    background: settings.pageLayoutMode === 'single' ? 'color-mix(in srgb, var(--system-blue) 14%, transparent)' : 'transparent',
                                }}
                            >
                                Single Page
                            </button>
                            <button
                                type="button"
                                onClick={() => setPageLayoutMode('spread')}
                                className="rounded-[12px] border px-3 py-2 text-[14px] transition-colors"
                                style={{
                                    borderColor: settings.pageLayoutMode === 'spread' ? 'var(--system-blue)' : 'var(--separator)',
                                    background: settings.pageLayoutMode === 'spread' ? 'color-mix(in srgb, var(--system-blue) 14%, transparent)' : 'transparent',
                                }}
                            >
                                Two-Page Spread
                            </button>
                        </div>
                        <p className="text-[12px] text-muted-foreground/60 mt-[8px]">
                            Spread mode activates on wide screens.
                        </p>
                    </div>

                </div>
            </IOSBottomDrawer>
        </>
    );
}
