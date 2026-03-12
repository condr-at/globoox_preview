'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IOSSheetHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onClose: () => void;
  className?: string;
}

export default function IOSSheetHeader({
  title,
  subtitle,
  leading,
  trailing,
  onClose,
  className,
}: IOSSheetHeaderProps) {
  return (
    <div className={cn('p-5', className)}>
      <div className="flex items-start gap-4">
        {leading && <div className="shrink-0">{leading}</div>}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-[18px] font-semibold tracking-[-0.02em] text-[var(--label-primary)]">
                {title}
              </h3>
              {subtitle && (
                <div className="mt-1 text-[17px] leading-[22px] text-[var(--label-secondary)]">
                  {subtitle}
                </div>
              )}
            </div>
            {trailing && <div className="mt-1 shrink-0">{trailing}</div>}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="relative z-30 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/8 text-[var(--label-secondary)] transition-colors active:bg-black/12 dark:bg-white/10 dark:active:bg-white/14 before:absolute before:bottom-[-8px] before:left-[-8px] before:right-[-20px] before:top-[-20px] before:content-['']"
          aria-label="Close"
        >
          <X className="h-[18px] w-[18px]" strokeWidth={2.1} />
        </button>
      </div>
    </div>
  );
}
