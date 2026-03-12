'use client';

import { cn } from '@/lib/utils';

interface IOSFlowDialogHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}

export default function IOSFlowDialogHeader({
  title,
  description,
  className,
}: IOSFlowDialogHeaderProps) {
  return (
    <div className={cn('px-6 pt-4 sm:pt-6', className)}>
      <div className="text-center">
        <h2 className="text-[22px] font-semibold leading-tight text-[var(--label-primary)]">
          {title}
        </h2>
        {description ? (
          <div className="mt-2 text-sm leading-relaxed text-[var(--label-secondary)]">
            {description}
          </div>
        ) : null}
      </div>
    </div>
  );
}
