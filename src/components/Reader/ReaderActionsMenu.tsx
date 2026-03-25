'use client';

import { useRef, useState } from 'react';
import { MoreHorizontal, List, Type, ChevronRight } from 'lucide-react';
import { Language } from '@/lib/store';
import TableOfContents from './TableOfContents';
import ReaderSettings from './ReaderSettings';
import { useAdaptiveDropdown } from '@/components/ui/useAdaptiveDropdown';
import { uiHeaderControlHitArea, uiIconTriggerButton, uiMenuItemButton } from '@/components/ui/button-styles';
import IOSItemsStack from '@/components/ui/ios-items-stack';

interface ReaderActionsMenuProps {
  book: {
    id: string;
    title: string;
    author?: string | null;
    isTocContentPending?: boolean;
    coverUrl?: string | null;
    languages: Language[];
    chapters: { number: number; title: string; depth?: number }[];
  };
  currentChapter: number;
  onSelectChapter: (num: number) => void;
  disabled?: boolean;
  onTocOpen?: () => void;
}

export default function ReaderActionsMenu({
  book,
  currentChapter,
  onSelectChapter,
  disabled,
  onTocOpen,
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
    if (action === 'toc') onTocOpen?.();
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`${uiIconTriggerButton} ${uiHeaderControlHitArea} inline-flex`}
        disabled={disabled}
      >
        <MoreHorizontal className="w-6 h-6" />
      </button>

      {effectiveOpen && (
        <div
          ref={menuRef}
          className="fixed w-56 z-[100]"
          style={menuStyle}
        >
        <IOSItemsStack className="py-1 bg-[var(--bg-grouped-secondary)] shadow-lg border border-[var(--separator)]">
          <button
            onClick={() => handleAction('toc')}
            className={uiMenuItemButton}
          >
            <div className="flex items-center gap-3">
              <List className="w-5 h-5 text-primary" />
              <span className="text-[17px]">Chapters</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
          </button>

          <div className="ml-12 mr-4 h-[0.5px] bg-[var(--separator)]" />

          <button
            onClick={() => handleAction('settings')}
            className={uiMenuItemButton}
          >
            <div className="flex items-center gap-3">
              <Type className="w-5 h-5 text-primary" />
              <span className="text-[17px]">Appearance</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
          </button>
        </IOSItemsStack>
        </div>
      )}

      <TableOfContents
        bookTitle={book.title}
        bookAuthor={book.author}
        isContentPending={book.isTocContentPending}
        coverUrl={book.coverUrl}
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
