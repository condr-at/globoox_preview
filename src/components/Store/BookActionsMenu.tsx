'use client';

import { useRef, useState } from 'react';
import { Eye, EyeOff, MoreHorizontal, Trash2 } from 'lucide-react';
import { useAdaptiveDropdown } from '@/components/ui/useAdaptiveDropdown';

interface BookActionsMenuProps {
  onHide: () => void;
  onDelete: () => void;
  hideLabel?: string;
  onOpenChange?: (open: boolean) => void;
}

export default function BookActionsMenu({ onHide, onDelete, hideLabel = 'Hide', onOpenChange }: BookActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const setMenuOpen = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
    if (!open) {
      setMenuVisible(false);
      return;
    }
    requestAnimationFrame(() => {
      setMenuVisible(true);
    });
  };

  const { menuStyle, isPositioned } = useAdaptiveDropdown({
    isOpen,
    setIsOpen: setMenuOpen,
    triggerRef,
    menuRef,
    menuWidth: 176,
    menuHeight: 108,
  });

  const handleHide = () => {
    setMenuOpen(false);
    onHide();
  };

  const handleDelete = () => {
    setMenuOpen(false);
    onDelete();
  };

  return (
    <div
      className="relative z-10"
      onPointerDown={(e) => {
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur text-[var(--system-blue)] active:opacity-70"
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenuOpen(!isOpen);
        }}
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="fixed py-1 w-44 bg-[var(--bg-grouped-secondary)] rounded-xl shadow-lg border border-[var(--separator)] overflow-hidden z-[100]"
          style={{
            ...menuStyle,
            visibility: menuVisible && isPositioned ? 'visible' : 'hidden',
            opacity: menuVisible && isPositioned ? 1 : 0
          }}
        >
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleHide();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors active:bg-[var(--fill-tertiary)]"
          >
            {hideLabel === 'Unhide' ? (
              <Eye className="w-4 h-4 text-[var(--system-blue)]" />
            ) : (
              <EyeOff className="w-4 h-4 text-[var(--system-blue)]" />
            )}
            <span className="text-[15px]">{hideLabel}</span>
          </button>

          <div className="h-[0.5px] bg-[var(--separator)] mx-4" />

          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors active:bg-[var(--fill-tertiary)]"
          >
            <Trash2 className="w-4 h-4 text-[var(--system-red)]" />
            <span className="text-[15px] text-[var(--system-red)]">Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}
