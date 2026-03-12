'use client';

import { X } from 'lucide-react';
import IOSBottomDrawer from '@/components/ui/ios-bottom-drawer';
import IOSDialogHeaderCenterLarge from '@/components/ui/ios-dialog-header-center-large';

interface IOSFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export default function IOSFlowDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: IOSFlowDialogProps) {
  return (
    <IOSBottomDrawer
      open={open}
      onOpenChange={onOpenChange}
      enableDragDismiss
      dragRegion={(
        <div className="relative">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-5 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/8 text-[var(--label-secondary)] transition-colors active:bg-black/12 dark:bg-white/10 dark:active:bg-white/14"
            aria-label="Close"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={2.1} />
          </button>
          <div className="px-6 pt-4 sm:pt-6">
            <IOSDialogHeaderCenterLarge
              title={title}
              description={description}
            />
          </div>
        </div>
      )}
      className={className ?? 'sm:max-w-sm sm:pb-6'}
    >
      <div className="px-6 pb-1 pt-5">
        {children}
      </div>
    </IOSBottomDrawer>
  );
}
