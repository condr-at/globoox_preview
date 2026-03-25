'use client';

import { cn } from '@/lib/utils';

interface IOSDialogHeaderCenterLargeProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}

export default function IOSDialogHeaderCenterLarge({
  title,
  description,
  className,
}: IOSDialogHeaderCenterLargeProps) {
  return (
    <div className={cn('text-center', className)}>
      <h2 className="text-[22px] font-semibold leading-tight text-foreground">
        {title}
      </h2>
      {description ? (
        <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {description}
        </div>
      ) : null}
    </div>
  );
}
