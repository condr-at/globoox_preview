'use client';

import { useState } from 'react';
import Image from 'next/image';
import { List, Loader2, ChevronDown } from 'lucide-react';
import IOSSheet from '@/components/ui/ios-sheet';
import IOSSheetHeader from '@/components/ui/ios-sheet-header';

interface Chapter {
    number: number;
    title: string;
    depth?: number;
    isPending?: boolean;
}

interface TableOfContentsProps {
    bookTitle: string;
    bookAuthor?: string | null;
    isBookMetaPending?: boolean;
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
    bookAuthor,
    isBookMetaPending = false,
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

    const bookMetaClassName = isBookMetaPending ? 'blur-[3px] opacity-40' : '';

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
                dragHandle={<div className="h-1 w-12 rounded-full bg-black/12 dark:bg-white/16" />}
                className="mt-[max(56px,calc(env(safe-area-inset-top)+18px))] flex h-[calc(100dvh-max(56px,calc(env(safe-area-inset-top)+18px)))] max-h-none flex-col overflow-hidden rounded-t-[20px] border-0 bg-[#f3f3f1] shadow-[0_-12px_40px_rgba(0,0,0,0.16)] dark:bg-[#1c1c1e]"
            >
                <IOSSheetHeader
                    title={(
                        <div className="relative inline-block max-w-full">
                            <span className={bookMetaClassName}>{bookTitle}</span>
                            {isBookMetaPending && (
                                <span className="absolute inset-0 flex items-center text-[12px] font-medium text-[var(--system-blue)]">
                                    Translating...
                                </span>
                            )}
                        </div>
                    )}
                    subtitle={(
                        <div className="space-y-1">
                            {bookAuthor && (
                                <div className="relative inline-block max-w-full">
                                    <span className={bookMetaClassName}>{bookAuthor}</span>
                                    {isBookMetaPending && (
                                        <span className="absolute inset-0 flex items-center text-[12px] font-medium text-[var(--system-blue)]">
                                            Translating...
                                        </span>
                                    )}
                                </div>
                            )}
                            <div className="inline-flex items-center gap-1">
                                <span>Chapter {currentChapter} of {chapters.length}</span>
                                <ChevronDown className="h-4 w-4" strokeWidth={2.2} />
                            </div>
                        </div>
                    )}
                    leading={(
                        <div className="relative h-[94px] w-[64px] overflow-hidden rounded-[6px] bg-[var(--fill-secondary)] shadow-[0_3px_10px_rgba(0,0,0,0.18)]">
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
                    )}
                    trailing={isTranslating ? <Loader2 className="h-4 w-4 animate-spin text-[var(--system-blue)]" /> : undefined}
                    onClose={() => setIsOpen(false)}
                />

                <div className="flex-1 overflow-y-auto">
                    {chapters.map((chapter) => {
                        const depth = chapter.depth || 1;
                        const indentPx = (depth - 1) * 22;
                        const isActive = currentChapter === chapter.number;

                        return (
                            <button
                                key={chapter.number}
                                onClick={() => handleSelect(chapter.number)}
                                className="relative flex min-h-[72px] w-full items-center gap-4 border-t border-black/[0.07] px-5 text-left transition-colors active:bg-black/[0.035] dark:border-white/[0.08] dark:active:bg-white/[0.03]"
                                style={{ paddingLeft: `${20 + indentPx}px`, paddingRight: '20px' }}
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
                    <div
                        aria-hidden="true"
                        className="min-h-[72px] border-t border-black/[0.07] dark:border-white/[0.08]"
                    />
                </div>
            </IOSSheet>
        </>
    );
}
