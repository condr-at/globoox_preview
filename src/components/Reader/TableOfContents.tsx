'use client';

import { useState } from 'react';
import Image from 'next/image';
import { List } from 'lucide-react';
import IOSBottomDrawer from '@/components/ui/ios-bottom-drawer';
import IOSBottomDrawerHeader from '@/components/ui/ios-bottom-drawer-header';

interface Chapter {
    number: number;
    title: string;
    depth?: number;
}

interface TableOfContentsProps {
    bookTitle: string;
    bookAuthor?: string | null;
    isContentPending?: boolean;
    coverUrl?: string | null;
    chapters: Chapter[];
    currentChapter: number;
    onSelectChapter: (chapter: number) => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export default function TableOfContents({
    bookTitle,
    bookAuthor,
    isContentPending = false,
    coverUrl,
    chapters,
    currentChapter,
    onSelectChapter,
    open: externalOpen,
    onOpenChange: setExternalOpen,
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

            <IOSBottomDrawer
                open={isOpen}
                onOpenChange={setIsOpen}
                side="bottom"
                enableDragDismiss
                dragHandle={<div className="h-1 w-12 rounded-full bg-black/12 dark:bg-white/16" />}
                dragRegion={(
                    <IOSBottomDrawerHeader
                        title={<span className={isContentPending ? 'blur-[3px] opacity-40' : ''}>{bookTitle}</span>}
                        subtitle={(
                            <div className={`space-y-1 ${isContentPending ? 'blur-[3px] opacity-40' : ''}`}>
                                {bookAuthor && <div>{bookAuthor}</div>}
                                <div>Chapter {currentChapter} of {chapters.length}</div>
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
                        onClose={() => setIsOpen(false)}
                    />
                )}
                className="mt-[max(56px,calc(env(safe-area-inset-top)+18px))] flex h-[calc(100dvh-max(56px,calc(env(safe-area-inset-top)+18px)))] max-h-none flex-col overflow-hidden rounded-t-[20px] bg-[#f3f3f1] shadow-[0_-12px_40px_rgba(0,0,0,0.16)] dark:bg-[#1c1c1e] sm:mt-0 sm:h-auto sm:max-w-[640px] sm:rounded-[24px]"
            >
                <div className="relative flex-1 overflow-hidden">
                    <div className={`h-full overflow-y-auto ${isContentPending ? 'blur-[3px] opacity-40' : ''}`}>
                        {chapters.map((chapter) => {
                            const depth = chapter.depth || 1;
                            const indentPx = (depth - 1) * 22;
                            const isActive = currentChapter === chapter.number;

                            return (
                                <button
                                    key={chapter.number}
                                    onClick={() => handleSelect(chapter.number)}
                                    disabled={isContentPending}
                                    className="relative flex min-h-[72px] w-full items-center gap-4 border-t border-black/[0.07] px-5 text-left transition-colors active:bg-black/[0.035] dark:border-white/[0.08] dark:active:bg-white/[0.03]"
                                    style={{ paddingLeft: `${20 + indentPx}px`, paddingRight: '20px' }}
                                >
                                    <span className="min-w-0 flex-1">
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
                    {isContentPending && (
                        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                            <span className="text-sm font-medium text-white/90 animate-pulse-text">
                                Translating...
                            </span>
                        </div>
                    )}
                </div>
            </IOSBottomDrawer>
        </>
    );
}
