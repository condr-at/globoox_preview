'use client';

import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface IOSReaderChromeHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailingLeft?: React.ReactNode;
  trailingRight?: React.ReactNode;
  className?: string;
}

export default function IOSReaderChromeHeader({
  title,
  subtitle,
  trailingLeft,
  trailingRight,
  className,
}: IOSReaderChromeHeaderProps) {
  return (
    <div
      className={cn(
        'bg-background/80 backdrop-blur-xl border-b',
        className,
      )}
    >
      <div className="px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <div className="flex h-11 items-center">
          <div className="flex h-full items-center justify-start shrink-0">
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="text-[var(--system-blue)] -ml-2 flex-shrink-0 relative after:absolute after:inset-y-[-10px] after:left-[-10px] after:right-[-4px]"
            >
              <ChevronLeft className="w-6 h-6 text-[var(--system-blue)]" strokeWidth={2.5} />
            </Button>
          </div>

          <div className="min-w-0 flex-1 px-2">
            <div className="flex max-w-full flex-col justify-center text-left">
              <h1 className="max-w-full text-sm font-semibold truncate text-[var(--label-primary)]">{title}</h1>
              {subtitle ? (
                <p className="max-w-full text-[11px] leading-3 text-[var(--label-secondary)] truncate">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex h-full items-center justify-end shrink-0 text-[var(--system-blue)]">
            {trailingLeft}
            {trailingRight}
          </div>
        </div>
      </div>
    </div>
  );
}
