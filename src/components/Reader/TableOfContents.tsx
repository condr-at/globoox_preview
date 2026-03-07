'use client';

import { useState } from 'react';
import Image from 'next/image';
import { List, X, Loader2, ChevronDown } from 'lucide-react';
import IOSSheet from '@/components/ui/ios-sheet';

interface Chapter {
    number: number;
    title: string;
    depth?: number;
    isPending?: boolean;
}

interface TableOfContentsProps {
    bookTitle: string;
    coverUrl?: string | null;
    chapters: Chapter[];
    currentChapter: number;
    onSelectChapter: (chapter: number) => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    isTranslating?: boolean;
}

export default function TableOfContents({
    bookTitle,
    coverUrl,
    chapters,
    currentChapter,
    onSelectChapter,
    open: externalOpen,
    onOpenChange: setExternalOpen,
    isTranslating = false,
}: TableOfContentsProps) {
    const [internalOpen, setInternalOpen] = useState(false);

    const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
    const setIsOpen = setExternalOpen !== undefined ? setExternalOpen : setInternalOpen;

    const handleSelect = (chapterNum: number) => {
        onSelectChapter(chapterNum);
        setIsOpen(false);
    };

    return (
        <>
            {externalOpen === undefined && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center justify-center min-w-[44px] min-h-[44px] text-[var(--system-blue)] active:opacity-70 transition-opacity"
                >
                    <List className="w-[20px] h-[20px]" />
                </button>
            )}

            <IOSSheet
                open={isOpen}
                onOpenChange={setIsOpen}
                side="bottom"
                enableDragDismiss
                disableDesktopSlide
                dragHandle={<div className="mx-auto mb-3 mt-3 h-1.5 w-9 rounded-full bg-black/12 dark:bg-white/16" />}
                className="mt-[max(56px,calc(env(safe-area-inset-top)+18px))] flex h-[calc(100dvh-max(56px,calc(env(safe-area-inset-top)+18px)))] max-h-none flex-col overflow-hidden rounded-t-[20px] border-0 bg-[#f3f3f1] shadow-[0_-12px_40px_rgba(0,0,0,0.16)] dark:bg-[#1c1c1e]"
            >
                <div className="px-4 pt-3">
                    <div className="rounded-[18px] bg-[#f7f7f5] px-4 py-4 shadow-[inset_0_0_0_0.5px_rgba(60,60,67,0.12)] dark:bg-[#2a2a2c]">
                        <div className="flex items-start gap-4">
                            <div className="relative h-[94px] w-[64px] shrink-0 overflow-hidden rounded-[6px] bg-[var(--fill-secondary)] shadow-[0_3px_10px_rgba(0,0,0,0.18)]">
                                {coverUrl ? (
                                    <Image
                                        src={coverUrl}
                                        alt={bookTitle}
                                        fill
                                        sizes="64px"
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(180deg,#cfcfcd,#aaaaa8)] text-[8px] font-medium uppercase tracking-[0.14em] text-white/70">
                                        EPUB
                                    </div>
                                )}
                            </div>

                            <div className="min-w-0 flex-1 pt-1">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="truncate text-[18px] font-semibold tracking-[-0.02em] text-[var(--label-primary)]">
                                            {bookTitle}
                                        </h3>
                                        <div className="mt-1 inline-flex items-center gap-1 text-[17px] text-[var(--label-secondary)]">
                                            <span>Chapter {currentChapter} of {chapters.length}</span>
                                            <ChevronDown className="h-4 w-4" strokeWidth={2.2} />
                                        </div>
                                    </div>
                                    {isTranslating && (
                                        <Loader2 className="mt-1 h-4 w-4 shrink-0 animate-spin text-[var(--system-blue)]" />
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => setIsOpen(false)}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/8 text-[var(--label-secondary)] transition-colors active:bg-black/12 dark:bg-white/10 dark:active:bg-white/14"
                            >
                                <X className="h-5 w-5" strokeWidth={2.2} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-3 flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+12px)]">
                    {chapters.map((chapter) => {
                        const depth = chapter.depth || 1;
                        const indentPx = (depth - 1) * 22;
                        const isActive = currentChapter === chapter.number;

                        return (
                            <button
                                key={chapter.number}
                                onClick={() => handleSelect(chapter.number)}
                                className="relative flex min-h-[72px] w-full items-center gap-4 border-t border-black/[0.07] px-6 text-left transition-colors active:bg-black/[0.035] dark:border-white/[0.08] dark:active:bg-white/[0.03]"
                                style={{ paddingLeft: `${24 + indentPx}px`, paddingRight: '24px' }}
                            >
                                <span className="relative min-w-0 flex-1">
                                    <span
                                        className={`
                                            block
                                            ${depth === 1 ? 'text-[18px]' : 'text-[16px]'}
                                            ${isActive
                                                ? 'text-[var(--label-primary)] font-semibold'
                                                : depth === 1
                                                    ? 'text-[var(--label-primary)]'
                                                    : 'text-[var(--label-secondary)]'
                                            }
                                            ${chapter.isPending ? 'blur-[3px] opacity-40' : ''}
                                        `}
                                    >
                                        {chapter.title}
                                    </span>
                                </span>
                                <span className="shrink-0 text-[15px] text-[var(--label-secondary)]">
                                    {depth === 1 ? chapter.number : ''}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </IOSSheet>
        </>
    );
}
