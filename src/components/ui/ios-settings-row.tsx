'use client';

import { useRef, useState } from 'react';
import { ChevronsUpDown, Check } from 'lucide-react';
import { useAdaptiveDropdown } from '@/components/ui/useAdaptiveDropdown';
import { cn } from '@/lib/utils';

export interface IOSSettingsRowOption {
  id: string;
  label: string;
}

interface IOSSettingsRowProps {
  label: string;
  value: string;
  options: readonly IOSSettingsRowOption[];
  onChange: (id: string) => void;
  className?: string;
}

export default function IOSSettingsRow({
  label,
  value,
  options,
  onChange,
  className,
}: IOSSettingsRowProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const menuHeight = options.length * 44 + 16;
  const { menuStyle, isPositioned } = useAdaptiveDropdown({
    isOpen: open,
    setIsOpen: setOpen,
    triggerRef,
    menuRef,
    menuWidth: 200,
    menuHeight,
  });

  const currentLabel = options.find((o) => o.id === value)?.label ?? value;

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 h-[44px] text-[17px] active:bg-[var(--fill-tertiary)] transition-colors"
      >
        <span>{label}</span>
        <span className="flex items-center gap-1 text-muted-foreground text-[15px]">
          {currentLabel}
          <ChevronsUpDown className="w-[16px] h-[16px]" strokeWidth={1.8} />
        </span>
      </button>

      {open && (
        <div
          ref={menuRef}
          className="fixed py-[8px] w-[200px] bg-[var(--bg-grouped-secondary)] rounded-[12px] shadow-lg border border-[var(--separator)] overflow-hidden z-[100]"
          style={{ ...menuStyle, visibility: isPositioned ? 'visible' : 'hidden' }}
        >
          {options.map((opt, i, arr) => (
            <div key={opt.id}>
              <button
                onClick={() => { onChange(opt.id); setOpen(false); }}
                className="w-full flex items-center justify-between px-[16px] py-[12px] text-left transition-colors active:bg-[var(--fill-tertiary)]"
              >
                <span className="text-[17px]">{opt.label}</span>
                {value === opt.id && <Check className="w-[18px] h-[18px] text-primary" strokeWidth={2.5} />}
              </button>
              {i < arr.length - 1 && <div className="mx-4 h-[0.5px] bg-[var(--separator)]" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
