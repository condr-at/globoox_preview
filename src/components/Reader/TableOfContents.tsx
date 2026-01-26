'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { List, Check, X } from 'lucide-react';

interface Chapter {
    number: number;
    title: string;
}

interface TableOfContentsProps {
    chapters: Chapter[];
    currentChapter: number;
    onSelectChapter: (chapter: number) => void;
}

export default function TableOfContents({
    chapters,
    currentChapter,
    onSelectChapter,
}: TableOfContentsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Close on escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, []);

    const handleSelect = (chapterNum: number) => {
        onSelectChapter(chapterNum);
        setIsOpen(false);
    };

    const modal = isOpen ? (
        <>
            {/* Backdrop */}
            <div
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/50 z-[200]"
            />

            {/* Side panel */}
            <div className="fixed inset-y-0 left-0 w-[320px] max-w-[85vw] bg-[var(--bg-grouped-secondary)] z-[201] flex flex-col safe-area-inset-top">
                {/* Header */}
                <div className="flex items-center justify-between p-[16px] border-b border-[var(--separator)]">
                    <h3 className="text-[20px] font-semibold">Contents</h3>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-[8px] -mr-[8px] rounded-full active:bg-[var(--fill-tertiary)] transition-colors"
                    >
                        <X className="w-[20px] h-[20px] text-[var(--label-secondary)]" />
                    </button>
                </div>

                {/* Chapters list */}
                <div className="flex-1 overflow-y-auto">
                    {chapters.map((chapter) => (
                        <button
                            key={chapter.number}
                            onClick={() => handleSelect(chapter.number)}
                            className={`
                                w-full flex items-center gap-[12px] px-[16px] py-[12px] text-left min-h-[44px]
                                transition-colors active:bg-[var(--fill-tertiary)]
                                ${currentChapter === chapter.number ? 'bg-[var(--system-blue)]/10' : ''}
                            `}
                        >
                            <span className={`
                                w-[28px] h-[28px] rounded-full flex items-center justify-center text-[12px] font-medium
                                ${chapter.number < currentChapter
                                    ? 'bg-[var(--system-blue)] text-white'
                                    : chapter.number === currentChapter
                                        ? 'bg-[var(--system-blue)] text-white'
                                        : 'bg-[var(--fill-tertiary)] text-[var(--label-secondary)]'
                                }
                            `}>
                                {chapter.number < currentChapter ? (
                                    <Check className="w-[14px] h-[14px]" />
                                ) : (
                                    chapter.number
                                )}
                            </span>
                            <span className={`text-[17px] ${
                                currentChapter === chapter.number
                                    ? 'text-[var(--system-blue)] font-medium'
                                    : 'text-[var(--label-primary)]'
                            }`}>
                                {chapter.title}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </>
    ) : null;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center justify-center min-w-[44px] min-h-[44px] text-[var(--system-blue)] active:opacity-70 transition-opacity"
            >
                <List className="w-[20px] h-[20px]" />
            </button>

            {mounted && modal && createPortal(modal, document.body)}
        </>
    );
}
