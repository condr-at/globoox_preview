'use client';

import { useRef, useState } from 'react';
import { MoreHorizontal, List, Type, ChevronRight } from 'lucide-react';
import { Language } from '@/lib/store';
import TableOfContents from './TableOfContents';
import ReaderSettings from './ReaderSettings';
import { useAdaptiveDropdown } from '@/components/ui/useAdaptiveDropdown';

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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const effectiveOpen = isOpen && !disabled;

  const { menuStyle } = useAdaptiveDropdown({
    isOpen: effectiveOpen,
    setIsOpen,
    triggerRef,
    menuRef,
    menuWidth: 224,
    menuHeight: 104,
  });

  const handleAction = (action: 'toc' | 'settings') => {
    setIsOpen(false);
    setActiveModal(action);
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-[var(--system-blue)] active:opacity-70 disabled:opacity-50"
        disabled={disabled}
      >
        <MoreHorizontal className="w-6 h-6" />
      </button>

      {effectiveOpen && (
        <div
          ref={menuRef}
          className="fixed py-1 w-56 bg-[var(--bg-grouped-secondary)] rounded-xl shadow-lg border border-[var(--separator)] overflow-hidden z-[100]"
          style={menuStyle}
        >
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
