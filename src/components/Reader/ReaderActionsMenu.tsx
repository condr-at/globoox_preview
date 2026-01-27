'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, List, Settings as SettingsIcon, Type, Check, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Language, useAppStore } from '@/lib/store';
import TableOfContents from './TableOfContents';
import ReaderSettings from './ReaderSettings';

interface ReaderActionsMenuProps {
    book: {
        id: string;
        languages: Language[];
        chapters: { number: number; title: string }[];
    };
    currentChapter: number;
    onSelectChapter: (num: number) => void;
    disabled?: boolean;
}

export default function ReaderActionsMenu({
    book,
    currentChapter,
    onSelectChapter,
    disabled
}: ReaderActionsMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeModal, setActiveModal] = useState<'none' | 'toc' | 'settings'>('none');
    const menuRef = useRef<HTMLDivElement>(null);
    const { settings } = useAppStore();

    // Close menu and modals if they are open when disabled becomes true
    useEffect(() => {
        if (disabled) {
            if (isOpen) setIsOpen(false);
            if (activeModal !== 'none') setActiveModal('none');
        }
    }, [disabled, isOpen, activeModal]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleAction = (action: 'toc' | 'settings') => {
        setIsOpen(false);
        setActiveModal(action);
    };

    return (
        <div ref={menuRef} className="relative">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                className="text-[var(--system-blue)]"
                disabled={disabled}
            >
                <MoreHorizontal className="w-6 h-6" />
            </Button>

            {isOpen && (
                <div className="absolute right-0 mt-2 py-1 w-56 bg-[var(--bg-grouped-secondary)] rounded-xl shadow-lg border border-[var(--separator)] overflow-hidden z-[100] animate-in fade-in zoom-in duration-200">
                    <button
                        onClick={() => handleAction('toc')}
                        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors active:bg-[var(--fill-tertiary)]"
                    >
                        <div className="flex items-center gap-3">
                            <List className="w-5 h-5 text-[var(--system-blue)]" />
                            <span className="text-[17px]">Chapters</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[var(--label-tertiary)]" />
                    </button>

                    <div className="h-[0.5px] bg-[var(--separator)] mx-4" />

                    <button
                        onClick={() => handleAction('settings')}
                        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors active:bg-[var(--fill-tertiary)]"
                    >
                        <div className="flex items-center gap-3">
                            <Type className="w-5 h-5 text-[var(--system-blue)]" />
                            <span className="text-[17px]">Appearance</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[var(--label-tertiary)]" />
                    </button>
                </div>
            )}

            {/* Modals */}
            <TableOfContents
                chapters={book.chapters}
                currentChapter={currentChapter}
                onSelectChapter={onSelectChapter}
                open={activeModal === 'toc'}
                onOpenChange={(open) => !open && setActiveModal('none')}
            />


            <ReaderSettings
                open={activeModal === 'settings'}
                onOpenChange={(open) => !open && setActiveModal('none')}
            />
        </div>
    );
}
