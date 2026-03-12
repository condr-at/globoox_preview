'use client';

import { cn } from '@/lib/utils';

interface IOSIconListItemProps {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  children: React.ReactNode;
  className?: string;
}

export default function IOSIconListItem({
  icon: Icon,
  children,
  className,
}: IOSIconListItemProps) {
  return (
    <li className={cn('flex items-center gap-3 text-sm text-[var(--label-primary)]', className)}>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-grouped)]">
        <Icon className="h-3.5 w-3.5 text-[var(--label-secondary)]" strokeWidth={1.6} />
      </div>
      {children}
    </li>
  );
}
