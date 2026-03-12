'use client';

import { cn } from '@/lib/utils';

interface IOSFeaturePromptHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}

export default function IOSFeaturePromptHeader({
  title,
  description,
  className,
}: IOSFeaturePromptHeaderProps) {
  return (
    <div className={cn('text-center', className)}>
      <h2 className="text-[22px] font-semibold leading-tight text-[var(--label-primary)]">
        {title}
      </h2>
      {description ? (
        <div className="mt-2 text-sm leading-relaxed text-[var(--label-secondary)]">
          {description}
        </div>
      ) : null}
    </div>
  );
}
